import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, onAuthStateChanged as onFirebaseAuthStateChanged, User, updateProfile as updateFirebaseProfile } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDB5yupHweREpIZS15ZYvfdx_6m79gCITc",
  authDomain: "quillcraft-fb78e.firebaseapp.com",
  projectId: "quillcraft-fb78e",
  storageBucket: "quillcraft-fb78e.appspot.com", // Corrected storageBucket domain
  messagingSenderId: "302943048862",
  appId: "1:302943048862:web:a7fdd2537c49a28850978f",
  measurementId: "G-TJSZDE1HYP"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize Analytics if supported
let analytics;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

// --- User Profile Management ---

// Function to update user profile data in Firestore 'users' collection
const updateUserDocument = async (user: User) => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        // Add any other relevant user data you want to store
    };
    try {
        // Use setDoc with merge: true to create or update the document
        await setDoc(userDocRef, userData, { merge: true });
    } catch (error) {
        console.error("Error updating user document in Firestore:", error);
    }
};

// Listen for auth state changes to update Firestore user document
onFirebaseAuthStateChanged(auth, async (user) => {
  if (user) {
    // User is signed in, update their document
    // Check if user doc exists first to avoid unnecessary writes on every auth change
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);
    if (!userDocSnap.exists() ||
        userDocSnap.data()?.displayName !== user.displayName ||
        userDocSnap.data()?.photoURL !== user.photoURL ||
        userDocSnap.data()?.email !== user.email // Check email too
        ) {
            await updateUserDocument(user);
    }
  }
  // User is signed out - no action needed for the user document here
});

// Wrapper for updating Firebase Auth profile AND Firestore document
const updateProfile = async (user: User, profileData: { displayName?: string | null; photoURL?: string | null }) => {
    await updateFirebaseProfile(user, profileData); // Update Firebase Auth profile
    await updateUserDocument(user); // Update Firestore document (or re-fetch user and update)
    // It might be slightly more robust to re-fetch the user object after updateFirebaseProfile
    // const updatedUser = auth.currentUser;
    // if(updatedUser) await updateUserDocument(updatedUser);
};


export { app, auth, db, analytics, updateProfile }; // Export the wrapped updateProfile
