"use client";

import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import type { ReactNode } from "react";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { auth } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton for loading state

interface AuthContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>; // Add refresh function type
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {}, // Provide a default no-op function
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to manually refresh the user state
  const refreshUser = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        await currentUser.reload(); // Reload user data from Firebase Auth
        // Get the potentially updated user object
        const refreshedUser = auth.currentUser;
        setUser(refreshedUser); // Update state
      } catch (error) {
        console.error("Error reloading user:", error);
        // Handle error appropriately, maybe sign out if token expired?
        if ((error as any).code === 'auth/user-token-expired') {
            // Optionally sign out the user or prompt re-login
             await auth.signOut();
             setUser(null);
        }
      }
    } else {
      setUser(null); // Ensure user is null if currentUser is null
    }
  }, []);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      // Also ensure user document in Firestore is updated on initial load/change
      // Note: The updateUserDocument logic is now primarily in firebase.ts
    });

    return () => unsubscribe();
  }, []); // No need for refreshUser in dependency array here

  // Show a loading indicator while checking auth state
  if (loading) {
    return (
       <div className="flex items-center justify-center min-h-screen">
         {/* Simple centered spinner or skeleton */}
         <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
       </div>
     );
  }


  return (
    <AuthContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);


// Simple Loader Component (Optional: replace Skeleton with this if preferred)
const Loader = () => (
    <div className="flex items-center justify-center min-h-screen">
      <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
);

import { Loader2 } from 'lucide-react'; // Assuming you have lucide-react installed
