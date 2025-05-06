"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
// Import the wrapped updateProfile function
import { updateProfile } from "@/lib/firebase"; // Changed import
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfilePage() {
  const { user, loading: authLoading, refreshUser } = useAuth(); // Get refreshUser
  const router = useRouter();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (user) {
      setDisplayName(user.displayName || "");
    }
  }, [user, authLoading, router]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const originalDisplayName = user.displayName; // Store original name

    setLoading(true);
    try {
      await updateProfile(user, { displayName }); // Use the wrapped function
      await refreshUser(); // Refresh user data in AuthProvider
      toast({ title: "Profile Updated", description: "Your display name has been updated." });
      // No need to manually setDisplayName, useEffect will handle it after refreshUser updates the user object
    } catch (error: any) {
      console.error("Profile Update Error:", error);
      setDisplayName(originalDisplayName || ""); // Revert UI on error
      toast({
        title: "Update Failed",
        description: error.message || "Could not update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
            <CardContent className="space-y-4">
               <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
               </div>
               <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
               </div>
               <Skeleton className="h-10 w-28" />
            </CardContent>
          </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">Your Profile</CardTitle>
          <CardDescription>View and update your account details.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user.email || ""}
                disabled // Email is usually not changeable easily
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">Email address cannot be changed here.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Your Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loading}
              />
               <p className="text-xs text-muted-foreground">This name will be visible to collaborators.</p>
            </div>
            <Button type="submit" disabled={loading || displayName === user.displayName}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
