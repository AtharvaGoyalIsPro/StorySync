
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, BookOpen, Loader2 } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

// Define Story interface matching Firestore structure
interface Story {
  id: string;
  title: string;
  authorId: string;
  authorName: string;
  lastUpdatedAt: Timestamp;
  isPublic: boolean;
  collaborators: string[];
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [stories, setStories] = useState<Story[]>([]);
  const [loadingStories, setLoadingStories] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login"); // Redirect if not logged in
    } else if (user) {
      setLoadingStories(true);

      // Query for stories where the user is a collaborator
      const storiesCollection = collection(db, 'stories');
      const q = query(
        storiesCollection,
        where('collaborators', 'array-contains', user.uid),
        orderBy('lastUpdatedAt', 'desc') // Order by most recently updated
      );

      // Listen for real-time updates
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const fetchedStories = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Ensure timestamp is converted correctly if needed, otherwise use as is
           lastUpdatedAt: doc.data().lastUpdatedAt as Timestamp
        } as Story));
        setStories(fetchedStories);
        setLoadingStories(false);
      }, (error) => {
        console.error("Failed to fetch stories:", error);
        toast({
           title: "Error Loading Stories",
           description: "Could not fetch your stories. Please try again later.",
           variant: "destructive",
        });
        setLoadingStories(false);
      });

      // Cleanup listener on component unmount
      return () => unsubscribe();
    }
  }, [user, authLoading, router, toast]);

  // Filter stories into "My Stories" (author) and "Collaborating On" (not author)
  const myStories = stories.filter(s => s.authorId === user?.uid);
  const collaboratingStories = stories.filter(s => s.authorId !== user?.uid);


  // Show loading state while authentication is resolving OR stories are loading
  if (authLoading || (loadingStories && !stories.length)) { // Show skeleton if auth is loading OR stories are loading initially
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-48 mb-6" />
         {/* Skeleton for My Stories */}
        <h2 className="text-2xl font-semibold mb-4"><Skeleton className="h-6 w-32 inline-block" /></h2>
         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
           {[...Array(3)].map((_, i) => (
             <Card key={`my-skel-${i}`}>
               <CardHeader>
                 <Skeleton className="h-6 w-3/4" />
                 <Skeleton className="h-4 w-1/2" />
               </CardHeader>
               <CardContent>
                 <Skeleton className="h-4 w-full mb-2" />
                 <Skeleton className="h-4 w-2/3" />
               </CardContent>
                <div className="p-4 border-t flex justify-end gap-2">
                   <Skeleton className="h-8 w-8 rounded" />
                   <Skeleton className="h-8 w-8 rounded" />
                </div>
             </Card>
           ))}
         </div>
          {/* Skeleton for Collaborating Stories */}
        <h2 className="text-2xl font-semibold mt-8 mb-4"><Skeleton className="h-6 w-48 inline-block" /></h2>
         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(2)].map((_, i) => (
             <Card key={`collab-skel-${i}`}>
               <CardHeader>
                 <Skeleton className="h-6 w-3/4" />
                 <Skeleton className="h-4 w-1/2" />
               </CardHeader>
               <CardContent>
                 <Skeleton className="h-4 w-full mb-2" />
                 <Skeleton className="h-4 w-2/3" />
               </CardContent>
                <div className="p-4 border-t flex justify-end gap-2">
                   <Skeleton className="h-8 w-8 rounded" />
                </div>
             </Card>
           ))}
         </div>
      </div>
    );
  }

   // Should not happen if redirect works, but good fallback
   if (!user) {
     return null;
   }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Your Dashboard</h1>
         <Link href="/stories/new" passHref>
           <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Story
           </Button>
         </Link>
      </div>

      <h2 className="text-2xl font-semibold mb-4">My Stories</h2>
      {loadingStories && myStories.length === 0 ? ( // Still show loader if technically loading but list is empty
         <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading your stories...
         </div>
      ) : !loadingStories && myStories.length === 0 ? (
        <Card className="text-center py-12 border-dashed">
           <CardHeader>
              <CardTitle>No Stories Yet</CardTitle>
              <CardDescription>Start your creative journey by creating your first story!</CardDescription>
           </CardHeader>
            <CardContent>
                <Link href="/stories/new" passHref>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" /> Create New Story
                    </Button>
                </Link>
            </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {myStories.map((story) => (
            <Card key={story.id} className="flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader>
                <CardTitle>{story.title}</CardTitle>
                <CardDescription>
                   Last updated: {story.lastUpdatedAt?.toDate().toLocaleDateString() ?? 'N/A'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                 {/* Placeholder for story snippet - can be added later */}
                 <p className="text-xs text-muted-foreground mt-2">{story.isPublic ? 'Public' : 'Private'}</p>
              </CardContent>
              <div className="p-4 border-t flex justify-end gap-2 bg-muted/50 rounded-b-lg">
                 <Link href={`/stories/${story.id}/edit`} passHref>
                   <Button variant="outline" size="sm" title="Edit Story">
                     <BookOpen className="mr-1 h-4 w-4" /> Edit
                   </Button>
                 </Link>
                 {/* Add Fork/Share/Delete options later */}
              </div>
            </Card>
          ))}
        </div>
      )}

       {/* Section for Forked/Collaborating Stories */}
       <h2 className="text-2xl font-semibold mt-8 mb-4">Collaborating On</h2>
       {loadingStories && collaboratingStories.length === 0 ? ( // Still show loader if technically loading but list is empty
            <div className="flex items-center justify-center py-6 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading other stories...
            </div>
       ) : !loadingStories && collaboratingStories.length === 0 ? (
           <p className="text-muted-foreground italic">You haven't joined or forked any other stories yet.</p>
       ) : (
           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {collaboratingStories.map((story) => (
                 <Card key={story.id} className="flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow duration-200">
                    <CardHeader>
                        <CardTitle>{story.title}</CardTitle>
                        <CardDescription>By: {story.authorName} | Updated: {story.lastUpdatedAt?.toDate().toLocaleDateString() ?? 'N/A'}</CardDescription>
                    </CardHeader>
                     <CardContent>
                         <p className="text-xs text-muted-foreground mt-2">{story.isPublic ? 'Public' : 'Private'}</p>
                     </CardContent>
                     <div className="p-4 border-t flex justify-end gap-2 bg-muted/50 rounded-b-lg">
                         <Link href={`/stories/${story.id}/edit`} passHref>
                            <Button variant="outline" size="sm" title="View/Edit Story">
                               <BookOpen className="mr-1 h-4 w-4" /> View/Edit
                            </Button>
                         </Link>
                     </div>
                 </Card>
              ))}
           </div>
       )}
    </div>
  );
}
