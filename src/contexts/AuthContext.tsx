import React, { Component, createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { onSnapshot, doc, getDoc, setDoc } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: string;
  storageUsed: number;
  storageLimit: number;
  createdAt: string;
  phone?: string;
  state?: string;
  city?: string;
  country?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string, phone: string, state: string, city: string, country: string) => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signInWithGoogle: async () => {},
  registerWithEmail: async () => {},
  loginWithEmail: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      const error = this.state.error;
      if (error && error.message) {
        try {
          const parsedError = JSON.parse(error.message);
          if (parsedError && parsedError.error) {
            errorMessage = `Firebase Error: ${parsedError.error} during ${parsedError.operationType} on ${parsedError.path}`;
          }
        } catch (e) {
          errorMessage = error.message;
        }
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 p-4">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold mb-4 text-red-500">Application Error</h2>
            <p className="text-zinc-400 mb-6">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 px-4 bg-zinc-100 text-zinc-950 font-semibold rounded-xl hover:bg-zinc-200 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        try {
          const userDoc = await getDoc(userRef);
          
          if (!userDoc.exists()) {
            const newProfile = {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              role: 'photographer',
              storageUsed: 0,
              storageLimit: 10 * 1024 * 1024 * 1024, // Default 10 GB
              createdAt: new Date().toISOString()
            };
            await setDoc(userRef, newProfile);
          }

          // Listen to profile changes
          unsubscribeProfile = onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
              setProfile(doc.data() as UserProfile);
            }
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}`);
        }
      } else {
        setProfile(null);
        if (unsubscribeProfile) unsubscribeProfile();
      }
      
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google", error);
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string, phone: string, state: string, city: string, country: string) => {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(user, { displayName: name });
      
      const userRef = doc(db, 'users', user.uid);
      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email,
        displayName: name,
        photoURL: null,
        role: 'photographer',
        storageUsed: 0,
        storageLimit: 10 * 1024 * 1024 * 1024,
        createdAt: new Date().toISOString(),
        phone,
        state,
        city,
        country
      };
      await setDoc(userRef, newProfile);

      // Also create a photographer profile document
      const profileRef = doc(db, 'profiles', user.uid);
      const photographerProfile = {
        user_id: user.uid,
        display_name: name,
        email: user.email,
        phone: phone,
        state: state,
        city: city,
        country: country,
        location: `${city}, ${state}, ${country}`,
        is_public: true,
        slug: name.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).substring(2, 6),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        privacy_settings: {
          show_email: false,
          show_phone: false,
          show_website: false,
          show_booking: false,
          show_socials: false,
          show_location: true,
          show_avatar: true,
          show_bio: true,
          show_display_name: true,
        }
      };
      await setDoc(profileRef, photographerProfile);

    } catch (error) {
      console.error("Error registering with email", error);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      console.error("Error logging in with email", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, registerWithEmail, loginWithEmail, logout }}>
      <ErrorBoundary>
        {!loading && children}
      </ErrorBoundary>
    </AuthContext.Provider>
  );
};
