import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Package, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import './Css/styles.css';

import { Textarea } from '@/components/ui/textarea';
import { adicionarProduto, db, popularCategoriasPadrao } from '@/lib/firebase';
import { collection, onSnapshot, getDocs, doc, getDoc, deleteDoc, addDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

// Função utilitária para formatar moeda brasileira
function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Função para gerar código de barras aleatório (13 dígitos)
function gerarCodigoBarras() {
  let codigo = '';
  for (let i = 0; i < 13; i++) {
    codigo += Math.floor(Math.random() * 10);
  }
  return codigo;
}

// Função para gerar código de barras único (13 dígitos)
function gerarCodigoBarrasUnico() {
  let codigo = '';
  for (let i = 0; i < 13; i++) {
    codigo += Math.floor(Math.random() * 10);
  }
  return codigo;
}

// Função para verificar se código de barras já existe
async function verificarCodigoBarrasExistente(codigo: string, userId: string) {
  const snapshot = await getDocs(collection(db, `usuarios/${userId}/produtos`));
  return snapshot.docs.some(doc => doc.data().codigoBarras === codigo);
}

// Função para gerar código de barras único
async function gerarCodigoBarrasUnicoParaUsuario(userId: string) {
  let codigo = gerarCodigoBarrasUnico();
  let tentativas = 0;
  const maxTentativas = 100;
  
  while (await verificarCodigoBarrasExistente(codigo, userId) && tentativas < maxTentativas) {
    codigo = gerarCodigoBarrasUnico();
    tentativas++;
  }
  
  return codigo;
}

export const AdminProducts: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const [products, setProducts] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    costPrice: '', // Novo campo: valor unitário pago
    stock: '',
    minStock: '',
    categoryId: '',
    description: '',
    expiryDate: '',
    dataEntrada: '',
    notaFiscal: '',
    dataFabricacao: ''
  });
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  // Buscar categorias do Firestore ao montar
  useEffect(() => {
    if (!userId) return;
    async function fetchCategorias() {
      const snapshot = await getDocs(collection(db, `usuarios/${userId}/categorias`));
      setCategorias(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }
    fetchCategorias();
  }, [userId]);

  // Sincroniza produtos em tempo real do Firestore
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    const unsubscribe = onSnapshot(collection(db, `usuarios/${userId}/produtos`), (snapshot) => {
      const produtos = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.nome,
          barcode: data.codigoBarras,
          price: data.preco,
          costPrice: data.precoCusto, // Adicionar preço de custo
          stock: data.estoqueAtual,
          minStock: data.estoqueMinimo,
          categoryId: data.categoriaId || '',
          category: data.categoria || '',
          description: data.descricao,
          expiryDate: data.dataValidade ? new Date(data.dataValidade) : undefined,
          dataEntrada: data.dataEntrada,
          notaFiscal: data.notaFiscal || '',
          dataFabricacao: data.dataFabricacao || ''
        };
      });
      setProducts(produtos);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userId]);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode.includes(searchTerm) ||
    (product.categoryId && categorias.find(c => c.id === product.categoryId && c.nome.toLowerCase().includes(searchTerm.toLowerCase()))) ||
    (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Paginação
  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Atualiza página ao filtrar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Função para calcular percentual de ganho
  function calcularPercentualGanho(precoVenda: number, precoCusto: number) {
    if (precoCusto <= 0) return 0;
    return ((precoVenda - precoCusto) / precoCusto) * 100;
  }

  // Função para calcular valor de lucro
  function calcularValorLucro(precoVenda: number, precoCusto: number) {
    return precoVenda - precoCusto;
  }

  // Função para verificar se a categoria precisa de validade
  function categoriaPrecisaValidade(categoriaId: string) {
    if (!categoriaId) return false;
    const categoria = categorias.find(c => c.id === categoriaId);
    if (!categoria) return false;
    const nomeCategoria = categoria.nome.toLowerCase();
    return nomeCategoria.includes('alimentos') || nomeCategoria.includes('bebidas') || nomeCategoria.includes('limpeza');
  }

  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      costPrice: '',
      stock: '',
      minStock: '',
      categoryId: '',
      description: '',
      expiryDate: '',
      dataEntrada: '',
      notaFiscal: '',
      dataFabricacao: ''
    });
    setEditingProduct(null);
  };

  const openDialog = (product?: any) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        price: product.price.toString(),
        costPrice: product.costPrice?.toString() || '',
        stock: product.stock.toString(),
        minStock: product.minStock.toString(),
        categoryId: product.categoryId || '',
        description: product.description || '',
        expiryDate: product.expiryDate ? product.expiryDate.toISOString().split('T')[0] : '',
        dataEntrada: product.dataEntrada ? product.dataEntrada.split('T')[0] : '',
        notaFiscal: product.notaFiscal || '',
        dataFabricacao: product.dataFabricacao ? product.dataFabricacao.split('T')[0] : ''
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    
    // Verificar se a categoria precisa de validade
    const precisaValidade = categoriaPrecisaValidade(formData.categoryId);
    
    // Gerar código de barras único para novos produtos
    let codigoBarras = '';
    if (!editingProduct) {
      try {
        codigoBarras = await gerarCodigoBarrasUnicoParaUsuario(userId);
      } catch (error) {
        console.error('Erro ao gerar código de barras:', error);
        toast({
          title: "Erro!",
          description: "Erro ao gerar código de barras. Tente novamente.",
          variant: "destructive"
        });
        return;
      }
    }
    
    const productData = {
      nome: formData.name,
      codigoBarras: editingProduct ? editingProduct.barcode : codigoBarras, // Manter código existente ou usar novo
      preco: parseFloat(formData.price),
      precoCusto: formData.costPrice ? parseFloat(formData.costPrice) : null,
      estoqueAtual: parseInt(formData.stock),
      estoqueMinimo: parseInt(formData.minStock),
      categoriaId: formData.categoryId,
      categoria: categorias.find(c => c.id === formData.categoryId)?.nome || '',
      descricao: formData.description || null,
      dataValidade: precisaValidade && formData.expiryDate ? formData.expiryDate : null,
      dataEntrada: formData.dataEntrada ? formData.dataEntrada : new Date().toISOString().split('T')[0],
      notaFiscal: formData.notaFiscal || null,
      dataFabricacao: formData.dataFabricacao ? formData.dataFabricacao : null
    };

    try {
      if (editingProduct) {
        // Atualizar produto existente
        await updateDoc(doc(db, `usuarios/${userId}/produtos`, editingProduct.id), productData);
        toast({
          title: "Produto atualizado!",
          description: `${productData.nome} foi atualizado com sucesso.`
        });
      } else {
        // Criar novo produto
        await addDoc(collection(db, `usuarios/${userId}/produtos`), productData);
        toast({
          title: "Produto adicionado!",
          description: `${productData.nome} foi adicionado ao catálogo com código: ${codigoBarras}`
        });
      }
      
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      toast({
        title: "Erro!",
        description: "Erro ao salvar produto. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  // Função para deletar um produto
  const handleDeleteProduct = async (id: string) => {
    if (!userId) return;
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      await deleteDoc(doc(db, `usuarios/${userId}/produtos`, id));
    }
  };

  // Função para deletar produtos selecionados
  const handleDeleteSelected = async () => {
    if (!userId) return;
    if (selectedProducts.length === 0) return;
    if (window.confirm('Tem certeza que deseja excluir os produtos selecionados?')) {
      await Promise.all(selectedProducts.map(id => deleteDoc(doc(db, `usuarios/${userId}/produtos`, id))));
      setSelectedProducts([]);
      setSelectAll(false);
    }
  };

  // Seleção de produtos
  const handleSelectProduct = (id: string) => {
    setSelectedProducts(prev => prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]);
  };
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedProducts([]);
      setSelectAll(false);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
      setSelectAll(true);
    }
  };

  // Botão para popular categorias
  const handlePopularCategorias = async () => {
    if (!userId) return;
    await popularCategoriasPadrao(`usuarios/${userId}/categorias`);
    toast({
      title: 'Categorias populadas!',
      description: 'Categorias padrão adicionadas com sucesso.',
    });
    // Atualiza categorias após popular
    const snapshot = await getDocs(collection(db, `usuarios/${userId}/categorias`));
    setCategorias(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  if (!userId) {
    return <div className="p-8 text-center text-muted-foreground">Carregando usuário...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Produtos</h1>
          <p className="text-muted-foreground">
            Gerencie o catálogo de produtos
          </p>
          {categorias.length === 0 && (
            <div className="my-2 flex items-center gap-2">
              <span className="text-yellow-700 text-sm">Nenhuma categoria encontrada.</span>
              <Button size="sm" variant="outline" onClick={handlePopularCategorias}>
                Popular categorias padrão
              </Button>
            </div>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <Button
            variant="destructive"
            onClick={handleDeleteSelected}
            disabled={selectedProducts.length === 0}
          >
            Excluir Selecionados
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openDialog()}>
                <Plus className="mr-2 h-4 w-4"/>
                Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="box">
              <DialogHeader>
                <DialogTitle >
                  {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                </DialogTitle>
                <DialogDescription >
                  {editingProduct 
                    ? 'Atualize as informações do produto'
                    : 'Adicione um novo produto ao catálogo'
                  }
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <Label htmlFor="name" className="text-sm">Nome do Produto</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nome do produto"
                      required
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label htmlFor="categoryId" className="text-sm">Categoria</Label>
                    <select
                      id="categoryId"
                      value={formData.categoryId}
                      onChange={e => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                      required
                      className="w-full border rounded px-2 py-1 h-8 text-sm"
                    >
                      <option value="">Selecione...</option>
                      {categorias.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="price" className="text-sm">Preço de Venda (R$)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="0.00"
                      required
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label htmlFor="costPrice" className="text-sm">Valor Unitário Pago (R$)</Label>
                    <Input
                      id="costPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.costPrice}
                      onChange={(e) => setFormData(prev => ({ ...prev, costPrice: e.target.value }))}
                      placeholder="0.00"
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label htmlFor="stock" className="text-sm">Estoque Atual</Label>
                    <Input
                      id="stock"
                      type="number"
                      min="0"
                      value={formData.stock}
                      onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                      placeholder="0"
                      required
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label htmlFor="minStock" className="text-sm">Estoque Mínimo</Label>
                    <Input
                      id="minStock"
                      type="number"
                      min="0"
                      value={formData.minStock}
                      onChange={(e) => setFormData(prev => ({ ...prev, minStock: e.target.value }))}
                      placeholder="0"
                      required
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dataFabricacao" className="text-sm">Data de Fabricação</Label>
                    <Input
                      id="dataFabricacao"
                      type="date"
                      value={formData.dataFabricacao}
                      onChange={(e) => setFormData(prev => ({ ...prev, dataFabricacao: e.target.value }))}
                      className="h-8"
                    />
                  </div>
                  {categoriaPrecisaValidade(formData.categoryId) && (
                    <div>
                      <Label htmlFor="expiryDate" className="text-sm">Data de Validade</Label>
                      <Input
                        id="expiryDate"
                        type="date"
                        value={formData.expiryDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                        className="h-8"
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="dataEntrada" className="text-sm">Data de Entrada</Label>
                    <Input
                      id="dataEntrada"
                      type="date"
                      value={formData.dataEntrada}
                      onChange={(e) => setFormData(prev => ({ ...prev, dataEntrada: e.target.value }))}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notaFiscal" className="text-sm">Número da Nota Fiscal</Label>
                    <Input
                      id="notaFiscal"
                      value={formData.notaFiscal}
                      onChange={(e) => setFormData(prev => ({ ...prev, notaFiscal: e.target.value }))}
                      placeholder="Número da nota fiscal"
                      className="h-8"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="description" className="text-sm">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descrição opcional do produto"
                      rows={1}
                      className="min-h-[32px]"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button type="submit" className="flex-1 h-8">
                    {editingProduct ? 'Atualizar' : 'Adicionar'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                    className="h-8"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <input
              type="checkbox"
              checked={selectAll}
              onChange={handleSelectAll}
              className="mr-2"
            />
            <span>Lista de Produtos</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2"><input type="checkbox" checked={selectAll} onChange={handleSelectAll} /></th>
                    <th className="px-2 py-2 text-left">Nome</th>
                    <th className="px-2 py-2 text-left">Código</th>
                    <th className="px-2 py-2 text-left">Categoria</th>
                    <th className="px-2 py-2 text-left">Preço Venda</th>
                    <th className="px-2 py-2 text-left">Preço Custo</th>
                    <th className="px-2 py-2 text-left">% Ganho</th>
                    <th className="px-2 py-2 text-left">Lucro</th>
                    <th className="px-2 py-2 text-left">Estoque</th>
                    <th className="px-2 py-2 text-left">Mínimo</th>
                    <th className="px-2 py-2 text-left">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.map((product) => {
                    const percentualGanho = calcularPercentualGanho(product.price, product.costPrice || 0);
                    const valorLucro = calcularValorLucro(product.price, product.costPrice || 0);
                    return (
                      <tr key={product.id} className="border-b last:border-b-0 hover:bg-gray-50">
                        <td className="px-2 py-2">
                          <input
                            type="checkbox"
                            checked={selectedProducts.includes(product.id)}
                            onChange={() => handleSelectProduct(product.id)}
                          />
                        </td>
                        <td className="px-2 py-2 font-medium text-foreground">{product.name}</td>
                        <td className="px-2 py-2 text-sm text-muted-foreground">{product.barcode}</td>
                        <td className="px-2 py-2">
                          <Badge variant="outline">
                            {product.categoryId ? (categorias.find(c => c.id === product.categoryId)?.nome || 'Categoria') : (product.category || 'Categoria')}
                          </Badge>
                          {product.stock <= product.minStock && (
                            <Badge variant="destructive" className="ml-2">Estoque Baixo</Badge>
                          )}
                        </td>
                        <td className="px-2 py-2">{formatBRL(product.price)}</td>
                        <td className="px-2 py-2">{product.costPrice ? formatBRL(product.costPrice) : '-'}</td>
                        <td className="px-2 py-2">
                          {product.costPrice ? (
                            <span className={percentualGanho >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {percentualGanho.toFixed(1)}%
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-2 py-2">
                          {product.costPrice ? (
                            <span className={valorLucro >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {formatBRL(valorLucro)}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-2 py-2">{product.stock}</td>
                        <td className="px-2 py-2">{product.minStock}</td>
                        <td className="px-2 py-2 flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => openDialog(product)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteProduct(product.id)}>🗑</Button>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedProducts.length === 0 && !loading && (
                    <tr>
                      <td colSpan={11} className="text-center py-8">
                        <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                          {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {/* Controles de paginação */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4">
                  <Button size="sm" variant="outline" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>«</Button>
                  <Button size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Anterior</Button>
                  <span className="px-2">Página {currentPage} de {totalPages}</span>
                  <Button size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Próxima</Button>
                  <Button size="sm" variant="outline" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>»</Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};