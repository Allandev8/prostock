import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Users, Settings as SettingsIcon, UserPlus, Edit, Trash2, Key } from 'lucide-react';
import { User } from '@/types/auth';
import { UserManagement } from '@/components/admin/UserManagement';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { resetarSistema, signIn } from '@/lib/firebase';

export const Settings: React.FC = () => {
  const { toast } = useToast();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie as configurações do sistema e usuários
        </p>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Gerenciar Usuários
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            Sistema
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gestão de Usuários
              </CardTitle>
              <CardDescription>
                Crie, edite e gerencie usuários do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Configurações do Sistema
              </CardTitle>
              <CardDescription>
                Configurações gerais do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SystemActions />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const defaultSettings = {
  companyName: '',
  razaoSocial: '',
  cnpjCpf: '',
  email: '',
  phone: '',
  address: '',
};

const SystemSettingsForm: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = React.useState(defaultSettings);
  const [saved, setSaved] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Carregar dados do Firestore ao abrir o modal
  React.useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    getDoc(doc(db, `usuarios/${user.id}/empresa`, 'configuracoes'))
      .then((docSnap) => {
        if (docSnap.exists()) {
          setSettings({ ...defaultSettings, ...docSnap.data() });
        }
      })
      .catch(() => setError('Erro ao carregar dados da empresa.'))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
    setSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      await setDoc(doc(db, `usuarios/${user.id}/empresa`, 'configuracoes'), settings, { merge: true });
      setSaved(true);
    } catch (err) {
      setError('Erro ao salvar dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mt-4">
      <div>
        <label className="block font-medium mb-1">Nome Fantasia</label>
        <input
          type="text"
          name="companyName"
          value={settings.companyName}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition"
          required
          disabled={loading}
        />
      </div>
      <div>
        <label className="block font-medium mb-1">Razão Social</label>
        <input
          type="text"
          name="razaoSocial"
          value={settings.razaoSocial}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition"
          required
          disabled={loading}
        />
      </div>
      <div>
        <label className="block font-medium mb-1">CNPJ/CPF</label>
        <input
          type="text"
          name="cnpjCpf"
          value={settings.cnpjCpf}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition"
          required
          disabled={loading}
        />
      </div>
      <div>
        <label className="block font-medium mb-1">E-mail de contato</label>
        <input
          type="email"
          name="email"
          value={settings.email}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition"
          required
          disabled={loading}
        />
      </div>
      <div>
        <label className="block font-medium mb-1">Telefone</label>
        <input
          type="tel"
          name="phone"
          value={settings.phone}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition"
          disabled={loading}
        />
      </div>
      <div>
        <label className="block font-medium mb-1">Endereço</label>
        <input
          type="text"
          name="address"
          value={settings.address}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition"
          disabled={loading}
        />
      </div>
      <button type="submit" className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-blue-700 transition" disabled={loading}>
        {loading ? 'Salvando...' : 'Salvar configurações'}
      </button>
      {saved && <div className="text-green-600 font-medium mt-2">Configurações salvas no sistema!</div>}
      {error && <div className="text-red-600 font-medium mt-2">{error}</div>}
    </form>
  );
};

const CompanyDataModalTrigger: React.FC = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition mb-4">
          Dados da Empresa
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle>Dados da Empresa</DialogTitle>
        </DialogHeader>
        <SystemSettingsForm />
      </DialogContent>
    </Dialog>
  );
};

// Adicionar botão e modal de reset ao lado do botão Dados da Empresa
const SystemActions: React.FC = () => {
  const [resetOpen, setResetOpen] = React.useState(false);
  return (
    <div className="flex gap-2">
      <CompanyDataModalTrigger />
      <button
        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition mb-4"
        onClick={() => setResetOpen(true)}
      >
        Resetar Sistema
      </button>
      <ResetSystemModal open={resetOpen} setOpen={setResetOpen} />
    </div>
  );
};

// Substituir <CompanyDataModalTrigger /> por <SystemActions /> na aba Sistema
// ...
<CardContent>
  <SystemActions />
</CardContent>
// ...

// Modal de reset do sistema
const ResetSystemModal: React.FC<{ open: boolean, setOpen: (v: boolean) => void }> = ({ open, setOpen }) => {
  const { user } = useAuth();
  const [email, setEmail] = React.useState(user?.email || '');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      // Autentica o usuário
      const authResult = await signIn(email, password);
      if (!authResult.success) {
        setError('E-mail ou senha incorretos.');
        setLoading(false);
        return;
      }
      // Reseta o sistema
      const result = await resetarSistema(user!.id);
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || 'Erro ao resetar sistema.');
      }
    } catch (err) {
      setError('Erro ao resetar sistema.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle>Resetar Sistema</DialogTitle>
        </DialogHeader>
        <div className="mb-4 text-sm text-red-700">
          <p><b>Atenção:</b> Esta ação irá apagar <b>todos os produtos, categorias, movimentações, vendas, contas e fluxo de caixa</b> da sua conta. Esta ação é irreversível!</p>
          <ul className="list-disc ml-5 mt-2">
            <li>Produtos</li>
            <li>Categorias</li>
            <li>Movimentações</li>
            <li>Vendas</li>
            <li>Contas</li>
            <li>Fluxo de Caixa</li>
            <li>Histórico de Movimentações do Caixa</li>
          </ul>
          <p className="mt-2">Sua conta de acesso <b>não será apagada</b>.</p>
        </div>
        {success ? (
          <div className="text-green-600 font-medium">Sistema resetado com sucesso!</div>
        ) : (
          <form onSubmit={handleReset} className="space-y-3">
            <div>
              <label className="block font-medium mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                required
                disabled={loading}
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                required
                disabled={loading}
              />
            </div>
            <button type="submit" className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition w-full" disabled={loading}>
              {loading ? 'Resetando...' : 'Confirmar e Resetar Sistema'}
            </button>
            {error && <div className="text-red-600 font-medium mt-2">{error}</div>}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}; 