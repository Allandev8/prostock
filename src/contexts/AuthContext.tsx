import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthState, LoginCredentials } from '@/types/auth';
import { signIn, logOut, onAuthStateChange } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to get user role from localStorage or default
const getUserRole = (email: string): 'admin' | 'pdv' => {
  // Check if we have stored user roles
  const storedRoles = localStorage.getItem('userRoles');
  
  if (storedRoles) {
    try {
      const roles = JSON.parse(storedRoles);
      if (roles[email]) {
        return roles[email];
      }
    } catch (error) {
      console.error('Error parsing stored roles:', error);
    }
  }
  
  // Fallback to email-based role assignment
  if (email === 'admin@sistema.com') {
    return 'admin';
  } else if (email === 'pdv@sistema.com') {
    return 'pdv';
  }
  
  // Default to pdv for new users
  return 'pdv';
};

// Helper function to store user role
export const storeUserRole = (email: string, role: 'admin' | 'pdv') => {
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

// Helper function to convert Firebase user to our User type
const convertFirebaseUserToUser = (firebaseUser: any): User => {
  const role = getUserRole(firebaseUser.email || '');

  return {
    id: firebaseUser.uid,
    name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
    email: firebaseUser.email || '',
    role: role,
    firebaseUid: firebaseUser.uid,
    photoURL: firebaseUser.photoURL || undefined,
    emailVerified: firebaseUser.emailVerified
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false
  });
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChange((firebaseUser) => {
      if (firebaseUser) {
        const user = convertFirebaseUserToUser(firebaseUser);
        setAuthState({
          user,
          isLoading: false,
          isAuthenticated: true
        });
      } else {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      const result = await signIn(credentials.email, credentials.password);
      
      if (result.success) {
        toast({
          title: "Login realizado com sucesso!",
          description: "Bem-vindo ao sistema!"
        });
        return true;
      } else {
        let errorMessage = "Email ou senha incorretos";
        
        if (result.error?.includes('user-not-found')) {
          errorMessage = "Usuário não encontrado";
        } else if (result.error?.includes('wrong-password')) {
          errorMessage = "Senha incorreta";
        } else if (result.error?.includes('invalid-email')) {
          errorMessage = "Email inválido";
        } else if (result.error?.includes('too-many-requests')) {
          errorMessage = "Muitas tentativas. Tente novamente mais tarde";
        }
        
        toast({
          title: "Erro no login",
          description: errorMessage,
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      toast({
        title: "Erro no sistema",
        description: "Tente novamente em alguns instantes",
        variant: "destructive"
      });
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const result = await logOut();
      
      if (result.success) {
        toast({
          title: "Logout realizado",
          description: "Você foi desconectado do sistema"
        });
      } else {
        toast({
          title: "Erro no logout",
          description: "Tente novamente",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro no sistema",
        description: "Tente novamente em alguns instantes",
        variant: "destructive"
      });
    }
  };

  const value: AuthContextType = {
    ...authState,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};