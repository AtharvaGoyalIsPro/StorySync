"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc, addDoc, writeBatch, serverTimestamp, collectionGroup } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Copy, BookOpen, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';

interface PublicStory {
  id: string;
  title: string;
  authorName: string;
  authorId: string;
  lastUpdatedAt: any; // Firestore Timestamp
  // Add snippet or other relevant fields later
}

interface ChapterData {
    id: string;
    title: string;
    content: string;
    // Add other chapter fields if needed
}

export default function ExplorePage() {
  const { user, loading: authLoading } = useAuth();
  const [publicStories, setPublicStories] = useState<PublicStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [forkingStoryId, setForkingStoryId] = useState<string | null>(null); // Track which story is being forked
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchPublicStories = async () => {
      setLoading(true);
      try {
        const storiesCollection = collection(db, 'stories');
        const q = query(
            storiesCollection,
            where('isPublic', '==', true),
            orderBy('lastUpdatedAt', 'desc'), // Show recently updated stories first
            limit(20) // Limit the number of stories fetched initially
        );

        const querySnapshot = await getDocs(q);
        const stories = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
           // Convert timestamp immediately if needed, or format later
           lastUpdatedAt: doc.data().lastUpdatedAt?.toDate ? doc.data().lastUpdatedAt.toDate() : new Date()
        } as PublicStory));
        setPublicStories(stories);

      } catch (error: any) {
        console.error("Error fetching public stories:", error);
        toast({
          title: "Error Loading Stories",
          description: error.message || "Could not fetch public stories. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPublicStories();
  }, [toast]);

  const handleForkStory = async (storyToFork: PublicStory) => {
     if (!user) {
       toast({ title: "Login Required", description: "Please log in to fork a story.", variant: "destructive" });
       router.push('/login?redirect=/explore');
       return;
     }
     if (forkingStoryId) return; // Prevent multiple forks at once

     setForkingStoryId(storyToFork.id);

     try {
       // 1. Create the new story document (metadata)
       const newStoryRef = await addDoc(collection(db, 'stories'), {
         title: `Fork of ${storyToFork.title}`,
         authorId: user.uid,
         authorName: user.displayName || user.email?.split('@')[0] || "Anonymous",
         createdAt: serverTimestamp(),
         lastUpdatedAt: serverTimestamp(),
         isPublic: false, // Forked stories start as private
         collaborators: [user.uid],
         forkedFrom: storyToFork.id, // Optional: track original story
       });

       // 2. Get chapters from the original story
       const chaptersSnapshot = await getDocs(
         query(collection(db, 'stories', storyToFork.id, 'chapters'), orderBy('createdAt', 'asc'))
       );

       // 3. Batch write chapters to the new story
       if (!chaptersSnapshot.empty) {
         const batch = writeBatch(db);
         chaptersSnapshot.docs.forEach((chapterDoc) => {
           const chapterData = chapterDoc.data();
           const newChapterRef = doc(collection(db, 'stories', newStoryRef.id, 'chapters'));
           batch.set(newChapterRef, {
             ...chapterData,
             // Reset timestamps and author if needed, or keep original? Let's reset.
             createdAt: serverTimestamp(),
             updatedAt: serverTimestamp(),
             lastUpdatedBy: user.uid,
             lastUpdatedByName: user.displayName || user.email?.split('@')[0] || "Anonymous",
           });
         });
         await batch.commit();
       }

       toast({ title: "Story Forked", description: `Successfully forked "${storyToFork.title}".` });
       router.push(`/stories/${newStoryRef.id}/edit`); // Navigate to the new story's edit page

     } catch (error: any) {
       console.error("Error forking story:", error);
       toast({
         title: "Forking Failed",
         description: error.message || "Could not fork the story. Please try again.",
         variant: "destructive",
       });
     } finally {
       setForkingStoryId(null);
     }
  };


  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Explore Public Stories</h1>
       <p className="text-muted-foreground mb-6">Discover stories shared by others. You can view them or create your own version by forking.</p>

      {loading || authLoading ? ( // Show skeleton if fetching stories OR auth state is loading
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
               <div className="p-4 border-t flex justify-end gap-2 bg-muted/50 rounded-b-lg">
                  <Skeleton className="h-9 w-9 rounded" />
                  <Skeleton className="h-9 w-9 rounded" />
               </div>
            </Card>
          ))}
        </div>
      ) : publicStories.length === 0 ? (
        <Card className="text-center py-12 border-dashed">
           <CardHeader>
              <CardTitle>No Public Stories Found</CardTitle>
              <CardDescription>It looks a bit empty here. Why not create your own public story?</CardDescription>
           </CardHeader>
           <CardContent>
                <Link href="/stories/new" passHref>
                    <Button variant="outline">Create a Story</Button>
                </Link>
           </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {publicStories.map((story) => (
            <Card key={story.id} className="flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader>
                <CardTitle>{story.title}</CardTitle>
                <CardDescription>
                  By {story.authorName} | Updated: {new Date(story.lastUpdatedAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {/* Placeholder for story snippet - fetch first chapter content preview later */}
                  Dive into this public story created by {story.authorName}. Explore the world they've built...
                </p>
              </CardContent>
              <div className="p-4 border-t flex justify-end gap-2 bg-muted/50 rounded-b-lg">
                 <Link href={`/stories/${story.id}/edit`} passHref>
                   {/* Using 'edit' path even for viewing, simplifies routing. Access control happens inside the page */}
                   <Button variant="outline" size="sm" title="View Story">
                     <BookOpen className="mr-1 h-4 w-4" /> View
                   </Button>
                 </Link>
                 <Button
                    variant="outline"
                    size="sm"
                    title="Fork Story"
                    onClick={() => handleForkStory(story)}
                    disabled={forkingStoryId === story.id || !!forkingStoryId || story.authorId === user?.uid} // Disable if forking this/another story, or if it's user's own story
                 >
                    {forkingStoryId === story.id ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                        <Copy className="mr-1 h-4 w-4" />
                    )}
                   Fork
                 </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {/* Add pagination or infinite scroll later if needed */}
    </div>
  );
}
