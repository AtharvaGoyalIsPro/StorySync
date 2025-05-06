'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, serverTimestamp, collection, query, where, getDocs, limit } from 'firebase/firestore'; // Added limit import
import { Loader2, Copy, Check, X, UserPlus, Trash2, Crown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ShareDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: string;
  storyTitle: string;
  currentCollaborators: string[]; // Array of UIDs
  isPublic: boolean;
  authorId: string;
  isOwner: boolean; // Is the current user the owner?
}

interface CollaboratorInfo {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
}

// Simple email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ShareDialog({
  isOpen,
  onOpenChange,
  storyId,
  storyTitle,
  currentCollaborators = [], // Default to empty array
  isPublic,
  authorId,
  isOwner,
}: ShareDialogProps) {
  const { toast } = useToast();
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState('');
  const [collaboratorsInfo, setCollaboratorsInfo] = useState<CollaboratorInfo[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null); // Track UID being removed
  const [isUpdatingPublic, setIsUpdatingPublic] = useState(false);
  const [publicStatus, setPublicStatus] = useState(isPublic);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isLoadingCollaborators, setIsLoadingCollaborators] = useState(false);
  const [storyLink, setStoryLink] = useState(''); // State for story link

  // Set story link only on the client-side
   useEffect(() => {
      if (typeof window !== 'undefined') {
          setStoryLink(`${window.location.origin}/stories/${storyId}/edit`);
      }
   }, [storyId]);


  // Fetch collaborator details when dialog opens or collaborators change
  useEffect(() => {
    if (!isOpen || !currentCollaborators.length) {
        setCollaboratorsInfo([]); // Clear if dialog closes or no collaborators
        return;
    }

    setIsLoadingCollaborators(true);
    const fetchCollaboratorDetails = async () => {
        // Assuming 'users' collection stores user details by UID. Security rules MUST allow reading this.
        const userDocsPromises = currentCollaborators.map(uid => getDoc(doc(db, 'users', uid)));
        try {
            const userDocsSnapshots = await Promise.all(userDocsPromises);
            const infos = userDocsSnapshots
                .map(docSnap => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        return {
                            uid: docSnap.id,
                            displayName: data.displayName || data.email?.split('@')[0] || 'Unknown',
                            email: data.email || 'No email',
                            photoURL: data.photoURL || null,
                        };
                    }
                    console.warn(`User document not found for UID: ${docSnap.id}`); // Log if user doc missing
                    return null; // Handle cases where user doc might not exist
                })
                .filter((info): info is CollaboratorInfo => info !== null) // Filter out nulls
                 .sort((a, b) => { // Sort with Author first
                    if (a.uid === authorId) return -1;
                    if (b.uid === authorId) return 1;
                    return a.displayName.localeCompare(b.displayName);
                 });

            setCollaboratorsInfo(infos);
        } catch (error) {
            console.error("Error fetching collaborator details:", error);
            toast({ title: "Error", description: "Could not load collaborator details.", variant: "destructive" });
        } finally {
            setIsLoadingCollaborators(false);
        }
    };

    fetchCollaboratorDetails();
  }, [isOpen, currentCollaborators, toast, authorId]);

  // Update public status state when prop changes
  useEffect(() => {
    setPublicStatus(isPublic);
  }, [isPublic]);


  const handleAddCollaborator = async () => {
    if (!newCollaboratorEmail.trim() || !emailRegex.test(newCollaboratorEmail.trim())) {
      toast({ title: 'Invalid Email', description: 'Please enter a valid email address.', variant: 'destructive' });
      return;
    }
     if (!isOwner) {
          toast({ title: "Permission Denied", description: "Only the story owner can add collaborators.", variant: "destructive" });
          return;
     }

    setIsAdding(true);
    const emailToAdd = newCollaboratorEmail.trim().toLowerCase(); // Normalize email

    try {
      // 1. Find user UID by email (using the 'users' collection and email field)
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', emailToAdd), limit(1)); // Use imported limit
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({ title: 'User Not Found', description: `No user registered with email ${emailToAdd}. Please ensure they have signed up.`, variant: 'destructive' });
        setIsAdding(false);
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userIdToAdd = userDoc.id;

      // Ensure currentCollaborators is initialized
      const collaborators = currentCollaborators || [];

      if (collaborators.includes(userIdToAdd)) {
          toast({ title: 'Already Collaborator', description: `${emailToAdd} is already collaborating on this story.`, variant: 'default' });
          setNewCollaboratorEmail('');
          setIsAdding(false);
          return;
      }

      // 2. Update the story document
      const storyDocRef = doc(db, 'stories', storyId);
      await updateDoc(storyDocRef, {
        collaborators: arrayUnion(userIdToAdd),
        lastUpdatedAt: serverTimestamp(), // Update timestamp
      });

      toast({ title: 'Collaborator Added', description: `${userDoc.data().displayName || emailToAdd} can now edit this story.` });
      setNewCollaboratorEmail(''); // Clear input
      // The component relies on the parent passing updated `currentCollaborators` prop.
      // Consider adding a callback prop like `onCollaboratorsUpdate` if needed for faster UI feedback.

    } catch (error: any) {
      console.error('Error adding collaborator:', error);
      toast({ title: 'Error Adding Collaborator', description: error.message || 'Could not add collaborator. Check Firestore rules and user existence.', variant: 'destructive' });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveCollaborator = async (uidToRemove: string) => {
    if (!isOwner) {
          toast({ title: "Permission Denied", description: "Only the story owner can remove collaborators.", variant: "destructive" });
          return;
     }
     if (uidToRemove === authorId) {
         toast({ title: "Cannot Remove Owner", description: "The story owner cannot be removed.", variant: "destructive" });
         return;
     }

    setIsRemoving(uidToRemove);
    try {
      const storyDocRef = doc(db, 'stories', storyId);
      await updateDoc(storyDocRef, {
        collaborators: arrayRemove(uidToRemove),
        lastUpdatedAt: serverTimestamp(),
      });
      const removedUser = collaboratorsInfo.find(c => c.uid === uidToRemove);
      toast({ title: 'Collaborator Removed', description: `Access for ${removedUser?.displayName || 'user'} has been revoked.` });
       // Component relies on parent passing updated `currentCollaborators`.
    } catch (error: any) {
      console.error('Error removing collaborator:', error);
      toast({ title: 'Error Removing Collaborator', description: error.message || 'Could not remove collaborator.', variant: 'destructive' });
    } finally {
      setIsRemoving(null);
    }
  };

  const handlePublicStatusChange = async (checked: boolean) => {
     if (!isOwner) {
          toast({ title: "Permission Denied", description: "Only the story owner can change the public status.", variant: "destructive" });
          return; // Don't even update the local state
     }
    setIsUpdatingPublic(true);
    setPublicStatus(checked); // Optimistic UI update
    try {
      const storyDocRef = doc(db, 'stories', storyId);
      await updateDoc(storyDocRef, {
        isPublic: checked,
        lastUpdatedAt: serverTimestamp(),
      });
      toast({ title: 'Visibility Updated', description: `Story is now ${checked ? 'public' : 'private'}.` });
    } catch (error: any) {
      console.error('Error updating public status:', error);
      setPublicStatus(!checked); // Revert optimistic update on error
      toast({ title: 'Error Updating Status', description: error.message || 'Could not update visibility.', variant: 'destructive' });
    } finally {
      setIsUpdatingPublic(false);
    }
  };

  const handleCopyLink = () => {
    if (!storyLink) return; // Don't copy if link isn't ready
    navigator.clipboard.writeText(storyLink)
      .then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000); // Reset after 2 seconds
        toast({ title: "Link Copied", description: "Story link copied to clipboard." });
      })
      .catch(err => {
        console.error('Failed to copy link: ', err);
        toast({ title: "Copy Failed", description: "Could not copy link to clipboard.", variant: "destructive" });
      });
  };

  // Helper to get initials from name or email
   const getInitials = (name: string | null | undefined, email?: string | null) => {
      if (name) {
        const names = name.trim().split(' ');
        if (names.length === 0 || names[0] === "") return '?';
        if (names.length === 1) return names[0][0]?.toUpperCase() ?? '?';
        return (names[0][0]?.toUpperCase() ?? '') + (names[names.length - 1][0]?.toUpperCase() ?? '');
      }
      if (email) {
        return email[0]?.toUpperCase() ?? '?';
      }
      return "?";
   };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Share "{storyTitle}"</DialogTitle>
          <DialogDescription>
            Manage who can access and edit this story.
            {isOwner ? "" : " You are viewing permissions."}
          </DialogDescription>
        </DialogHeader>

         {/* Add People */}
         {isOwner && (
             <div className="flex items-center space-x-2 py-4">
               <div className="grid flex-1 gap-2">
                 <Label htmlFor="new-collaborator-email" className="sr-only">
                   Email
                 </Label>
                 <Input
                   id="new-collaborator-email"
                   type="email"
                   placeholder="Enter email to invite..."
                   value={newCollaboratorEmail}
                   onChange={(e) => setNewCollaboratorEmail(e.target.value)}
                   disabled={isAdding}
                 />
               </div>
               <Button type="button" size="sm" className="px-3" onClick={handleAddCollaborator} disabled={isAdding || !newCollaboratorEmail.trim()}>
                 {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                 <span className="ml-2 hidden sm:inline">Add</span>
               </Button>
             </div>
         )}


        {/* Collaborator List */}
        <div className="space-y-3 py-2 max-h-[250px] overflow-y-auto pr-2">
            <Label>People with access</Label>
             {isLoadingCollaborators ? (
                <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
             ) : collaboratorsInfo.length === 0 ? (
                 <p className="text-sm text-muted-foreground italic">Only the owner has access.</p> // Changed message slightly
             ) : (
                <TooltipProvider delayDuration={100}>
                    {collaboratorsInfo.map(collab => (
                    <div key={collab.uid} className="flex items-center justify-between space-x-4">
                        <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={collab.photoURL ?? undefined} />
                            <AvatarFallback>{getInitials(collab.displayName, collab.email)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col text-sm">
                            <span className="font-medium flex items-center">
                                {collab.displayName}
                                {collab.uid === authorId && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Crown className="ml-1.5 h-3.5 w-3.5 text-yellow-500" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Story Owner</p>
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                             </span>
                            <span className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-[250px]">{collab.email}</span>
                        </div>
                        </div>
                        {isOwner && collab.uid !== authorId && ( // Only owner can remove, and cannot remove self
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0" // Added flex-shrink-0
                            onClick={() => handleRemoveCollaborator(collab.uid)}
                            disabled={isRemoving === collab.uid}
                            aria-label={`Remove ${collab.displayName}`} // Added aria-label
                        >
                            {isRemoving === collab.uid ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Trash2 className="h-4 w-4" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Remove access</p>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                        </Button>
                        )}
                         {collab.uid === authorId && (
                            <span className="text-xs text-muted-foreground mr-2 flex-shrink-0">Owner</span> // Added flex-shrink-0
                         )}
                    </div>
                    ))}
                </TooltipProvider>
             )}
        </div>

        {/* Public Access Toggle and Link Sharing */}
        <div className="space-y-3 border-t pt-4 mt-2">
          <div className="flex items-center justify-between">
             <div>
                <Label htmlFor="public-access" className="font-medium">
                    Public Access
                </Label>
                 <p className="text-xs text-muted-foreground">
                     {publicStatus
                        ? "Anyone with the link can view this story."
                        : "Only collaborators can access this story."}
                 </p>
            </div>
             <Switch
               id="public-access"
               checked={publicStatus}
               onCheckedChange={handlePublicStatusChange}
               disabled={isUpdatingPublic || !isOwner} // Disable if updating or not owner
               aria-label="Toggle public access"
             />
          </div>

           <div className="flex items-center space-x-2">
             <Input id="link" value={storyLink} readOnly className="h-8 bg-muted text-muted-foreground text-xs flex-1" />
             <Button type="submit" size="sm" className="px-3 h-8" onClick={handleCopyLink} disabled={!storyLink}>
               <span className="sr-only">Copy</span>
               {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
             </Button>
           </div>
        </div>

        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Done
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
