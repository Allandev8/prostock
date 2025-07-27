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
    // Criar contas padrão para o novo usuário
    await criarContasPadrao(userCredential.user.uid);
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
  const categoriasPadrao = [
    { nome: 'Bebidas', descricao: 'Refrigerantes, sucos, água, etc.' },
    { nome: 'Alimentos', descricao: 'Produtos alimentícios em geral' },
    { nome: 'Limpeza', descricao: 'Produtos de limpeza e higiene' },
    { nome: 'Eletrônicos', descricao: 'Aparelhos eletrônicos' },
    { nome: 'Vestuário', descricao: 'Roupas e acessórios' },
    { nome: 'Outros', descricao: 'Outros produtos' }
  ];

  try {
    const snapshot = await getDocs(collection(db, collectionPath));
    const categoriasExistentes = snapshot.docs.map(doc => doc.data().nome);

    for (const categoria of categoriasPadrao) {
      if (!categoriasExistentes.includes(categoria.nome)) {
        await addDoc(collection(db, collectionPath), categoria);
      }
    }
  } catch (error) {
    console.error('Erro ao popular categorias:', error);
  }
}

export async function criarContasPadrao(userId: string) {
  const contasPadrao = [
    { 
      nome: 'Caixa Principal', 
      tipo: 'caixa' as const, 
      saldo: 0, 
      ativo: true,
      descricao: 'Caixa principal da empresa'
    },
    { 
      nome: 'Conta Bancária', 
      tipo: 'banco' as const, 
      saldo: 0, 
      ativo: true,
      descricao: 'Conta bancária principal'
    },
    { 
      nome: 'Cartão de Crédito', 
      tipo: 'cartao' as const, 
      saldo: 0, 
      ativo: true,
      descricao: 'Cartão de crédito empresarial'
    }
  ];

  try {
    const snapshot = await getDocs(collection(db, `usuarios/${userId}/contas`));
    const contasExistentes = snapshot.docs.map(doc => doc.data().nome);

    for (const conta of contasPadrao) {
      if (!contasExistentes.includes(conta.nome)) {
        await addDoc(collection(db, `usuarios/${userId}/contas`), conta);
      }
    }
  } catch (error) {
    console.error('Erro ao criar contas padrão:', error);
  }
}

// Função para remover categorias duplicadas do Firestore
export async function removerCategoriasDuplicadas() {
  try {
    const snapshot = await getDocs(collection(db, 'categorias'));
    const categorias = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    
    // Agrupar por nome
    const grupos = categorias.reduce((acc, cat) => {
      if (!acc[cat.nome]) {
        acc[cat.nome] = [];
      }
      acc[cat.nome].push(cat);
      return acc;
    }, {} as Record<string, any[]>);
    
    // Remover duplicatas (manter apenas a primeira)
    for (const [nome, grupo] of Object.entries(grupos)) {
      if ((grupo as any[]).length > 1) {
        // Manter o primeiro, remover os outros
        for (let i = 1; i < (grupo as any[]).length; i++) {
          await deleteDoc(doc(db, 'categorias', (grupo as any[])[i].id));
        }
      }
    }
  } catch (error) {
    console.error('Erro ao remover categorias duplicadas:', error);
  }
}

export async function resetarSistema(userId: string) {
  try {
    // Lista de coleções para limpar
    const colecoesParaLimpar = [
      'produtos',
      'categorias', 
      'movimentacoes',
      'vendas',
      'fluxoCaixa',
      'contas'
    ];

    for (const colecao of colecoesParaLimpar) {
      const snapshot = await getDocs(collection(db, `usuarios/${userId}/${colecao}`));
      
      // Deletar todos os documentos da coleção
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    }

    // Recriar contas padrão
    await criarContasPadrao(userId);
    
    // Recriar categorias padrão
    await popularCategoriasPadrao(`usuarios/${userId}/categorias`);

    return { success: true, message: 'Sistema resetado com sucesso!' };
  } catch (error) {
    console.error('Erro ao resetar sistema:', error);
    return { success: false, error: 'Erro ao resetar sistema' };
  }
}

export { app, analytics, auth, db };
export default app; 