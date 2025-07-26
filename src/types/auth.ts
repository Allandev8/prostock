export type UserRole = 'admin' | 'pdv' | 'stock';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'pdv';
  firebaseUid?: string;
  photoURL?: string;
  emailVerified?: boolean;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}