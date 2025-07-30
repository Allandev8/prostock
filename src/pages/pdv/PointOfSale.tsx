import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { db, criarContasPadrao } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc, increment, query, orderBy, limit, where, getDocs, getDoc } from 'firebase/firestore';
import { 
  ShoppingCart, 
  Search, 
  Minus, 
  Plus, 
  Trash2,
  CreditCard,
  Scan,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  AlertTriangle,
  BarChart3,
  Filter,
  Download
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

interface Product {
  id: string;
  nome: string;
  codigoBarras: string;
  preco: number;
  estoqueAtual: number;
  estoqueMinimo: number;
  categoria: string;
  isActive?: boolean;
}

interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface CashFlowEntry {
  id: string;
  tipo: 'entrada' | 'saida';
  valor: number;
  descricao: string;
  categoria: string;
  conta: string;
  data: string;
  dataVencimento?: string;
  status: 'pago' | 'pendente' | 'agendado';
  recorrente?: boolean;
  recorrencia?: 'diario' | 'semanal' | 'mensal' | 'anual';
  usuario: string;
  observacoes?: string;
}

interface Account {
  id: string;
  nome: string;
  tipo: 'banco' | 'caixa' | 'cartao';
  saldo: number;
  ativo: boolean;
}

export const PointOfSale: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const userId = user?.id;
  
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Estados do Fluxo de Caixa
  const [cashFlowEntries, setCashFlowEntries] = useState<CashFlowEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cashFlowForm, setCashFlowForm] = useState({
    tipo: 'entrada' as 'entrada' | 'saida',
    valor: '',
    descricao: '',
    categoria: '',
    conta: '',
    data: new Date().toISOString().split('T')[0],
    dataVencimento: '',
    status: 'pago' as 'pago' | 'pendente' | 'agendado',
    recorrente: false,
    recorrencia: 'mensal' as 'diario' | 'semanal' | 'mensal' | 'anual',
    observacoes: ''
  });
  const [showCashFlowForm, setShowCashFlowForm] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'hoje' | 'semana' | 'mes' | 'ano'>('mes');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterAccount, setFilterAccount] = useState('');

  // Estados para Abertura de Caixa
  const [showAberturaModal, setShowAberturaModal] = useState(false);
  const [aberturaForm, setAberturaForm] = useState({
    dinheiro: '',
    cartoes: '',
    outras: '',
    data: format(new Date(), 'yyyy-MM-dd'),
    hora: format(new Date(), 'HH:mm'),
  });
  const [caixaAberto, setCaixaAberto] = useState(false);
  const [isSavingAbertura, setIsSavingAbertura] = useState(false);

  // Estados para Fechamento de Caixa
  const [showFechamentoModal, setShowFechamentoModal] = useState(false);
  const [fechamentoForm, setFechamentoForm] = useState({
    dinheiro: '',
    cartoes: '',
    outras: '',
    data: format(new Date(), 'yyyy-MM-dd'),
    hora: format(new Date(), 'HH:mm'),
    observacoes: ''
  });
  const [isSavingFechamento, setIsSavingFechamento] = useState(false);

  // Estados para o Log de Movimentações
  const [showLogModal, setShowLogModal] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Estado para modal de pagamento
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState('Dinheiro');
  const opcoesPagamento = ['Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'Pix', 'Outras'];

  // Buscar produtos do usuário em tempo real
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = onSnapshot(collection(db, `usuarios/${userId}/produtos`), (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      
      setProducts(productsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  // Buscar movimentações de caixa
  useEffect(() => {
    if (!userId) return;

    const cashFlowQuery = query(
      collection(db, `usuarios/${userId}/fluxoCaixa`),
      orderBy('data', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(cashFlowQuery, (snapshot) => {
      const cashFlowData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CashFlowEntry[];
      
      setCashFlowEntries(cashFlowData);
    });

    return () => unsubscribe();
  }, [userId]);

  // Buscar contas
  useEffect(() => {
    if (!userId) return;

    const accountsQuery = query(
      collection(db, `usuarios/${userId}/contas`),
      where('ativo', '==', true)
    );

    const unsubscribe = onSnapshot(accountsQuery, (snapshot) => {
      const accountsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Account[];
      
      setAccounts(accountsData);
    });

    return () => unsubscribe();
  }, [userId]);

  // Atualizar o log em tempo real
  useEffect(() => {
    if (!userId) return;
    setLoadingLogs(true);
    const unsubAberturas = onSnapshot(
      query(collection(db, `usuarios/${userId}/aberturas_caixa`), orderBy('criadoEm', 'desc')),
      (snapshot) => {
        const aberturas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), tipo: 'abertura' }));
        setLogs((prev) => {
          const outros = prev.filter(l => l.tipo !== 'abertura');
          return [...aberturas, ...outros].sort((a, b) => (b.criadoEm || b.dataVenda || '').localeCompare(a.criadoEm || a.dataVenda || ''));
        });
        setLoadingLogs(false);
      }
    );
    const unsubFechamentos = onSnapshot(
      query(collection(db, `usuarios/${userId}/fechamentos_caixa`), orderBy('criadoEm', 'desc')),
      (snapshot) => {
        const fechamentos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), tipo: 'fechamento' }));
        setLogs((prev) => {
          const outros = prev.filter(l => l.tipo !== 'fechamento');
          return [...fechamentos, ...outros].sort((a, b) => (b.criadoEm || b.dataVenda || '').localeCompare(a.criadoEm || a.dataVenda || ''));
        });
        setLoadingLogs(false);
      }
    );
    const unsubVendas = onSnapshot(
      query(collection(db, `usuarios/${userId}/vendas`), orderBy('dataVenda', 'desc')),
      (snapshot) => {
        const vendas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), tipo: 'venda' }));
        setLogs((prev) => {
          const outros = prev.filter(l => l.tipo !== 'venda');
          return [...vendas, ...outros].sort((a, b) => (b.criadoEm || b.dataVenda || '').localeCompare(a.criadoEm || a.dataVenda || ''));
        });
        setLoadingLogs(false);
      }
    );
    return () => {
      unsubAberturas();
      unsubFechamentos();
      unsubVendas();
    };
  }, [userId]);

  // Função para buscar logs de aberturas, fechamentos e vendas
  const fetchLogs = async () => {
    if (!userId) return;
    setLoadingLogs(true);
    // Buscar aberturas
    const aberturasSnap = await getDocs(query(collection(db, `usuarios/${userId}/aberturas_caixa`), orderBy('criadoEm', 'desc')));
    const aberturas = aberturasSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), tipo: 'abertura' }));
    // Buscar fechamentos
    const fechamentosSnap = await getDocs(query(collection(db, `usuarios/${userId}/fechamentos_caixa`), orderBy('criadoEm', 'desc')));
    const fechamentos = fechamentosSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), tipo: 'fechamento' }));
    // Buscar vendas
    const vendasSnap = await getDocs(query(collection(db, `usuarios/${userId}/vendas`), orderBy('dataVenda', 'desc')));
    const vendas = vendasSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), tipo: 'venda' }));
    setLogs([
      ...aberturas,
      ...fechamentos,
      ...vendas
    ].sort((a, b) => (b.criadoEm || b.dataVenda || '').localeCompare(a.criadoEm || a.dataVenda || '')));
    setLoadingLogs(false);
  };

  const filteredProducts = products.filter(product =>
    (product.isActive !== false) && (
      product.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.codigoBarras.includes(searchTerm)
    )
  );

  const cartTotal = cart.reduce((total, item) => total + item.totalPrice, 0);

  // Cálculos do Fluxo de Caixa
  const getFilteredEntries = () => {
    let filtered = cashFlowEntries;

    // Filtrar por período
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (selectedPeriod) {
      case 'hoje':
        filtered = filtered.filter(entry => {
          const entryDate = new Date(entry.data);
          return entryDate >= today;
        });
        break;
      case 'semana':
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(entry => {
          const entryDate = new Date(entry.data);
          return entryDate >= weekAgo;
        });
        break;
      case 'mes':
        const monthAgo = new Date(today.getFullYear(), today.getMonth(), 1);
        filtered = filtered.filter(entry => {
          const entryDate = new Date(entry.data);
          return entryDate >= monthAgo;
        });
        break;
      case 'ano':
        const yearAgo = new Date(today.getFullYear(), 0, 1);
        filtered = filtered.filter(entry => {
          const entryDate = new Date(entry.data);
          return entryDate >= yearAgo;
        });
        break;
    }

    // Filtrar por categoria
    if (filterCategory) {
      filtered = filtered.filter(entry => entry.categoria === filterCategory);
    }

    // Filtrar por conta
    if (filterAccount) {
      filtered = filtered.filter(entry => entry.conta === filterAccount);
    }

    return filtered;
  };

  const filteredEntries = getFilteredEntries();
  
  const totalEntradas = filteredEntries
    .filter(entry => entry.tipo === 'entrada')
    .reduce((total, entry) => total + entry.valor, 0);

  const totalSaidas = filteredEntries
    .filter(entry => entry.tipo === 'saida')
    .reduce((total, entry) => total + entry.valor, 0);

  const saldoAtual = totalEntradas - totalSaidas;

  // Função utilitária para formatar valores em reais
  const formatBRL = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Categorias disponíveis
  const categorias = [
    'Vendas',
    'Compras',
    'Salários',
    'Aluguel',
    'Contas',
    'Marketing',
    'Manutenção',
    'Investimentos',
    'Empréstimos',
    'Outros'
  ];

  const getProductByBarcode = (barcode: string): Product | undefined => {
    return products.find(p => p.codigoBarras === barcode && p.isActive !== false);
  };

  // Funções do PDV
  const addToCart = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product || product.estoqueAtual === 0) {
      toast({
        title: "Produto indisponível",
        description: "Este produto não está disponível em estoque.",
        variant: "destructive"
      });
      return;
    }

    const existingItem = cart.find(item => item.productId === productId);
    
    if (existingItem) {
      if (existingItem.quantity < product.estoqueAtual) {
        updateCartQuantity(productId, existingItem.quantity + 1);
      } else {
        toast({
          title: "Estoque insuficiente",
          description: "Não há estoque suficiente para adicionar mais unidades.",
          variant: "destructive"
        });
      }
    } else {
      const newItem: SaleItem = {
        productId: product.id,
        productName: product.nome,
        quantity: 1,
        unitPrice: product.preco,
        totalPrice: product.preco
      };
      setCart(prev => [...prev, newItem]);
      toast({
        title: "Produto adicionado",
        description: `${product.nome} foi adicionado ao carrinho.`
      });
    }
    setSearchTerm('');
  };

  const updateCartQuantity = (productId: string, newQuantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (newQuantity === 0) {
      removeFromCart(productId);
      return;
    }

    if (newQuantity > product.estoqueAtual) {
      toast({
        title: "Estoque insuficiente",
        description: "Não há estoque suficiente para esta quantidade.",
        variant: "destructive"
      });
      return;
    }

    setCart(prev => prev.map(item =>
      item.productId === productId
        ? { ...item, quantity: newQuantity, totalPrice: newQuantity * item.unitPrice }
        : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const handleBarcodeScan = (barcode: string) => {
    const product = getProductByBarcode(barcode);
    if (product && product.estoqueAtual > 0) {
      addToCart(product.id);
    } else {
      toast({
        title: "Produto não encontrado",
        description: "Código de barras não encontrado ou produto sem estoque.",
        variant: "destructive"
      });
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchTerm) {
      // Try barcode first
      const productByBarcode = getProductByBarcode(searchTerm);
      if (productByBarcode) {
        addToCart(productByBarcode.id);
        return;
      }

      // Then try first product from search results
      if (filteredProducts.length > 0) {
        addToCart(filteredProducts[0].id);
      } else {
        toast({
          title: "Produto não encontrado",
          description: "Nenhum produto encontrado com este termo.",
          variant: "destructive"
        });
      }
    }
  };

  // Ajustar processSaleTransaction para abrir modal de pagamento
  const handleFinalizarVenda = () => {
    setShowPagamentoModal(true);
  };

  // Carregar dados da empresa
  const [empresaData, setEmpresaData] = useState<any>(null);
  const [cupomNumber, setCupomNumber] = useState(1);

  // Carregar dados da empresa
  useEffect(() => {
    if (!userId) return;
    const loadEmpresaData = async () => {
      try {
        const docSnap = await getDoc(doc(db, `usuarios/${userId}/empresa`, 'configuracoes'));
        if (docSnap.exists()) {
          setEmpresaData(docSnap.data());
        }
      } catch (error) {
        console.error('Erro ao carregar dados da empresa:', error);
      }
    };
    loadEmpresaData();
  }, [userId]);

  // Função para gerar número do cupom
  const gerarNumeroCupom = () => {
    const numero = cupomNumber;
    setCupomNumber(prev => prev + 1);
    return numero.toString().padStart(6, '0');
  };

  // Função para imprimir cupom fiscal
  const imprimirCupomFiscal = (vendaData: any) => {
    const numeroCupom = gerarNumeroCupom();
    const dataHora = new Date();
    const dataFormatada = dataHora.toLocaleDateString('pt-BR');
    const horaFormatada = dataHora.toLocaleTimeString('pt-BR');

    // Criar conteúdo do cupom
    const cupomContent = `
╔══════════════════════════════════════════════════════════════╗
║                        CUPOM FISCAL                          ║
╠══════════════════════════════════════════════════════════════╣
║ ${empresaData?.companyName || 'NOME FANTASIA LTDA'}          ║
║ ${empresaData?.razaoSocial || 'RAZÃO SOCIAL'}                ║
║ CNPJ/CPF: ${empresaData?.cnpjCpf || '00.000.000/0000-00'}    ║
║ ${empresaData?.address || 'ENDEREÇO'}                        ║
║ Tel: ${empresaData?.phone || '(00) 0000-0000'}               ║
╠══════════════════════════════════════════════════════════════╣
║ Cupom: ${numeroCupom}    Data: ${dataFormatada} ${horaFormatada} ║
╠══════════════════════════════════════════════════════════════╣
║ ITEM  CÓD.  DESCRIÇÃO                    QTD   VL.UN   TOTAL ║
╠══════════════════════════════════════════════════════════════╣
${vendaData.items.map((item: any, index: number) => {
  const itemNumber = (index + 1).toString().padStart(3, '0');
  const codigo = item.produtoId.substring(0, 6);
  const descricao = item.produtoNome.substring(0, 25).padEnd(25);
  const qtd = item.quantidade.toString().padStart(3, ' ');
  const vlUn = formatBRL(item.precoUnitario).padStart(8, ' ');
  const total = formatBRL(item.precoTotal).padStart(10, ' ');
  return `║ ${itemNumber}  ${codigo}  ${descricao} ${qtd}  ${vlUn}  ${total} ║`;
}).join('\n')}
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║ FORMA DE PAGAMENTO: ${vendaData.formaPagamento}              ║
║                                                              ║
║ TOTAL DA COMPRA: ${formatBRL(vendaData.total)}               ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║                    OBRIGADO PELA PREFERÊNCIA!                ║
║                                                              ║
║ ${empresaData?.email || 'contato@empresa.com'}               ║
╚══════════════════════════════════════════════════════════════╝
    `;

    // Abrir nova janela para impressão
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Cupom Fiscal - ${numeroCupom}</title>
            <style>
              body {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                line-height: 1.2;
                margin: 0;
                padding: 10px;
                white-space: pre;
              }
              @media print {
                body { margin: 0; }
              }
            </style>
          </head>
          <body>
            ${cupomContent}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
    }

    // Salvar dados do cupom no Firestore
    const salvarCupomFiscal = async () => {
      try {
        await addDoc(collection(db, `usuarios/${userId}/cupons`), {
          numeroCupom,
          dataHora: dataHora.toISOString(),
          vendaData,
          empresaData,
          usuario: user.email
        });
      } catch (error) {
        console.error('Erro ao salvar cupom:', error);
      }
    };
    salvarCupomFiscal();
  };

  // Nova função para processar venda após seleção da forma de pagamento
  const confirmarVendaComPagamento = async () => {
    if (cart.length === 0 || !userId) return;
    setIsProcessing(true);
    setShowPagamentoModal(false);
    try {
      // Verificar estoque
      for (const item of cart) {
        const product = products.find(p => p.id === item.productId);
        if (!product || product.estoqueAtual < item.quantity) {
          toast({
            title: 'Estoque insuficiente',
            description: `${product?.nome || 'Produto'} não tem estoque suficiente.`,
            variant: 'destructive'
          });
          setIsProcessing(false);
          return;
        }
      }
      // Registrar a venda
      const saleData = {
        items: cart.map(item => ({
          produtoId: item.productId,
          produtoNome: item.productName,
          quantidade: item.quantity,
          precoUnitario: item.unitPrice,
          precoTotal: item.totalPrice
        })),
        total: cartTotal,
        usuarioId: userId,
        dataVenda: new Date().toISOString(),
        status: 'finalizada',
        formaPagamento
      };
      await addDoc(collection(db, `usuarios/${userId}/vendas`), saleData);
      
      // Imprimir cupom fiscal
      imprimirCupomFiscal(saleData);
      
      // Registrar entrada no fluxo de caixa
      await addDoc(collection(db, `usuarios/${userId}/fluxoCaixa`), {
        tipo: 'entrada',
        valor: cartTotal,
        descricao: `Venda - ${cart.map(item => item.productName).join(', ')}`,
        categoria: 'Vendas',
        conta: 'Caixa Principal',
        data: new Date().toISOString(),
        status: 'pago',
        usuario: user.email,
        formaPagamento
      });
      // Atualizar estoque
      for (const item of cart) {
        const productRef = doc(db, `usuarios/${userId}/produtos`, item.productId);
        await updateDoc(productRef, {
          estoqueAtual: increment(-item.quantity)
        });
        await addDoc(collection(db, `usuarios/${userId}/movimentacoes`), {
          produtoId: item.productId,
          tipo: 'saida',
          quantidade: item.quantity,
          observacao: `Venda - ${item.productName}`,
          usuario: user.email,
          createdAt: new Date().toISOString()
        });
      }
      toast({
        title: 'Venda finalizada!',
        description: `Venda de ${formatBRL(cartTotal)} processada com sucesso. Cupom fiscal impresso.`
      });
      setCart([]);
      setSearchTerm('');
      searchInputRef.current?.focus();
    } catch (error) {
      console.error('Erro ao processar venda:', error);
      toast({
        title: 'Erro ao processar venda',
        description: 'Ocorreu um erro ao finalizar a venda. Tente novamente.',
        variant: 'destructive'
      });
    }
    setIsProcessing(false);
  };

  const clearCart = () => {
    setCart([]);
    setSearchTerm('');
    searchInputRef.current?.focus();
  };

  // Funções do Fluxo de Caixa
  const handleCashFlowSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !cashFlowForm.valor || !cashFlowForm.descricao) return;

    try {
      await addDoc(collection(db, `usuarios/${userId}/fluxoCaixa`), {
        tipo: cashFlowForm.tipo,
        valor: parseFloat(cashFlowForm.valor),
        descricao: cashFlowForm.descricao,
        categoria: cashFlowForm.categoria || 'Outros',
        conta: cashFlowForm.conta || 'Caixa Principal',
        data: cashFlowForm.data,
        dataVencimento: cashFlowForm.dataVencimento || undefined,
        status: cashFlowForm.status,
        recorrente: cashFlowForm.recorrente,
        recorrencia: cashFlowForm.recorrencia,
        observacoes: cashFlowForm.observacoes,
        usuario: user.email
      });

      toast({
        title: `${cashFlowForm.tipo === 'entrada' ? 'Entrada' : 'Saída'} registrada!`,
        description: `R$ ${parseFloat(cashFlowForm.valor).toFixed(2)} registrado com sucesso.`
      });

      setCashFlowForm({
        tipo: 'entrada',
        valor: '',
        descricao: '',
        categoria: '',
        conta: '',
        data: new Date().toISOString().split('T')[0],
        dataVencimento: '',
        status: 'pago',
        recorrente: false,
        recorrencia: 'mensal',
        observacoes: ''
      });
      setShowCashFlowForm(false);
    } catch (error) {
      console.error('Erro ao registrar movimentação:', error);
      toast({
        title: "Erro ao registrar",
        description: "Ocorreu um erro ao registrar a movimentação.",
        variant: "destructive"
      });
    }
  };

  const resetCashFlowForm = () => {
    setCashFlowForm({
      tipo: 'entrada',
      valor: '',
      descricao: '',
      categoria: '',
      conta: '',
      data: new Date().toISOString().split('T')[0],
      dataVencimento: '',
      status: 'pago',
      recorrente: false,
      recorrencia: 'mensal',
      observacoes: ''
    });
  };

  // Função para salvar abertura de caixa no Firestore
  const handleAberturaCaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setIsSavingAbertura(true);
    try {
      await addDoc(collection(db, `usuarios/${userId}/aberturas_caixa`), {
        operadorNome: user?.name,
        operadorId: userId,
        pdv: 'PDV Principal', // Ajuste conforme necessário
        dinheiro: parseFloat(aberturaForm.dinheiro || '0'),
        cartoes: parseFloat(aberturaForm.cartoes || '0'),
        outras: parseFloat(aberturaForm.outras || '0'),
        data: aberturaForm.data,
        hora: aberturaForm.hora,
        criadoEm: new Date().toISOString(),
      });
      setCaixaAberto(true);
      setShowAberturaModal(false);
      toast({
        title: 'Abertura de caixa registrada!',
        description: 'O caixa foi aberto com sucesso.'
      });
    } catch (error) {
      toast({
        title: 'Erro ao abrir caixa',
        description: 'Não foi possível registrar a abertura. Tente novamente.',
        variant: 'destructive'
      });
    }
    setIsSavingAbertura(false);
  };

  // Função para salvar fechamento de caixa no Firestore
  const handleFechamentoCaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setIsSavingFechamento(true);
    try {
      await addDoc(collection(db, `usuarios/${userId}/fechamentos_caixa`), {
        operadorNome: user?.name,
        operadorId: userId,
        pdv: 'PDV Principal', // Ajuste conforme necessário
        dinheiro: parseFloat(fechamentoForm.dinheiro || '0'),
        cartoes: parseFloat(fechamentoForm.cartoes || '0'),
        outras: parseFloat(fechamentoForm.outras || '0'),
        data: fechamentoForm.data,
        hora: fechamentoForm.hora,
        observacoes: fechamentoForm.observacoes,
        criadoEm: new Date().toISOString(),
      });
      setCaixaAberto(false);
      setShowFechamentoModal(false);
      toast({
        title: 'Fechamento de caixa registrado!',
        description: 'O caixa foi fechado com sucesso.'
      });
    } catch (error) {
      toast({
        title: 'Erro ao fechar caixa',
        description: 'Não foi possível registrar o fechamento. Tente novamente.',
        variant: 'destructive'
      });
    }
    setIsSavingFechamento(false);
  };

  // Bloquear vendas se caixa não estiver aberto
  const podeVender = caixaAberto;

  // Função para exportar o log para Excel (cada item de venda em uma linha)
  const exportLogToExcel = () => {
    const data: any[] = [];
    logs.forEach((log) => {
      if (log.tipo === 'abertura' || log.tipo === 'fechamento') {
        data.push({
          Tipo: log.tipo === 'abertura' ? 'Abertura' : 'Fechamento',
          Data: `${log.data} ${log.hora}`,
          Operador: log.operadorNome,
          PDV: log.pdv,
          Dinheiro: log.dinheiro,
          Cartoes: log.cartoes,
          Outras: log.outras,
          Observacoes: log.observacoes || '',
          Produto: '',
          Quantidade: '',
          ValorUnitario: '',
          ValorTotalItem: '',
          ValorTotalVenda: '',
        });
      } else if (log.tipo === 'venda') {
        (log.items || []).forEach((item: any) => {
          data.push({
            Tipo: 'Venda',
            Data: new Date(log.dataVenda).toLocaleString('pt-BR'),
            Operador: '',
            PDV: '',
            Dinheiro: '',
            Cartoes: '',
            Outras: '',
            Observacoes: '',
            Produto: item.produtoNome,
            Quantidade: item.quantidade,
            ValorUnitario: item.precoUnitario,
            ValorTotalItem: item.precoTotal,
            ValorTotalVenda: log.total,
            FormaPagamento: log.formaPagamento || 'Dinheiro'
          });
        });
      }
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MovimentacoesCaixa');
    XLSX.writeFile(wb, 'movimentacoes_caixa.xlsx');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando produtos...</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-muted/30 p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Usuário não autenticado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4">
      <div className="max-w-7xl mx-auto">
        <Tabs defaultValue="pdv" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pdv" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              PDV
            </TabsTrigger>
            <TabsTrigger value="fluxo-caixa" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Fluxo de Caixa
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pdv" className="space-y-6">
            {/* Botões de Abertura e Fechamento de Caixa */}
            <div className="flex gap-4 mb-4">
              <Button variant="default" onClick={() => setShowAberturaModal(true)} disabled={caixaAberto}>Abertura de Caixa</Button>
              <Button variant="secondary" onClick={() => setShowFechamentoModal(true)} disabled={!caixaAberto}>Fechamento de Caixa</Button>
              <Button variant="outline" onClick={() => { setShowLogModal(true); }}>Visualizar Log de Movimentações</Button>
            </div>
            {/* Modal de Abertura de Caixa */}
            <Dialog open={showAberturaModal} onOpenChange={setShowAberturaModal}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Iniciar Abertura de Caixa</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAberturaCaixa} className="space-y-4">
                  <div>
                    <strong>Operador:</strong> {user?.name} <br />
                    <strong>ID:</strong> {userId} <br />
                    <strong>PDV:</strong> PDV Principal
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label>Dinheiro Vivo (R$)</label>
                      <Input type="number" step="0.01" min="0" value={aberturaForm.dinheiro} onChange={e => setAberturaForm(f => ({ ...f, dinheiro: e.target.value }))} required />
                    </div>
                    <div>
                      <label>Cartões (R$)</label>
                      <Input type="number" step="0.01" min="0" value={aberturaForm.cartoes} onChange={e => setAberturaForm(f => ({ ...f, cartoes: e.target.value }))} required />
                    </div>
                    <div>
                      <label>Outras formas (R$)</label>
                      <Input type="number" step="0.01" min="0" value={aberturaForm.outras} onChange={e => setAberturaForm(f => ({ ...f, outras: e.target.value }))} required />
                    </div>
                    <div>
                      <label>Data</label>
                      <Input type="date" value={aberturaForm.data} onChange={e => setAberturaForm(f => ({ ...f, data: e.target.value }))} required />
                    </div>
                    <div>
                      <label>Hora</label>
                      <Input type="time" value={aberturaForm.hora} onChange={e => setAberturaForm(f => ({ ...f, hora: e.target.value }))} required />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isSavingAbertura}>{isSavingAbertura ? 'Salvando...' : 'Confirmar Abertura de Caixa'}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            {/* Modal de Fechamento de Caixa */}
            <Dialog open={showFechamentoModal} onOpenChange={setShowFechamentoModal}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Fechamento de Caixa</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleFechamentoCaixa} className="space-y-4">
                  <div>
                    <strong>Operador:</strong> {user?.name} <br />
                    <strong>ID:</strong> {userId} <br />
                    <strong>PDV:</strong> PDV Principal
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label>Dinheiro Vivo (R$)</label>
                      <Input type="number" step="0.01" min="0" value={fechamentoForm.dinheiro} onChange={e => setFechamentoForm(f => ({ ...f, dinheiro: e.target.value }))} required />
                    </div>
                    <div>
                      <label>Cartões (R$)</label>
                      <Input type="number" step="0.01" min="0" value={fechamentoForm.cartoes} onChange={e => setFechamentoForm(f => ({ ...f, cartoes: e.target.value }))} required />
                    </div>
                    <div>
                      <label>Outras formas (R$)</label>
                      <Input type="number" step="0.01" min="0" value={fechamentoForm.outras} onChange={e => setFechamentoForm(f => ({ ...f, outras: e.target.value }))} required />
                    </div>
                    <div>
                      <label>Data</label>
                      <Input type="date" value={fechamentoForm.data} onChange={e => setFechamentoForm(f => ({ ...f, data: e.target.value }))} required />
                    </div>
                    <div>
                      <label>Hora</label>
                      <Input type="time" value={fechamentoForm.hora} onChange={e => setFechamentoForm(f => ({ ...f, hora: e.target.value }))} required />
                    </div>
                  </div>
                  <div>
                    <label>Observações</label>
                    <Input value={fechamentoForm.observacoes} onChange={e => setFechamentoForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Observações adicionais (opcional)" />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isSavingFechamento}>{isSavingFechamento ? 'Salvando...' : 'Confirmar Fechamento de Caixa'}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            {/* Modal de Log de Movimentações */}
            <Dialog open={showLogModal} onOpenChange={setShowLogModal}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Histórico de Movimentações do Caixa</DialogTitle>
                  <Button variant="outline" size="sm" onClick={exportLogToExcel} className="ml-2">Baixar Excel</Button>
                </DialogHeader>
                {loadingLogs ? (
                  <div className="text-center py-8">Carregando...</div>
                ) : (
                  <div className="max-h-[60vh] overflow-y-auto space-y-4">
                    {logs.length === 0 && <div className="text-center py-8">Nenhuma movimentação encontrada</div>}
                    {logs.map((log, idx) => (
                      <div key={log.id + idx} className="border rounded-lg p-3">
                        {log.tipo === 'abertura' && (
                          <div>
                            <strong>🔓 Abertura de Caixa</strong><br />
                            Operador: {log.operadorNome} | ID: {log.operadorId} | PDV: {log.pdv}<br />
                            Data: {log.data} {log.hora}<br />
                            Dinheiro: {formatBRL(log.dinheiro || 0)} | Cartões: {formatBRL(log.cartoes || 0)} | Outras: {formatBRL(log.outras || 0)}
                          </div>
                        )}
                        {log.tipo === 'fechamento' && (
                          <div>
                            <strong>🔒 Fechamento de Caixa</strong><br />
                            Operador: {log.operadorNome} | ID: {log.operadorId} | PDV: {log.pdv}<br />
                            Data: {log.data} {log.hora}<br />
                            Dinheiro: {formatBRL(log.dinheiro || 0)} | Cartões: {formatBRL(log.cartoes || 0)} | Outras: {formatBRL(log.outras || 0)}<br />
                            Observações: {log.observacoes || '-'}
                          </div>
                        )}
                        {log.tipo === 'venda' && (
                          <div>
                            <strong>🛒 Venda</strong><br />
                            Data/Hora: {new Date(log.dataVenda).toLocaleString()}<br />
                            Valor Total: <strong>{formatBRL(log.total || 0)}</strong><br />
                            Forma de Pagamento: {log.formaPagamento || 'Dinheiro'}<br />
                            Itens:<br />
                            <ul className="ml-4 list-disc">
                              {log.items?.map((item: any, i: number) => (
                                <li key={i}>{item.produtoNome} - Qtd: {item.quantidade} - {formatBRL(item.precoTotal || 0)}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </DialogContent>
            </Dialog>
            {/* Modal de Pagamento */}
            <Dialog open={showPagamentoModal} onOpenChange={setShowPagamentoModal}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Selecione a Forma de Pagamento</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {opcoesPagamento.map(opcao => (
                    <label key={opcao} className="flex items-center gap-2">
                      <input type="radio" name="formaPagamento" value={opcao} checked={formaPagamento === opcao} onChange={() => setFormaPagamento(opcao)} />
                      {opcao}
                    </label>
                  ))}
                </div>
                <DialogFooter>
                  <Button onClick={confirmarVendaComPagamento} disabled={isProcessing}>Confirmar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Product Search */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Search className="mr-2 h-5 w-5" />
                    Buscar Produtos
                  </CardTitle>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        ref={searchInputRef}
                        placeholder="Digite o nome ou código de barras..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={handleSearchKeyPress}
                        className="pr-10"
                      />
                      <Scan className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                        onClick={() => addToCart(product.id)}
                      >
                        <div className="flex-1">
                          <h3 className="font-medium text-foreground">{product.nome}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-muted-foreground">
                              {formatBRL(product.preco)}
                            </span>
                            <Badge variant={product.estoqueAtual > product.estoqueMinimo ? 'outline' : 'destructive'}>
                              {product.estoqueAtual} em estoque
                            </Badge>
                            <div className="text-xs text-muted-foreground">Valor em estoque: {formatBRL(product.preco * product.estoqueAtual)}</div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          disabled={product.estoqueAtual === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(product.id);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    
                    {searchTerm && filteredProducts.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">Produto não encontrado</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Shopping Cart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <ShoppingCart className="mr-2 h-5 w-5" />
                      Carrinho ({cart.length})
                    </div>
                    {cart.length > 0 && (
                      <Button variant="outline" size="sm" onClick={clearCart}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {cart.length === 0 ? (
                    <div className="text-center py-12">
                      <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Carrinho vazio</p>
                      <p className="text-sm text-muted-foreground">
                        Busque e adicione produtos para iniciar uma venda
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {cart.map((item) => (
                          <div key={item.productId} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <h4 className="font-medium text-foreground">{item.productName}</h4>
                              <p className="text-sm text-muted-foreground">
                                {formatBRL(item.unitPrice)} cada
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                                  disabled={!podeVender}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-8 text-center text-sm font-medium">
                                  {item.quantity}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                                  disabled={item.quantity >= (products.find(p => p.id === item.productId)?.estoqueAtual || 0) || !podeVender}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              
                              <div className="text-right min-w-20">
                                <p className="font-medium text-foreground">
                                  {formatBRL(item.totalPrice)}
                                </p>
                              </div>
                              
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => removeFromCart(item.productId)}
                                disabled={!podeVender}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-lg font-medium text-foreground">Total:</span>
                          <span className="text-2xl font-bold text-primary">
                            {formatBRL(cartTotal)}
                          </span>
                        </div>
                        
                        <Button
                          onClick={handleFinalizarVenda}
                          disabled={isProcessing || cart.length === 0 || !podeVender}
                          className="w-full"
                          size="lg"
                        >
                          <CreditCard className="mr-2 h-4 w-4" />
                          {isProcessing ? 'Processando...' : 'Finalizar Venda'}
                        </Button>
                        {!podeVender && (
                          <div className="mt-2 text-sm text-red-600 text-center">
                            As vendas estão bloqueadas até que a abertura de caixa seja concluída.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="fluxo-caixa" className="space-y-6">
            {/* Resumo do Fluxo de Caixa */}
            <div className="grid gap-3 md:grid-cols-4">
              <Card className="p-3">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-0 pt-0">
                  <CardTitle className="text-xs font-medium">Saldo Atual</CardTitle>
                  <Wallet className="h-3 w-3 text-muted-foreground" />
                </CardHeader>
                <CardContent className="px-0 pb-0">
                  <div className={`text-lg font-bold ${saldoAtual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatBRL(saldoAtual)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedPeriod === 'hoje' ? 'Hoje' : 
                     selectedPeriod === 'semana' ? 'Última semana' :
                     selectedPeriod === 'mes' ? 'Este mês' : 'Este ano'}
                  </p>
                </CardContent>
              </Card>

              <Card className="p-3">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-0 pt-0">
                  <CardTitle className="text-xs font-medium">Total Entradas</CardTitle>
                  <TrendingUp className="h-3 w-3 text-green-600" />
                </CardHeader>
                <CardContent className="px-0 pb-0">
                  <div className="text-lg font-bold text-green-600">
                    {formatBRL(totalEntradas)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {filteredEntries.filter(e => e.tipo === 'entrada').length} lançamentos
                  </p>
                </CardContent>
              </Card>

              <Card className="p-3">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-0 pt-0">
                  <CardTitle className="text-xs font-medium">Total Saídas</CardTitle>
                  <TrendingDown className="h-3 w-3 text-red-600" />
                </CardHeader>
                <CardContent className="px-0 pb-0">
                  <div className="text-lg font-bold text-red-600">
                    {formatBRL(totalSaidas)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {filteredEntries.filter(e => e.tipo === 'saida').length} lançamentos
                  </p>
                </CardContent>
              </Card>

              <Card className="p-3">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-0 pt-0">
                  <CardTitle className="text-xs font-medium">Alertas</CardTitle>
                  <AlertTriangle className="h-3 w-3 text-orange-600" />
                </CardHeader>
                <CardContent className="px-0 pb-0">
                  <div className="text-lg font-bold text-orange-600">
                    {saldoAtual < 0 ? 'Caixa Negativo' : 'OK'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {saldoAtual < 0 ? 'Atenção ao saldo' : 'Saldo positivo'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Filtros e Controles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Filter className="mr-2 h-5 w-5" />
                    Filtros e Controles
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowCashFlowForm(!showCashFlowForm)}
                  >
                    {showCashFlowForm ? 'Cancelar' : 'Nova Movimentação'}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium">Período</label>
                    <select
                      value={selectedPeriod}
                      onChange={(e) => setSelectedPeriod(e.target.value as any)}
                      className="w-full border rounded px-3 py-2 mt-1"
                    >
                      <option value="hoje">Hoje</option>
                      <option value="semana">Última Semana</option>
                      <option value="mes">Este Mês</option>
                      <option value="ano">Este Ano</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Categoria</label>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full border rounded px-3 py-2 mt-1"
                    >
                      <option value="">Todas</option>
                      {categorias.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Conta</label>
                    <select
                      value={filterAccount}
                      onChange={(e) => setFilterAccount(e.target.value)}
                      className="w-full border rounded px-3 py-2 mt-1"
                    >
                      <option value="">Todas</option>
                      {accounts.map(account => (
                        <option key={account.id} value={account.nome}>{account.nome}</option>
                      ))}
                    </select>
                  </div>
                                     <div className="flex items-end gap-2">
                     <Button variant="outline" className="flex-1">
                       <Download className="h-4 w-4 mr-2" />
                       Exportar
                     </Button>
                     {accounts.length === 0 && (
                       <Button 
                         variant="outline" 
                         onClick={async () => {
                           if (userId) {
                             await criarContasPadrao(userId);
                             toast({
                               title: "Contas criadas!",
                               description: "Contas padrão foram criadas com sucesso."
                             });
                           }
                         }}
                       >
                         Criar Contas
                       </Button>
                     )}
                   </div>
                </div>
              </CardContent>
            </Card>

            {/* Formulário de Nova Movimentação */}
            {showCashFlowForm && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="mr-2 h-5 w-5" />
                    Nova Movimentação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCashFlowSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="text-sm font-medium">Tipo</label>
                        <select
                          value={cashFlowForm.tipo}
                          onChange={(e) => setCashFlowForm(prev => ({ ...prev, tipo: e.target.value as 'entrada' | 'saida' }))}
                          className="w-full border rounded px-3 py-2 mt-1"
                        >
                          <option value="entrada">Entrada</option>
                          <option value="saida">Saída</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Valor (R$)</label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={cashFlowForm.valor}
                          onChange={(e) => setCashFlowForm(prev => ({ ...prev, valor: e.target.value }))}
                          placeholder="0.00"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Data</label>
                        <Input
                          type="date"
                          value={cashFlowForm.data}
                          onChange={(e) => setCashFlowForm(prev => ({ ...prev, data: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Status</label>
                        <select
                          value={cashFlowForm.status}
                          onChange={(e) => setCashFlowForm(prev => ({ ...prev, status: e.target.value as any }))}
                          className="w-full border rounded px-3 py-2 mt-1"
                        >
                          <option value="pago">Pago</option>
                          <option value="pendente">Pendente</option>
                          <option value="agendado">Agendado</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium">Descrição</label>
                        <Input
                          value={cashFlowForm.descricao}
                          onChange={(e) => setCashFlowForm(prev => ({ ...prev, descricao: e.target.value }))}
                          placeholder="Descrição da movimentação"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Categoria</label>
                        <select
                          value={cashFlowForm.categoria}
                          onChange={(e) => setCashFlowForm(prev => ({ ...prev, categoria: e.target.value }))}
                          className="w-full border rounded px-3 py-2 mt-1"
                        >
                          <option value="">Selecione...</option>
                          {categorias.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Conta</label>
                        <select
                          value={cashFlowForm.conta}
                          onChange={(e) => setCashFlowForm(prev => ({ ...prev, conta: e.target.value }))}
                          className="w-full border rounded px-3 py-2 mt-1"
                        >
                          <option value="">Selecione...</option>
                          {accounts.map(account => (
                            <option key={account.id} value={account.nome}>{account.nome}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="text-sm font-medium">Data Vencimento</label>
                        <Input
                          type="date"
                          value={cashFlowForm.dataVencimento}
                          onChange={(e) => setCashFlowForm(prev => ({ ...prev, dataVencimento: e.target.value }))}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="recorrente"
                          checked={cashFlowForm.recorrente}
                          onChange={(e) => setCashFlowForm(prev => ({ ...prev, recorrente: e.target.checked }))}
                          className="rounded"
                        />
                        <label htmlFor="recorrente" className="text-sm font-medium">Recorrente</label>
                      </div>
                      {cashFlowForm.recorrente && (
                        <div>
                          <label className="text-sm font-medium">Recorrência</label>
                          <select
                            value={cashFlowForm.recorrencia}
                            onChange={(e) => setCashFlowForm(prev => ({ ...prev, recorrencia: e.target.value as any }))}
                            className="w-full border rounded px-3 py-2 mt-1"
                          >
                            <option value="diario">Diário</option>
                            <option value="semanal">Semanal</option>
                            <option value="mensal">Mensal</option>
                            <option value="anual">Anual</option>
                          </select>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium">Observações</label>
                      <Input
                        value={cashFlowForm.observacoes}
                        onChange={(e) => setCashFlowForm(prev => ({ ...prev, observacoes: e.target.value }))}
                        placeholder="Observações adicionais (opcional)"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        Registrar Movimentação
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={resetCashFlowForm}
                      >
                        Limpar
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Lista de Movimentações */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5" />
                  Histórico de Movimentações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-foreground">{entry.descricao}</h4>
                          <Badge variant={entry.tipo === 'entrada' ? 'default' : 'destructive'}>
                            {entry.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                          </Badge>
                          <Badge variant={entry.status === 'pago' ? 'default' : 'secondary'}>
                            {entry.status}
                          </Badge>
                          {entry.categoria && (
                            <Badge variant="outline">{entry.categoria}</Badge>
                          )}
                          {entry.recorrente && (
                            <Badge variant="outline">
                              <Calendar className="h-3 w-3 mr-1" />
                              {entry.recorrencia}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(entry.data).toLocaleDateString()} - {entry.conta} - {entry.usuario}
                        </p>
                        {entry.observacoes && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {entry.observacoes}
                          </p>
                        )}
                      </div>
                      <div className={`text-right ${entry.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                        <p className="font-medium">
                          {entry.tipo === 'entrada' ? '+' : '-'} {formatBRL(entry.valor)}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {filteredEntries.length === 0 && (
                    <div className="text-center py-8">
                      <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Nenhuma movimentação encontrada</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};