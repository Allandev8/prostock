import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Edit, Trash2, Key, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { User } from '@/types/auth';
import { signUp } from '@/lib/firebase';
import { storeUserRole } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';

interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'pdv';
}

interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'pdv';
  firebaseUid?: string;
  emailVerified?: boolean;
  createdAt?: string;
}

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<StoredUser[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<StoredUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    role: 'pdv'
  });

  // Função para carregar todos os usuários do localStorage
  const loadUsersFromStorage = () => {
    const storedRoles = localStorage.getItem('userRoles');
    const storedUsers = localStorage.getItem('userProfiles');
    
    let allUsers: StoredUser[] = [];
    
    // Carregar usuários master padrão
    const masterUsers: StoredUser[] = [
      {
        id: 'admin-master',
        name: 'Admin Sistema',
        email: 'admin@sistema.com',
        role: 'admin',
        firebaseUid: 'admin-uid-1',
        emailVerified: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'pdv-master',
        name: 'Operador PDV',
        email: 'pdv@sistema.com',
        role: 'pdv',
        firebaseUid: 'pdv-uid-2',
        emailVerified: true,
        createdAt: new Date().toISOString()
      }
    ];
    
    // Adicionar usuários master
    allUsers.push(...masterUsers);
    
    // Carregar usuários criados via formulário
    if (storedUsers) {
      try {
        const createdUsers = JSON.parse(storedUsers);
        allUsers.push(...createdUsers);
      } catch (error) {
        console.error('Erro ao carregar usuários criados:', error);
      }
    }
    
    // Atualizar roles baseado no localStorage
    if (storedRoles) {
      try {
        const roles = JSON.parse(storedRoles);
        allUsers = allUsers.map(user => ({
          ...user,
          role: roles[user.email] || user.role
        }));
      } catch (error) {
        console.error('Erro ao carregar roles:', error);
      }
    }
    
    setUsers(allUsers);
  };

  // Função para salvar usuários no localStorage
  const saveUsersToStorage = (updatedUsers: StoredUser[]) => {
    // Separar usuários master dos criados
    const createdUsers = updatedUsers.filter(user => 
      !['admin@sistema.com', 'pdv@sistema.com'].includes(user.email)
    );
    
    localStorage.setItem('userProfiles', JSON.stringify(createdUsers));
  };

  // Carregar usuários na inicialização
  useEffect(() => {
    loadUsersFromStorage();
  }, [currentUser]);

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'pdv'
    });
    setEditingUser(null);
    setShowPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingUser) {
        // Usuários PDV não podem alterar usuários admin
        if (currentUser?.role === 'pdv' && editingUser.role === 'admin') {
          toast({
            title: "Acesso negado",
            description: "Usuários PDV não podem editar usuários administradores",
            variant: "destructive"
          });
          return;
        }
        
        // Lógica para editar usuário
        const updatedUsers = users.map(user => 
          user.id === editingUser.id 
            ? { ...user, name: formData.name, role: formData.role }
            : user
        );
        setUsers(updatedUsers);
        saveUsersToStorage(updatedUsers);
        
        // Store updated role
        storeUserRole(formData.email, formData.role);
        
        toast({
          title: "Usuário atualizado",
          description: "Dados do usuário foram atualizados com sucesso"
        });
      } else {
        // Usuários PDV só podem criar usuários PDV
        if (currentUser?.role === 'pdv' && formData.role === 'admin') {
          toast({
            title: "Acesso negado",
            description: "Usuários PDV não podem criar usuários administradores",
            variant: "destructive"
          });
          return;
        }
        
        // Criar novo usuário
        const result = await signUp(formData.email, formData.password);
        
        if (result.success) {
          // Store the user role
          storeUserRole(formData.email, formData.role);
          
          const newUser: StoredUser = {
            id: result.user?.uid || Date.now().toString(),
            name: formData.name,
            email: formData.email,
            role: formData.role,
            firebaseUid: result.user?.uid,
            emailVerified: result.user?.emailVerified || false,
            createdAt: new Date().toISOString()
          };
          
          const updatedUsers = [...users, newUser];
          setUsers(updatedUsers);
          saveUsersToStorage(updatedUsers);
          
          toast({
            title: "Usuário criado",
            description: "Novo usuário foi criado com sucesso"
          });
        } else {
          toast({
            title: "Erro ao criar usuário",
            description: result.error || "Tente novamente",
            variant: "destructive"
          });
          return;
        }
      }

      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: "Erro no sistema",
        description: "Tente novamente em alguns instantes",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (user: StoredUser) => {
    // Usuários PDV não podem editar usuários admin
    if (currentUser?.role === 'pdv' && user.role === 'admin') {
      toast({
        title: "Acesso negado",
        description: "Usuários PDV não podem editar usuários administradores",
        variant: "destructive"
      });
      return;
    }
    
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role
    });
    setIsModalOpen(true);
  };

  const handleDelete = (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    
    if (!userToDelete) return;
    
    // Não permitir deletar usuários master
    if (['admin@sistema.com', 'pdv@sistema.com'].includes(userToDelete.email)) {
      toast({
        title: "Não é possível excluir",
        description: "Usuários master não podem ser excluídos",
        variant: "destructive"
      });
      return;
    }
    
    // Usuários PDV não podem excluir usuários admin
    if (currentUser?.role === 'pdv' && userToDelete.role === 'admin') {
      toast({
        title: "Acesso negado",
        description: "Usuários PDV não podem excluir usuários administradores",
        variant: "destructive"
      });
      return;
    }
    
    if (confirm(`Tem certeza que deseja excluir o usuário "${userToDelete.name}"?`)) {
      const updatedUsers = users.filter(user => user.id !== userId);
      setUsers(updatedUsers);
      saveUsersToStorage(updatedUsers);
      
      // Remover role do localStorage
      const storedRoles = localStorage.getItem('userRoles');
      if (storedRoles) {
        try {
          const roles = JSON.parse(storedRoles);
          delete roles[userToDelete.email];
          localStorage.setItem('userRoles', JSON.stringify(roles));
        } catch (error) {
          console.error('Erro ao remover role:', error);
        }
      }
      
      toast({
        title: "Usuário excluído",
        description: "Usuário foi removido do sistema"
      });
    }
  };

  const handleResetPassword = (user: StoredUser) => {
    // Em produção, implementar lógica de redefinição de senha
    toast({
      title: "Redefinir senha",
      description: `Email de redefinição enviado para ${user.email}`,
    });
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadUsersFromStorage();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="space-y-4">
      {currentUser?.role === 'pdv' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Permissões de Usuário PDV:</strong> Você pode visualizar todos os usuários, 
            criar novos usuários PDV, editar e excluir usuários PDV. Não é possível gerenciar usuários administradores.
          </p>
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Usuários do Sistema</h3>
          <p className="text-sm text-muted-foreground">
            {users.length} usuário(s) cadastrado(s)
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <UserPlus className="mr-2 h-4 w-4" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                </DialogTitle>
                <DialogDescription>
                  {editingUser 
                    ? 'Atualize os dados do usuário' 
                    : 'Preencha os dados para criar um novo usuário'
                  }
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome completo do usuário"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@exemplo.com"
                    required
                    disabled={!!editingUser}
                  />
                </div>

                {!editingUser && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Mínimo 6 caracteres"
                        required={!editingUser}
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="role">Função</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: 'admin' | 'pdv') => setFormData(prev => ({ ...prev, role: value }))}
                    disabled={currentUser?.role === 'pdv'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a função" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin" disabled={currentUser?.role === 'pdv'}>
                        Dashboard (Administrador)
                      </SelectItem>
                      <SelectItem value="pdv">PDV (Operador)</SelectItem>
                    </SelectContent>
                  </Select>
                  {currentUser?.role === 'pdv' && (
                    <p className="text-xs text-muted-foreground">
                      Usuários PDV só podem criar outros usuários PDV
                    </p>
                  )}
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading 
                      ? (editingUser ? 'Salvando...' : 'Criando...') 
                      : (editingUser ? 'Salvar' : 'Criar Usuário')
                    }
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                    {user.role === 'admin' ? 'Dashboard' : 'PDV'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.emailVerified ? 'default' : 'outline'}>
                    {user.emailVerified ? 'Ativo' : 'Pendente'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : '-'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(user)}
                      disabled={currentUser?.role === 'pdv' && user.role === 'admin'}
                      title={currentUser?.role === 'pdv' && user.role === 'admin' ? 'Usuários PDV não podem editar administradores' : ''}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResetPassword(user)}
                    >
                      <Key className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(user.id)}
                      className="text-destructive hover:text-destructive"
                      disabled={['admin@sistema.com', 'pdv@sistema.com'].includes(user.email) || (currentUser?.role === 'pdv' && user.role === 'admin')}
                      title={currentUser?.role === 'pdv' && user.role === 'admin' ? 'Usuários PDV não podem excluir administradores' : ''}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}; 