import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Package } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { adicionarProduto, db, popularCategoriasPadrao } from '@/lib/firebase';
import { collection, onSnapshot, getDocs, doc, getDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

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
    barcode: '',
    price: '',
    stock: '',
    minStock: '',
    categoryId: '',
    description: '',
    expiryDate: '',
    dataEntrada: '',
    notaFiscal: ''
  });
  const { toast } = useToast();

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
    const unsubscribe = onSnapshot(collection(db, `usuarios/${userId}/produtos`), (snapshot) => {
      const produtos = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.nome,
          barcode: data.codigoBarras,
          price: data.preco,
          stock: data.estoqueAtual,
          minStock: data.estoqueMinimo,
          categoryId: data.categoriaId || '',
          // fallback para categoria antiga
          category: data.categoria || '',
          description: data.descricao,
          expiryDate: data.dataValidade ? new Date(data.dataValidade) : undefined,
          dataEntrada: data.dataEntrada,
          notaFiscal: data.notaFiscal || ''
        };
      });
      setProducts(produtos);
    });
    return () => unsubscribe();
  }, [userId]);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode.includes(searchTerm) ||
    (product.categoryId && categorias.find(c => c.id === product.categoryId && c.nome.toLowerCase().includes(searchTerm.toLowerCase()))) ||
    (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const resetForm = () => {
    setFormData({
      name: '',
      barcode: '',
      price: '',
      stock: '',
      minStock: '',
      categoryId: '',
      description: '',
      expiryDate: '',
      dataEntrada: '',
      notaFiscal: ''
    });
    setEditingProduct(null);
  };

  const openDialog = (product?: any) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        barcode: product.barcode,
        price: product.price.toString(),
        stock: product.stock.toString(),
        minStock: product.minStock.toString(),
        categoryId: product.categoryId || '',
        description: product.description || '',
        expiryDate: product.expiryDate ? product.expiryDate.toISOString().split('T')[0] : '',
        dataEntrada: product.dataEntrada ? product.dataEntrada.split('T')[0] : '',
        notaFiscal: product.notaFiscal || ''
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    const productData = {
      nome: formData.name,
      codigoBarras: formData.barcode,
      preco: parseFloat(formData.price),
      estoqueAtual: parseInt(formData.stock),
      estoqueMinimo: parseInt(formData.minStock),
      categoriaId: formData.categoryId,
      categoria: categorias.find(c => c.id === formData.categoryId)?.nome || '',
      descricao: formData.description || undefined,
      dataValidade: formData.expiryDate ? formData.expiryDate : undefined,
      dataEntrada: formData.dataEntrada ? formData.dataEntrada : new Date().toISOString().split('T')[0],
      notaFiscal: formData.notaFiscal || undefined
    };
    await addDoc(collection(db, `usuarios/${userId}/produtos`), productData);
    setIsDialogOpen(false);
    resetForm();
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
                <Plus className="mr-2 h-4 w-4" />
                Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                </DialogTitle>
                <DialogDescription>
                  {editingProduct 
                    ? 'Atualize as informações do produto'
                    : 'Adicione um novo produto ao catálogo'
                  }
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="name">Nome do Produto</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nome do produto"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="barcode">Código de Barras</Label>
                    <Input
                      id="barcode"
                      value={formData.barcode}
                      onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                      placeholder="0000000000000"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="categoryId">Categoria</Label>
                    <select
                      id="categoryId"
                      value={formData.categoryId}
                      onChange={e => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                      required
                      className="w-full border rounded px-2 py-2"
                    >
                      <option value="">Selecione...</option>
                      {categorias.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="price">Preço (R$)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="stock">Estoque Atual</Label>
                    <Input
                      id="stock"
                      type="number"
                      min="0"
                      value={formData.stock}
                      onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                      placeholder="0"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="minStock">Estoque Mínimo</Label>
                    <Input
                      id="minStock"
                      type="number"
                      min="0"
                      value={formData.minStock}
                      onChange={(e) => setFormData(prev => ({ ...prev, minStock: e.target.value }))}
                      placeholder="0"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="expiryDate">Data de Validade</Label>
                    <Input
                      id="expiryDate"
                      type="date"
                      value={formData.expiryDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dataEntrada">Data de Entrada</Label>
                    <Input
                      id="dataEntrada"
                      type="date"
                      value={formData.dataEntrada}
                      onChange={(e) => setFormData(prev => ({ ...prev, dataEntrada: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="notaFiscal">Número da Nota Fiscal</Label>
                    <Input
                      id="notaFiscal"
                      value={formData.notaFiscal}
                      onChange={(e) => setFormData(prev => ({ ...prev, notaFiscal: e.target.value }))}
                      placeholder="Número da nota fiscal"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descrição opcional do produto"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingProduct ? 'Atualizar' : 'Adicionar'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
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
          <div className="space-y-4">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <input
                  type="checkbox"
                  checked={selectedProducts.includes(product.id)}
                  onChange={() => handleSelectProduct(product.id)}
                  className="mr-3"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-medium text-foreground">{product.name}</h3>
                    <Badge variant="outline">
                      {product.categoryId ? (categorias.find(c => c.id === product.categoryId)?.nome || 'Categoria') : (product.category || 'Categoria')}
                    </Badge>
                    {product.stock <= product.minStock && (
                      <Badge variant="destructive">Estoque Baixo</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Código:</span> {product.barcode}
                    </div>
                    <div>
                      <span className="font-medium">Preço:</span> R$ {product.price.toFixed(2)}
                    </div>
                    <div>
                      <span className="font-medium">Estoque:</span> {product.stock} unidades
                    </div>
                    <div>
                      <span className="font-medium">Min:</span> {product.minStock}
                    </div>
                  </div>
                  {product.expiryDate && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Validade: {product.expiryDate.toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDialog(product)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteProduct(product.id)}
                  >
                    🗑
                  </Button>
                </div>
              </div>
            ))}
            {filteredProducts.length === 0 && (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};