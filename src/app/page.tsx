
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/providers/AuthProvider";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, Feather, Users } from "lucide-react";

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center">
      <Feather className="h-16 w-16 text-accent mb-4" />
      <h1 className="text-4xl font-bold mb-2">Welcome to StorySync</h1>
      <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
        Craft compelling narratives together. Write, collaborate, and bring your stories to life in real-time.
      </p>

      <div className="flex gap-4 mb-12">
        {loading ? (
           <Button disabled size="lg">Loading...</Button>
        ) : user ? (
          <Link href="/dashboard" passHref>
            <Button size="lg">Go to Dashboard</Button>
          </Link>
        ) : (
          <>
            <Link href="/login" passHref>
              <Button size="lg">Get Started</Button>
            </Link>
            {/* "Explore Stories" button removed from here, now in header */}
          </>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-4xl w-full">
          <Card className="text-left">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Users className="text-accent"/> Real-time Collaboration</CardTitle>
              </CardHeader>
              <CardContent>
                  <p className="text-muted-foreground">Write with friends or fellow authors simultaneously and see changes instantly.</p>
              </CardContent>
          </Card>
          <Card className="text-left">
              <CardHeader>
                   <CardTitle className="flex items-center gap-2"><BookOpen className="text-accent"/> Story Management</CardTitle>
              </CardHeader>
              <CardContent>
                  <p className="text-muted-foreground">Create new stories, manage chapters, and fork existing tales to explore new paths.</p>
              </CardContent>
          </Card>
           <Card className="text-left">
              <CardHeader>
                   <CardTitle className="flex items-center gap-2"><Feather className="text-accent"/> Creative Freedom</CardTitle>
              </CardHeader>
              <CardContent>
                  <p className="text-muted-foreground">A clean, intuitive interface designed to keep you focused on your writing.</p>
              </CardContent>
          </Card>
      </div>

       {/* Optional Placeholder Image Section */}
       <div className="mt-16 w-full max-w-4xl">
         <Image
           src="https://picsum.photos/1000/400"
           alt="Collaborative writing illustration"
           width={1000}
           height={400}
           className="rounded-lg shadow-md object-cover"
           data-ai-hint="collaboration writing team"
         />
       </div>
    </div>
  );
}
