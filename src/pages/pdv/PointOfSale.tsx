import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useInventory } from '@/contexts/InventoryContext';
import { SaleItem } from '@/types/product';
import { 
  ShoppingCart, 
  Search, 
  Minus, 
  Plus, 
  Trash2,
  CreditCard,
  Scan
} from 'lucide-react';

export const PointOfSale: React.FC = () => {
  const { products, getProductByBarcode, processSale } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredProducts = products.filter(product =>
    product.isActive && (
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode.includes(searchTerm)
    )
  );

  const cartTotal = cart.reduce((total, item) => total + item.totalPrice, 0);

  const addToCart = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product || product.stock === 0) return;

    const existingItem = cart.find(item => item.productId === productId);
    
    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        updateCartQuantity(productId, existingItem.quantity + 1);
      }
    } else {
      const newItem: SaleItem = {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.price,
        totalPrice: product.price
      };
      setCart(prev => [...prev, newItem]);
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

    if (newQuantity > product.stock) return;

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
    if (product && product.stock > 0) {
      addToCart(product.id);
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
      }
    }
  };

  const processSaleTransaction = async () => {
    if (cart.length === 0) return;

    setIsProcessing(true);
    
    const sale = {
      items: cart,
      total: cartTotal,
      userId: '2' // Mock PDV user ID
    };

    const success = processSale(sale);
    
    if (success) {
      setCart([]);
      setSearchTerm('');
      searchInputRef.current?.focus();
    }
    
    setIsProcessing(false);
  };

  const clearCart = () => {
    setCart([]);
    setSearchTerm('');
    searchInputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-muted/30 p-4">
      <div className="max-w-6xl mx-auto grid gap-6 lg:grid-cols-2">
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
                    <h3 className="font-medium text-foreground">{product.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-muted-foreground">
                        R$ {product.price.toFixed(2)}
                      </span>
                      <Badge variant={product.stock > product.minStock ? 'outline' : 'destructive'}>
                        {product.stock} em estoque
                      </Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    disabled={product.stock === 0}
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
                          R$ {item.unitPrice.toFixed(2)} cada
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
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
                            disabled={item.quantity >= (products.find(p => p.id === item.productId)?.stock || 0)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <div className="text-right min-w-20">
                          <p className="font-medium text-foreground">
                            R$ {item.totalPrice.toFixed(2)}
                          </p>
                        </div>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeFromCart(item.productId)}
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
                      R$ {cartTotal.toFixed(2)}
                    </span>
                  </div>
                  
                  <Button
                    onClick={processSaleTransaction}
                    disabled={isProcessing || cart.length === 0}
                    className="w-full"
                    size="lg"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    {isProcessing ? 'Processando...' : 'Finalizar Venda'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};