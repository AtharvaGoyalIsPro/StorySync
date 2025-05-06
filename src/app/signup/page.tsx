
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
// Import auth and the wrapped updateProfile
import { auth, updateProfile } from "@/lib/firebase"; // Changed import
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";


// Define GoogleIcon as an inline SVG (same as login page)
// No longer needed, but keeping the definition commented out for potential future use
// const GoogleIcon = () => (
//     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="18px" height="18px" className="mr-2">
//       <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
//       <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.53-4.18 7.09-10.36 7.09-17.65z"/>
//       <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
//       <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
//       <path fill="none" d="M0 0h48v48H0z"/>
//     </svg>
// );


export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState(""); // Add display name state
  const [loading, setLoading] = useState(false);
  // Removed googleLoading state
  const router = useRouter();
  const { toast } = useToast();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Update profile with display name using the wrapped function
      if (userCredential.user) {
          const nameToSet = displayName.trim() || email.split('@')[0]; // Use part before @ if no display name
          await updateProfile(userCredential.user, { displayName: nameToSet });
          // The updateProfile function handles updating Firestore as well
      }
      toast({ title: "Sign Up Successful", description: "Welcome to StorySync!" });
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Sign Up Error:", error);
      toast({
        title: "Sign Up Failed",
        description: error.message || "Could not create account. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
     // No need to setLoading(false) on success
  };

   // Removed handleGoogleSignIn function


  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create an Account</CardTitle>
          <CardDescription>Enter your details to join StorySync</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
             <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Your Name (optional)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loading} // Only depends on 'loading' now
              />
               <p className="text-xs text-muted-foreground">How you'll appear to collaborators. Defaults to part of your email.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading} // Only depends on 'loading' now
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6} // Enforce minimum password length
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading} // Only depends on 'loading' now
              />
            </div>
             <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sign Up with Email
            </Button>
          </form>
           {/* Removed the Google Sign-Up divider and button */}
           {/* <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or sign up with
                </span>
              </div>
            </div>
           <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={loading || googleLoading}>
             {googleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
             Google
          </Button> */}
        </CardContent>
         <CardFooter className="flex justify-center text-sm">
           <p>
             Already have an account?{" "}
             <Link href="/login" className="underline text-accent hover:text-accent/80">
               Login
             </Link>
            </p>
         </CardFooter>
      </Card>
    </div>
  );
}
