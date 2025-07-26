import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useInventory } from '@/contexts/InventoryContext';
import { 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  AlertTriangle,
  DollarSign
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { products, sales, stockMovements } = useInventory();

  // Calculate metrics
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.isActive).length;
  const lowStockProducts = products.filter(p => p.stock <= p.minStock).length;
  const totalSales = sales.length;
  const totalRevenue = sales.reduce((acc, sale) => acc + sale.total, 0);
  const todaySales = sales.filter(sale => {
    const today = new Date();
    return sale.createdAt.toDateString() === today.toDateString();
  }).length;

  const metrics = [
    {
      title: 'Total de Produtos',
      value: activeProducts.toString(),
      subtitle: `${totalProducts} cadastrados`,
      icon: Package,
      color: 'text-primary'
    },
    {
      title: 'Vendas Hoje',
      value: todaySales.toString(),
      subtitle: `${totalSales} total`,
      icon: ShoppingCart,
      color: 'text-success'
    },
    {
      title: 'Receita Total',
      value: `R$ ${totalRevenue.toFixed(2)}`,
      subtitle: 'Todas as vendas',
      icon: DollarSign,
      color: 'text-primary'
    },
    {
      title: 'Estoque Baixo',
      value: lowStockProducts.toString(),
      subtitle: 'Produtos em alerta',
      icon: AlertTriangle,
      color: 'text-warning'
    }
  ];

  const recentMovements = stockMovements.slice(0, 5);
  const recentSales = sales.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral do seu sistema de estoque e vendas
        </p>
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
        {/* Recent Stock Movements */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Movimentações Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentMovements.length > 0 ? (
                recentMovements.map((movement) => {
                  const product = products.find(p => p.id === movement.productId);
                  return (
                    <div key={movement.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {product?.name || 'Produto não encontrado'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {movement.reason}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${
                          movement.type === 'entry' ? 'text-success' : 'text-destructive'
                        }`}>
                          {movement.type === 'entry' ? '+' : '-'}{movement.quantity}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {movement.createdAt.toLocaleDateString()}
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

        {/* Recent Sales */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Vendas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentSales.length > 0 ? (
                recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Venda #{sale.id.slice(-6)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sale.items.length} {sale.items.length === 1 ? 'item' : 'itens'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-success">
                        R$ {sale.total.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sale.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma venda registrada
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts > 0 && (
        <Card className="border-warning">
          <CardHeader>
            <CardTitle className="text-lg flex items-center text-warning">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Alerta de Estoque Baixo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {products
                .filter(p => p.stock <= p.minStock)
                .slice(0, 5)
                .map((product) => (
                  <div key={product.id} className="flex items-center justify-between py-1">
                    <span className="text-sm text-foreground">{product.name}</span>
                    <span className="text-sm text-warning font-medium">
                      {product.stock} unidades
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};