// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA_xxVGAjSHS2-bxmWiXWAJCkA2ApYbItc",
  authDomain: "liveprostock.firebaseapp.com",
  projectId: "liveprostock",
  storageBucket: "liveprostock.firebasestorage.app",
  messagingSenderId: "96727716201",
  appId: "1:96727716201:web:c7f71916bf39465259edf8",
  measurementId: "G-GWXF5C615H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics conditionally
let analytics = null;
isSupported().then(yes => yes ? analytics = getAnalytics(app) : null);

// Initialize Auth
const auth = getAuth(app);

// Auth functions
export const signUp = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const logOut = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const onAuthStateChange = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Helper function to store user role
const storeUserRole = (email: string, role: 'admin' | 'pdv') => {
  const storedRoles = localStorage.getItem('userRoles');
  let roles = {};
  
  if (storedRoles) {
    try {
      roles = JSON.parse(storedRoles);
    } catch (error) {
      console.error('Error parsing stored roles:', error);
    }
  }
  
  roles[email] = role;
  localStorage.setItem('userRoles', JSON.stringify(roles));
};

// Função para criar usuários master iniciais
export const createMasterUsers = async () => {
  const masterUsers = [
    { email: 'admin@sistema.com', password: 'admin123', role: 'admin' as const },
    { email: 'pdv@sistema.com', password: 'pdv123', role: 'pdv' as const }
  ];

  const results = [];
  
  for (const user of masterUsers) {
    try {
      const result = await signUp(user.email, user.password);
      
      if (result.success) {
        // Store the role for this user
        storeUserRole(user.email, user.role);
      }
      
      results.push({
        email: user.email,
        success: result.success,
        error: result.error
      });
    } catch (error: any) {
      results.push({
        email: user.email,
        success: false,
        error: error.message
      });
    }
  }

  return results;
};

export { app, analytics, auth };
export default app; 