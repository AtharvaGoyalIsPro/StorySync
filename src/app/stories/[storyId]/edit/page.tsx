
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { db } from '@/lib/firebase';
import { doc, getDoc, onSnapshot, updateDoc, collection, addDoc, serverTimestamp, query, orderBy, writeBatch, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
// import { Textarea } from '@/components/ui/textarea'; // Removed Textarea
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Users, ChevronLeft, Book, Plus, Share2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import ShareDialog from '@/components/story/ShareDialog'; 
import TiptapEditor from '@/components/story/TiptapEditor'; // Import TiptapEditor
import AIToolsDropdown from '@/components/story/AIToolsDropdown'; // Import AI Tools

interface StoryData {
  id?: string; 
  title: string;
  authorId: string;
  authorName: string;
  isPublic: boolean;
  collaborators: string[];
}

interface ChapterData {
    id: string;
    title: string;
    content: string; // This will now store HTML content from Tiptap
    lastUpdatedBy?: string; 
    lastUpdatedByName?: string; 
    updatedAt?: Timestamp; 
    createdAt?: Timestamp; 
}

// Debounce function
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: NodeJS.Timeout | null = null;

  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };

  return debounced as (...args: Parameters<F>) => ReturnType<F>;
}


export default function EditStoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const storyId = params.storyId as string;
  const { toast } = useToast();

  const [storyData, setStoryData] = useState<StoryData | null>(null);
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [currentContent, setCurrentContent] = useState<string>(''); // Stores HTML content
  const [newChapterTitle, setNewChapterTitle] = useState('');

  const [loadingStory, setLoadingStory] = useState(true);
  const [loadingChapterContent, setLoadingChapterContent] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingChapter, setIsCreatingChapter] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const canEdit = storyData && user && storyData.collaborators?.includes(user.uid);
  const isOwner = storyData && user && storyData.authorId === user.uid;
  
  const lastSavedContentRef = useRef<string>(''); // Ref to store last successfully saved content
  const editorRef = useRef<any>(null); // Ref to hold Tiptap editor instance for AI tools

  const getCurrentChapterContentForAI = useCallback(() => {
    // This function will be passed to AIToolsDropdown
    // It should return the current, potentially unsaved, content of the selected chapter
    // If no chapter is selected, or editor isn't ready, return empty or full story context
    if (editorRef.current && selectedChapterId) {
        return editorRef.current.getHTML(); // Or pass `currentContent`
    }
    // Fallback: return all chapters' content concatenated, or a specific message
    // For now, let's keep it simple and rely on the selected chapter's content
    // or the content of the TiptapEditor directly if available.
    return currentContent; // Or editorRef.current?.getHTML() if editorRef is correctly set up in TiptapEditor
  }, [selectedChapterId, currentContent]);


  useEffect(() => {
    if (!storyId) return;
    setLoadingStory(true);
    const storyDocRef = doc(db, 'stories', storyId);

    const unsubscribe = onSnapshot(storyDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setStoryData({ id: docSnap.id, ...docSnap.data() } as StoryData); 
      } else {
        toast({ title: "Error", description: "Story not found.", variant: "destructive" });
        router.push('/dashboard');
      }
      setLoadingStory(false);
    }, (error) => {
         console.error("Error fetching story:", error);
         toast({ title: "Error", description: "Failed to load story data.", variant: "destructive" });
         setLoadingStory(false);
         router.push('/dashboard');
    });

    return () => unsubscribe();
  }, [storyId, router, toast]);


  useEffect(() => {
      if (!storyId) return;

      const chaptersColRef = collection(db, 'stories', storyId, 'chapters');
      const q = query(chaptersColRef, orderBy("createdAt", "asc")); 

      const unsubscribe = onSnapshot(q, (snapshot) => {
          const fetchedChapters = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChapterData));
          setChapters(fetchedChapters);
          if (!selectedChapterId && fetchedChapters.length > 0) {
              setSelectedChapterId(fetchedChapters[0].id);
          } else if (fetchedChapters.length === 0) {
              setSelectedChapterId(null); 
              setCurrentContent(''); 
          }
      }, (error) => {
          console.error("Error fetching chapters:", error);
          toast({ title: "Error", description: "Failed to load chapters.", variant: "destructive" });
      });

      return () => unsubscribe();
  }, [storyId, toast, selectedChapterId]); 


  useEffect(() => {
    if (!storyId || !selectedChapterId) {
        setCurrentContent(''); 
        lastSavedContentRef.current = '';
        return;
    }

    setLoadingChapterContent(true);
    const chapterDocRef = doc(db, 'stories', storyId, 'chapters', selectedChapterId);

    const unsubscribe = onSnapshot(chapterDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data() as ChapterData;
            const remoteContent = data.content || '';
            // Only update local content if it's different from the last saved remote content
            // and no unsaved local changes or if the incoming content is different from current editor content
             if (remoteContent !== lastSavedContentRef.current && (!hasUnsavedChanges || remoteContent !== currentContent)) {
                 setCurrentContent(remoteContent);
                 lastSavedContentRef.current = remoteContent; // Update ref to new remote content
                 setHasUnsavedChanges(false); // Remote update overrides local unsaved status
             }
        } else {
            console.warn("Selected chapter not found:", selectedChapterId);
            setCurrentContent(''); 
            lastSavedContentRef.current = '';
        }
        setLoadingChapterContent(false);
    }, (error) => {
        console.error("Error fetching chapter content:", error);
        toast({ title: "Error", description: "Failed to load chapter content.", variant: "destructive" });
        setLoadingChapterContent(false);
    });

    return () => unsubscribe();

  }, [storyId, selectedChapterId, toast]); // Removed hasUnsavedChanges and currentContent from deps to avoid loops

  const manualSaveContent = useCallback(async (contentToSave: string) => {
    if (!storyId || !selectedChapterId || !user || !canEdit || isSaving) return;

    setIsSaving(true);
    const chapterDocRef = doc(db, 'stories', storyId, 'chapters', selectedChapterId);
    const storyDocRef = doc(db, 'stories', storyId);

    try {
        const batch = writeBatch(db);
        batch.update(chapterDocRef, {
            content: contentToSave,
            lastUpdatedBy: user.uid,
            lastUpdatedByName: user.displayName || user.email?.split('@')[0] || "Anonymous",
            updatedAt: serverTimestamp(),
        });
        batch.update(storyDocRef, { lastUpdatedAt: serverTimestamp() });
        await batch.commit();
        
        lastSavedContentRef.current = contentToSave; // Update ref on successful save
        setHasUnsavedChanges(false);
      // toast({ title: "Saved", description: "Chapter content saved." }); 
    } catch (error: any) {
      console.error("Error saving chapter:", error);
      toast({ title: "Save Failed", description: error.message || "Could not save changes.", variant: "destructive" });
      // Do not reset hasUnsavedChanges to true here, as the content that failed to save is still the current content.
    } finally {
      setIsSaving(false);
    }
  }, [storyId, selectedChapterId, user, toast, canEdit, isSaving]);


  // Debounced save function using useCallback and useRef for stability
  const debouncedSave = useCallback(
    debounce((newContent: string) => {
      manualSaveContent(newContent);
    }, 2000), // 2-second debounce
    [manualSaveContent] // manualSaveContent is already memoized with its dependencies
  );

  const handleContentChange = (newContent: string) => {
      if (!canEdit || newContent === currentContent) return; 
      setCurrentContent(newContent);
      setHasUnsavedChanges(true);
      debouncedSave(newContent);
  };

  const handleAddChapter = async () => {
    if (!storyId || !newChapterTitle.trim() || !user || !canEdit) return;

    setIsCreatingChapter(true);
    const chaptersColRef = collection(db, 'stories', storyId, 'chapters');
    const storyDocRef = doc(db, 'stories', storyId);

    try {
        const batch = writeBatch(db);
        const newChapterRef = doc(chaptersColRef); 

        batch.set(newChapterRef, {
            title: newChapterTitle.trim(),
            content: '', 
            authorId: user.uid, 
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastUpdatedBy: user.uid,
            lastUpdatedByName: user.displayName || user.email?.split('@')[0] || "Anonymous",
        });

        batch.update(storyDocRef, { 
            lastUpdatedAt: serverTimestamp(),
        });

        await batch.commit();

        setNewChapterTitle(''); 
        setSelectedChapterId(newChapterRef.id); 
        setCurrentContent(''); // Ensure new chapter starts with empty Tiptap content
        lastSavedContentRef.current = ''; // Reset ref for new chapter
        setHasUnsavedChanges(false); 
        toast({ title: "Chapter Added", description: `"${newChapterTitle.trim()}" created.` });
    } catch (error: any) {
        console.error("Error adding chapter:", error);
        toast({ title: "Failed to Add Chapter", description: error.message, variant: "destructive" });
    } finally {
        setIsCreatingChapter(false);
    }
  };

  useEffect(() => {
      if (!authLoading && !user && !storyData?.isPublic) {
          router.push(`/login?redirect=/stories/${storyId}/edit`);
      } else if (!authLoading && user && storyData && !storyData.isPublic && !canEdit) {
          toast({ title: "Access Denied", description: "You do not have permission to view this private story.", variant: "destructive" });
          router.push('/dashboard');
      }
  }, [user, authLoading, storyData, canEdit, router, storyId, toast]);


  if (authLoading || loadingStory) {
    return (
         <div className="flex h-[calc(100vh-8rem)] container mx-auto px-4 py-8 gap-4">
            <Card className="w-1/4 lg:w-1/5 flex flex-col">
                 <CardHeader>
                     <Skeleton className="h-6 w-3/4 mb-2"/>
                     <Skeleton className="h-4 w-1/2"/>
                 </CardHeader>
                 <CardContent className="flex-1 space-y-2">
                     {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full"/>)}
                 </CardContent>
                 <div className="p-4 border-t space-y-2">
                     <Skeleton className="h-8 w-full"/>
                     <Skeleton className="h-8 w-full"/>
                 </div>
            </Card>
            <Card className="flex-1 flex flex-col">
                <CardHeader className="flex flex-row justify-between items-center">
                     <Skeleton className="h-8 w-1/3"/>
                     <Skeleton className="h-8 w-20"/>
                </CardHeader>
                 <CardContent className="flex-1">
                    <Skeleton className="h-full w-full"/>
                </CardContent>
            </Card>
        </div>
    );
  }

  if (!storyData) {
      return <div className="container mx-auto px-4 py-8 text-center">Story not found or could not be loaded.</div>;
  }

  const isReadOnly = !canEdit;

  const selectedChapterForDisplay = chapters.find(c => c.id === selectedChapterId);


  return (
    <div className="flex h-[calc(100vh-8rem)] container mx-auto px-4 py-8 gap-4">
      <Card className="w-1/4 lg:w-1/5 flex flex-col">
        <CardHeader>
          <CardTitle className="text-xl truncate">{storyData.title}</CardTitle>
          <CardDescription className="flex items-center gap-1 text-xs">
             By {storyData.authorName} {isOwner ? "(You)" : ""}
          </CardDescription>
           {canEdit && (
            <Button variant="outline" size="sm" className="mt-2 w-full justify-start" onClick={() => setIsShareDialogOpen(true)}>
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
           )}
           <Button variant="ghost" size="sm" className="mt-1 w-full justify-start" onClick={() => router.push('/dashboard')}>
             <ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard
           </Button>
        </CardHeader>

         <h3 className="px-6 pb-2 text-sm font-semibold text-muted-foreground flex items-center gap-2"><Book className="h-4 w-4"/> Chapters</h3>
         <ScrollArea className="flex-1 px-4">
             {chapters.length === 0 && !isCreatingChapter && (
                 <p className="text-sm text-muted-foreground px-2">No chapters yet.</p>
             )}
             <ul className="space-y-1">
                {chapters.map((chapter) => (
                    <li key={chapter.id}>
                         <Button
                           variant={selectedChapterId === chapter.id ? "secondary" : "ghost"}
                           className={`w-full justify-start text-left h-auto py-2 ${selectedChapterId === chapter.id ? 'font-semibold': ''}`}
                           onClick={() => {
                               if (hasUnsavedChanges && canEdit && currentContent !== lastSavedContentRef.current) {
                                   manualSaveContent(currentContent);
                               }
                               setSelectedChapterId(chapter.id)
                               // Content loading for the new chapter is handled by useEffect
                           }}
                         >
                           {chapter.title}
                         </Button>
                    </li>
                ))}
             </ul>
         </ScrollArea>
          {canEdit && ( 
            <div className="p-4 border-t space-y-2">
                 <Input
                     type="text"
                     placeholder="New Chapter Title"
                     value={newChapterTitle}
                     onChange={(e) => setNewChapterTitle(e.target.value)}
                     disabled={isCreatingChapter}
                     className="h-8"
                 />
                 <Button
                     onClick={handleAddChapter}
                     disabled={isCreatingChapter || !newChapterTitle.trim()}
                     className="w-full"
                     size="sm"
                 >
                     {isCreatingChapter ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Plus className="mr-2 h-4 w-4"/>}
                     Add Chapter
                 </Button>
            </div>
          )}
      </Card>

       <Card className="flex-1 flex flex-col overflow-hidden"> {/* Added overflow-hidden */}
         {selectedChapterForDisplay ? (
            <>
             <CardHeader className="flex flex-row justify-between items-center border-b">
                 <CardTitle className="text-xl">{selectedChapterForDisplay.title}</CardTitle>
                 <div className="flex items-center gap-2">
                     {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" title="Saving..." />}
                      {hasUnsavedChanges && !isSaving && canEdit && <span className="text-xs text-muted-foreground italic">Unsaved changes</span>}
                      {isReadOnly && <span className="text-xs text-muted-foreground italic">Read-only</span>}
                      {canEdit && (
                         <AIToolsDropdown
                            editor={editorRef.current} // Pass the Tiptap editor instance
                            storyId={storyId}
                            currentChapterContentForContext={getCurrentChapterContentForAI}
                            onApplySuggestion={(suggestion) => {
                                if (editorRef.current) {
                                    const currentEditor = editorRef.current;
                                    if (currentEditor.state.selection.empty) {
                                        currentEditor.chain().focus().insertContent(suggestion).run();
                                    } else {
                                        currentEditor.chain().focus().deleteSelection().insertContent(suggestion).run();
                                    }
                                    // Manually trigger content change and save
                                    handleContentChange(currentEditor.getHTML());
                                }
                            }}
                         />
                      )}
                     {canEdit && (
                         <Button onClick={() => manualSaveContent(currentContent)} disabled={isSaving || !hasUnsavedChanges} size="sm">
                             <Save className="mr-2 h-4 w-4" /> Save Now
                         </Button>
                     )}
                 </div>
             </CardHeader>
             <CardContent className="flex-1 p-0 flex flex-col min-h-0"> {/* Changed to flex flex-col and min-h-0 */}
                {loadingChapterContent ? (
                     <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                     </div>
                ) : (
                    <TiptapEditor
                        content={currentContent}
                        onChange={handleContentChange}
                        editable={!isReadOnly && !isSaving}
                        placeholder={canEdit ? "Start writing your chapter..." : "Viewing content."}
                        onEditorChange={(editorInstance) => { // Capture editor instance
                            editorRef.current = editorInstance;
                        }}
                    />
                )}
             </CardContent>
              {selectedChapterForDisplay.updatedAt && (
                 <div className="p-2 border-t text-xs text-muted-foreground text-right bg-muted/30 rounded-b-lg">
                     Last updated by {selectedChapterForDisplay.lastUpdatedByName || 'Unknown'}
                      {selectedChapterForDisplay.updatedAt?.toDate && ` on ${selectedChapterForDisplay.updatedAt.toDate().toLocaleDateString()} ${selectedChapterForDisplay.updatedAt.toDate().toLocaleTimeString()}`}
                 </div>
              )}
              </>
          ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                 <Book className="h-12 w-12 text-muted-foreground mb-4"/>
                 <p className="text-muted-foreground">
                     {chapters.length > 0 ? "Select a chapter to start" : (canEdit ? "Create your first chapter!" : "This story has no chapters yet.")}
                 </p>
              </div>
          )}
       </Card>

        {storyData && storyData.id && ( 
            <ShareDialog
                isOpen={isShareDialogOpen}
                onOpenChange={setIsShareDialogOpen}
                storyId={storyData.id}
                storyTitle={storyData.title}
                currentCollaborators={storyData.collaborators}
                isPublic={storyData.isPublic}
                authorId={storyData.authorId}
                isOwner={isOwner} 
            />
        )}
    </div>
  );
}
