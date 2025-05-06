
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";

export default function NewStoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);

   useEffect(() => {
    // Redirect if user is not logged in after auth check is complete
    if (!authLoading && !user) {
      router.push('/login?redirect=/stories/new');
    }
  }, [user, authLoading, router]);

  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return; // Ensure user is logged in and title is not empty

    setLoading(true);
    try {
      const storiesCollection = collection(db, 'stories');
      const docRef = await addDoc(storiesCollection, {
        title: title.trim(),
        authorId: user.uid,
        authorName: user.displayName || user.email?.split('@')[0] || "Anonymous", // Store author name
        createdAt: serverTimestamp(),
        lastUpdatedAt: serverTimestamp(),
        isPublic: isPublic,
        collaborators: [user.uid], // Start with the creator as a collaborator
        // chapters: [], // Chapters could be a subcollection
      });

      toast({ title: "Story Created", description: `"${title.trim()}" has been successfully created.` });
      // Redirect to the edit page of the newly created story
      router.push(`/stories/${docRef.id}/edit`);

    } catch (error: any) {
      console.error("Error creating story:", error);
      toast({
        title: "Creation Failed",
        description: error.message || "Could not create the story. Please try again.",
        variant: "destructive",
      });
       setLoading(false); // Only set loading false on error
    }
    // No setLoading(false) on success because we navigate away
  };

   if (authLoading || !user) {
     // Show loading skeleton while auth state is resolving or if user is not logged in yet (before redirect)
     return (
       <div className="container mx-auto px-4 py-8 max-w-2xl">
           <Card>
             <CardHeader>
               <Skeleton className="h-8 w-48 mb-2" />
               <Skeleton className="h-4 w-full max-w-xs" />
             </CardHeader>
             <CardContent className="space-y-6">
                <div className="space-y-2">
                   <Skeleton className="h-4 w-20" />
                   <Skeleton className="h-10 w-full" />
                </div>
                <div className="flex items-center space-x-2">
                   <Skeleton className="h-6 w-10 rounded-full" />
                   <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-10 w-32" />
             </CardContent>
           </Card>
       </div>
     );
   }


  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">Start a New Story</CardTitle>
          <CardDescription>Give your new creation a title and decide if it should be public.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateStory} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Story Title</Label>
              <Input
                id="title"
                type="text"
                placeholder="The Adventure Begins..."
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
                maxLength={100} // Add a reasonable max length
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isPublic"
                checked={isPublic}
                onCheckedChange={setIsPublic}
                disabled={loading}
              />
              <Label htmlFor="isPublic" className="cursor-pointer">
                Make this story public? (Others can view and potentially fork)
              </Label>
            </div>

            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Story
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

