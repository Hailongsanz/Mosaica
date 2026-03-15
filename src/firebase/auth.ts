import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from './config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './config';

export interface AppUser extends User {
  full_name?: string;
  profile_picture?: string;
}

// Sign up with email and password
export const signUp = async (email: string, password: string, fullName: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  // Update display name
  await updateProfile(userCredential.user, {
    displayName: fullName,
  });
  
  // Create user document in Firestore
  await setDoc(doc(db, 'users', userCredential.user.uid), {
    email,
    full_name: fullName,
    created_at: new Date().toISOString(),
    profile_picture: null,
  });
  
  return userCredential.user;
};

// Sign in with email and password
export const signIn = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

// Sign in with Google
export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  
  // Create user document if it doesn't exist
  const userDoc = doc(db, 'users', result.user.uid);
  const docSnap = await getDoc(userDoc);
  
  const isNewUser = !docSnap.exists();
  if (isNewUser) {
    await setDoc(userDoc, {
      email: result.user.email,
      full_name: result.user.displayName || '',
      created_at: new Date().toISOString(),
      profile_picture: result.user.photoURL || null,
    });
  }

  return { user: result.user, isNewUser };
};

// Sign out
export const logout = async () => {
  await firebaseSignOut(auth);
};

// Get current user
export const getCurrentUser = (): AppUser | null => {
  const user = auth.currentUser;
  if (!user) return null;
  
  return {
    ...user,
    full_name: user.displayName || undefined,
    profile_picture: user.photoURL || undefined,
  };
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return !!auth.currentUser;
};

// Get current user async
export const getCurrentUserAsync = (): Promise<AppUser | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (!user) {
        console.log('getCurrentUserAsync: No user signed in');
        resolve(null);
      } else {
        console.log('getCurrentUserAsync: Firebase user:', user.uid);
        console.log('getCurrentUserAsync: Firebase photoURL:', user.photoURL);
        
        // Try to get profile picture from Firestore
        let profilePicture = user.photoURL || undefined;
        
        try {
          console.log('getCurrentUserAsync: Fetching from Firestore...');
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('getCurrentUserAsync: Firestore data:', userData);
            if (userData.profile_picture) {
              profilePicture = userData.profile_picture;
              console.log('getCurrentUserAsync: Using Firestore profile_picture:', profilePicture);
            }
          } else {
            console.log('getCurrentUserAsync: No Firestore document found');
          }
        } catch (error) {
          console.error('Error fetching user profile from Firestore:', error);
        }
        
        const appUser = {
          ...user,
          full_name: user.displayName || undefined,
          profile_picture: profilePicture,
        };
        
        console.log('getCurrentUserAsync: Returning user with profile_picture:', appUser.profile_picture);
        resolve(appUser);
      }
    });
  });
};

// Update user profile
export const updateUserProfile = async (
  displayName?: string,
  photoURL?: string
): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error('No user logged in');
  
  console.log('updateUserProfile called with:', { displayName, photoURL });
  
  await updateProfile(user, {
    displayName: displayName || user.displayName,
    photoURL: photoURL || user.photoURL,
  });
  
  console.log('Firebase Auth profile updated');
  
  // Reload user to get the latest data from Firebase
  await user.reload();
  
  console.log('User reloaded, current photoURL:', auth.currentUser?.photoURL);
  
  // Also update Firestore
  const firestoreData = {
    full_name: displayName || user.displayName,
    profile_picture: photoURL || user.photoURL,
  };
  
  console.log('Updating Firestore with:', firestoreData);
  
  await setDoc(
    doc(db, 'users', user.uid),
    firestoreData,
    { merge: true }
  );
  
  console.log('Firestore document updated');
};

// Listen to auth state changes
export const onAuthChange = (callback: (user: AppUser | null) => void) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      callback(null);
    } else {
      // Try to get profile picture from Firestore (in case user uploaded custom photo)
      let profilePicture = firebaseUser.photoURL || undefined;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Prefer Firestore profile_picture over Firebase Auth photoURL
          // This ensures custom uploaded photos show up for email/password users
          if (userData.profile_picture) {
            profilePicture = userData.profile_picture;
          }
        }
      } catch (error) {
        console.error('Error fetching user profile from Firestore:', error);
        // Fall back to Firebase Auth photoURL
      }
      
      callback({
        ...firebaseUser,
        full_name: firebaseUser.displayName || undefined,
        profile_picture: profilePicture,
      });
    }
  });
};
