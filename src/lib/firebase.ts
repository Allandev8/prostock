// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, updateDoc, increment, getDocs, query, where, deleteDoc } from "firebase/firestore";
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

// Inicialize o Firestore
const db = getFirestore(app);

// Auth functions
export const signUp = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Salva a role 'admin' para todo novo usuário
    await saveUserRoleToFirestore(userCredential.user.uid, email, 'admin');
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

// Salva a role do usuário no Firestore
export const saveUserRoleToFirestore = async (uid: string, email: string, role: 'admin' | 'pdv') => {
  await setDoc(doc(db, "users", uid), {
    email,
    role
  }, { merge: true });
};

// Busca a role do usuário no Firestore
export const getUserRoleFromFirestore = async (uid: string): Promise<'admin' | 'pdv' | null> => {
  const userDoc = await getDoc(doc(db, "users", uid));
  if (userDoc.exists()) {
    return userDoc.data().role || null;
  }
  return null;
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

// Adiciona um novo produto ao Firestore
export async function adicionarProduto(produto: {
  nome: string;
  codigoBarras: string;
  categoria: string;
  preco: number;
  estoqueAtual: number;
  estoqueMinimo?: number;
  dataValidade?: string;
  descricao?: string;
}) {
  await addDoc(collection(db, 'produtos'), {
    ...produto,
    dataEntrada: new Date().toISOString()
  });
}

// Registra entrada de itens no estoque
export async function registrarEntrada(produtoId: string, quantidade: number, usuario: string, observacao = '') {
  await updateDoc(doc(db, 'produtos', produtoId), {
    estoqueAtual: increment(quantidade)
  });
  await addDoc(collection(db, 'movimentacoes'), {
    produtoId,
    tipo: 'entrada',
    quantidade,
    data: new Date().toISOString(),
    usuario,
    observacao
  });
}

// Registra saída/venda de itens do estoque
export async function registrarSaida(produtoId: string, quantidade: number, usuario: string, observacao = '') {
  await updateDoc(doc(db, 'produtos', produtoId), {
    estoqueAtual: increment(-quantidade)
  });
  await addDoc(collection(db, 'movimentacoes'), {
    produtoId,
    tipo: 'saida',
    quantidade,
    data: new Date().toISOString(),
    usuario,
    observacao
  });
}

// Função para popular categorias padrão no Firestore sem duplicar
export async function popularCategoriasPadrao(collectionPath = 'categorias') {
  const categorias = [
    'Alimentos perecíveis',
    'Sereais',
    'Bebidas',
    'Produtos de limpeza',
    'Higiene pessoal',
    'Produtos congelados',
    'Padaria e confeitaria',
    'Utilidades domésticas',
    'Pet shop',
    'Eletronicos',
    'Eletrico domestico',
    'INformatica',
    'moveis'
  ];
  // Buscar todas as categorias já existentes
  const snapshot = await getDocs(collection(db, collectionPath));
  const existentes = new Set(snapshot.docs.map(doc => doc.data().nome));
  for (const nome of categorias) {
    if (!existentes.has(nome)) {
      await addDoc(collection(db, collectionPath), { nome });
    }
  }
}

// Função para remover categorias duplicadas do Firestore
export async function removerCategoriasDuplicadas() {
  const snapshot = await getDocs(collection(db, "categorias"));
  const seen = new Set();
  for (const d of snapshot.docs) {
    const nome = d.data().nome;
    if (seen.has(nome)) {
      await deleteDoc(doc(db, "categorias", d.id));
    } else {
      seen.add(nome);
    }
  }
}

export { app, analytics, auth, db };
export default app; 