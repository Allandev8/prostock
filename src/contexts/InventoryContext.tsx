import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, StockMovement, Sale } from '@/types/product';
import { useToast } from '@/hooks/use-toast';

interface InventoryContextType {
  products: Product[];
  stockMovements: StockMovement[];
  sales: Sale[];
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  adjustStock: (productId: string, quantity: number, reason: string) => void;
  processSale: (sale: Omit<Sale, 'id' | 'createdAt'>) => boolean;
  getProductByBarcode: (barcode: string) => Product | undefined;
  getProductById: (id: string) => Product | undefined;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

// Mock initial data
const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Coca-Cola 2L',
    barcode: '7894900011517',
    price: 8.50,
    stock: 50,
    minStock: 10,
    category: 'Bebidas',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    name: 'Pão de Açúcar 500g',
    barcode: '7891000100127',
    price: 4.80,
    stock: 25,
    minStock: 5,
    expiryDate: new Date(2024, 11, 15),
    category: 'Padaria',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const { toast } = useToast();

  const addProduct = (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newProduct: Product = {
      ...productData,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setProducts(prev => [...prev, newProduct]);
    toast({
      title: "Produto adicionado",
      description: `${newProduct.name} foi adicionado ao estoque.`
    });
  };

  const updateProduct = (id: string, productData: Partial<Product>) => {
    setProducts(prev => prev.map(product => 
      product.id === id 
        ? { ...product, ...productData, updatedAt: new Date() }
        : product
    ));
    toast({
      title: "Produto atualizado",
      description: "As informações do produto foram atualizadas."
    });
  };

  const adjustStock = (productId: string, quantity: number, reason: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const previousStock = product.stock;
    const newStock = Math.max(0, previousStock + quantity);

    setProducts(prev => prev.map(p => 
      p.id === productId 
        ? { ...p, stock: newStock, updatedAt: new Date() }
        : p
    ));

    const movement: StockMovement = {
      id: Date.now().toString(),
      productId,
      type: quantity > 0 ? 'entry' : quantity < 0 ? 'exit' : 'adjustment',
      quantity: Math.abs(quantity),
      previousStock,
      newStock,
      reason,
      userId: '1', // Mock user ID
      createdAt: new Date()
    };

    setStockMovements(prev => [movement, ...prev]);
    
    toast({
      title: "Estoque ajustado",
      description: `${product.name}: ${previousStock} → ${newStock} unidades`
    });
  };

  const processSale = (saleData: Omit<Sale, 'id' | 'createdAt'>): boolean => {
    // Check if all items are available
    for (const item of saleData.items) {
      const product = products.find(p => p.id === item.productId);
      if (!product || product.stock < item.quantity) {
        toast({
          title: "Estoque insuficiente",
          description: `Não há estoque suficiente para ${item.productName}`,
          variant: "destructive"
        });
        return false;
      }
    }

    // Process the sale
    const sale: Sale = {
      ...saleData,
      id: Date.now().toString(),
      createdAt: new Date()
    };

    // Update stock for each item
    saleData.items.forEach(item => {
      adjustStock(item.productId, -item.quantity, `Venda #${sale.id}`);
    });

    setSales(prev => [sale, ...prev]);
    
    toast({
      title: "Venda processada",
      description: `Venda de R$ ${sale.total.toFixed(2)} realizada com sucesso!`
    });

    return true;
  };

  const getProductByBarcode = (barcode: string): Product | undefined => {
    return products.find(p => p.barcode === barcode && p.isActive);
  };

  const getProductById = (id: string): Product | undefined => {
    return products.find(p => p.id === id);
  };

  return (
    <InventoryContext.Provider value={{
      products,
      stockMovements,
      sales,
      addProduct,
      updateProduct,
      adjustStock,
      processSale,
      getProductByBarcode,
      getProductById
    }}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};