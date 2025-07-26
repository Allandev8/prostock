import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { createMasterUsers } from '@/lib/firebase';
import { UserPlus, CheckCircle, XCircle } from 'lucide-react';

// Tipagem forte para o resultado da criação dos usuários master
interface MasterUserResult {
  email: string;
  success: boolean;
  error?: string;
}

// Função mock para checar se usuários master já existem (poderia ser aprimorada para checar no Firebase)
const checkMasterUsersExist = () => {
  const storedRoles = localStorage.getItem('userRoles');
  if (!storedRoles) return false;
  try {
    const roles = JSON.parse(storedRoles);
    return (
      roles['admin@sistema.com'] === 'admin' &&
      roles['pdv@sistema.com'] === 'pdv'
    );
  } catch {
    return false;
  }
};

export const SetupMasterUsers: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<MasterUserResult[]>([]);
  const [isConfigured, setIsConfigured] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsConfigured(checkMasterUsersExist());
  }, [results]);

  const handleCreateMasterUsers = async () => {
    const confirmed = window.confirm(
      'Tem certeza que deseja criar os usuários master? Esta ação só deve ser executada uma vez.'
    );
    if (!confirmed) return;
    setIsLoading(true);
    setResults([]);
    try {
      const results = await createMasterUsers();
      setResults(results);
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;
      if (successCount > 0) {
        toast({
          title: 'Usuários criados com sucesso!',
          description: `${successCount} usuário(s) criado(s). ${errorCount > 0 ? `${errorCount} erro(s) encontrado(s).` : ''}`
        });
      } else {
        toast({
          title: 'Erro ao criar usuários',
          description: 'Verifique os detalhes abaixo',
          variant: 'destructive'
        });
      }
      setIsConfigured(checkMasterUsersExist());
    } catch (error: any) {
      toast({
        title: 'Erro no sistema',
        description: error?.message || 'Tente novamente em alguns instantes',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuração Inicial</h1>
        <p className="text-muted-foreground">
          Crie os usuários master do sistema
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Usuários Master
          </CardTitle>
          <CardDescription>
            Crie os usuários iniciais do sistema para poder fazer login
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Usuários que serão criados:</h4>
            <ul className="space-y-1 text-sm">
              {/* ATENÇÃO: Por segurança, altere as credenciais padrão após o setup inicial! */}
              <li>• <strong>Admin:</strong> admin@sistema.com / admin123</li>
              <li>• <strong>PDV:</strong> pdv@sistema.com / pdv123</li>
            </ul>
          </div>
          {isConfigured && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">Usuários master já configurados!</h4>
              <p className="text-green-700 text-sm">
                Os usuários master já existem no sistema.<br />
                <strong>Por segurança, remova este componente do projeto após o setup inicial.</strong>
              </p>
            </div>
          )}
          <Button
            onClick={handleCreateMasterUsers}
            disabled={isLoading || isConfigured}
            className="w-full"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            {isLoading ? 'Criando usuários...' : 'Criar Usuários Master'}
          </Button>
          {results.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold">Resultado:</h4>
              {results.map((result, index) => (
                <div key={index} className="flex items-center gap-2 p-2 rounded border">
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">
                    <strong>{result.email}:</strong> {result.success ? 'Criado com sucesso' : result.error}
                  </span>
                </div>
              ))}
            </div>
          )}
          {results.some(r => r.success) && !isConfigured && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">✅ Usuários criados com sucesso!</h4>
              <p className="text-green-700 text-sm">
                Agora você pode fazer login com as credenciais acima. <br />
                <strong>Após o primeiro login, remova este componente de configuração do projeto.</strong>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 