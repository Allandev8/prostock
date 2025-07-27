import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  AlertTriangle,
  DollarSign,
  Plus,
  ArrowRight
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id;

  const [products, setProducts] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  console.log('Dashboard: User info:', { user, userId });

  useEffect(() => {
    if (!userId) {
      console.log('Dashboard: No userId, returning');
      return;
    }

    console.log('Dashboard: Buscando produtos para usuário:', userId);

    // Buscar produtos do usuário
    const productsQuery = query(
      collection(db, `usuarios/${userId}/produtos`)
    );

    const unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('Dashboard: Produtos carregados:', productsData);
      console.log('Dashboard: Número de produtos:', productsData.length);
      setProducts(productsData);
      setLoading(false); // Definir loading como false quando produtos são carregados
    }, (error) => {
      console.error('Dashboard: Erro ao carregar produtos:', error);
      setLoading(false);
    });

    // Buscar movimentações do usuário
    const movementsQuery = query(
      collection(db, `usuarios/${userId}/movimentacoes`),
      limit(10)
    );

    const unsubscribeMovements = onSnapshot(movementsQuery, (snapshot) => {
      const movementsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('Dashboard: Movimentações carregadas:', movementsData);
      setMovements(movementsData);
      // Não definir loading como false aqui, já que foi definido no produtos
    }, (error) => {
      console.error('Dashboard: Erro ao carregar movimentações:', error);
      // Não definir loading como false aqui, já que foi definido no produtos
    });

    return () => {
      unsubscribeProducts();
      unsubscribeMovements();
    };
  }, [userId]);

  // Calcular métricas
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.isActive !== false).length;
  const lowStockProducts = products.filter(p => (p.estoqueAtual || 0) <= (p.estoqueMinimo || 5)).length;
  const totalValue = products.reduce((acc, p) => acc + ((p.estoqueAtual || 0) * (p.preco || 0)), 0);
  // Soma total de itens no estoque (quantidade de unidades)
  const totalItemsInStock = products.reduce((acc, p) => acc + (p.estoqueAtual || 0), 0);

  console.log('Dashboard: Métricas calculadas:', {
    totalProducts,
    activeProducts,
    lowStockProducts,
    totalValue,
    totalItemsInStock,
    products: products.map(p => ({ nome: p.nome, estoqueAtual: p.estoqueAtual }))
  });

  // Filtrar movimentações recentes
  const recentMovements = movements.slice(0, 5);

  const metrics = [
    {
      title: 'Total de Produtos',
      value: activeProducts.toString(),
      subtitle: `${totalProducts} cadastrados | ${totalItemsInStock} itens no estoque`,
      icon: Package,
      color: 'text-blue-600'
    },
    {
      title: 'Valor em Estoque',
      value: `R$ ${totalValue.toFixed(2)}`,
      subtitle: 'Valor total',
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      title: 'Estoque Baixo',
      value: lowStockProducts.toString(),
      subtitle: 'Produtos em alerta',
      icon: AlertTriangle,
      color: 'text-orange-600'
    },
    {
      title: 'Movimentações',
      value: movements.length.toString(),
      subtitle: 'Últimos 30 dias',
      icon: TrendingUp,
      color: 'text-purple-600'
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded"></div>
                <div className="h-4 w-4 bg-muted animate-pulse rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2"></div>
                <div className="h-3 w-20 bg-muted animate-pulse rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do seu sistema de estoque
          </p>
        </div>
        <Button onClick={() => navigate('/admin/products')} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {metric.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${metric.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{metric.value}</div>
                <p className="text-xs text-muted-foreground">{metric.subtitle}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Produtos com Estoque Baixo */}
        <Card>
          <CardHeader className="flex justify-between items-center">
            <CardTitle className="text-lg">Produtos com Estoque Baixo</CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/products')}>
              Ver Todos
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStockProducts > 0 ? (
                products
                  .filter(p => (p.estoqueAtual || 0) <= (p.estoqueMinimo || 5))
                  .slice(0, 5)
                  .map((product) => (
                    <div key={product.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {product.nome}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {product.categoria || 'Sem categoria'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-orange-600">
                          {(product.estoqueAtual || 0)} unidades
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Mín: {(product.estoqueMinimo || 5)}
                        </p>
                      </div>
                    </div>
                  ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum produto com estoque baixo
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Movimentações Recentes */}
        <Card>
          <CardHeader className="flex justify-between items-center">
            <CardTitle className="text-lg">Movimentações Recentes</CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/products')}>
              Ver Todas
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentMovements.length > 0 ? (
                recentMovements.map((movement) => {
                  const product = products.find(p => p.id === movement.produtoId);
                  return (
                    <div key={movement.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {product?.nome || 'Produto não encontrado'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {movement.observacao || movement.tipo}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${
                          movement.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {movement.tipo === 'entrada' ? '+' : '-'}{movement.quantidade}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {movement.createdAt?.toDate?.()?.toLocaleDateString() || 'Data não disponível'}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma movimentação registrada
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center gap-2"
              onClick={() => navigate('/admin/products')}
            >
              <Plus className="h-6 w-6" />
              <span>Adicionar Produto</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center gap-2"
              onClick={() => navigate('/pdv')}
            >
              <ShoppingCart className="h-6 w-6" />
              <span>Abrir PDV</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center gap-2"
              onClick={() => navigate('/admin/settings')}
            >
              <Package className="h-6 w-6" />
              <span>Gerenciar Categorias</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};