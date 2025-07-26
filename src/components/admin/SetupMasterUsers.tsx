import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { createMasterUsers } from '@/lib/firebase';
import { UserPlus, CheckCircle, XCircle } from 'lucide-react';

export const SetupMasterUsers: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const { toast } = useToast();

  const handleCreateMasterUsers = async () => {
    setIsLoading(true);
    setResults([]);

    try {
      const results = await createMasterUsers();
      setResults(results);

      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;

      if (successCount > 0) {
        toast({
          title: "Usuários criados com sucesso!",
          description: `${successCount} usuário(s) criado(s). ${errorCount > 0 ? `${errorCount} erro(s) encontrado(s).` : ''}`
        });
      } else {
        toast({
          title: "Erro ao criar usuários",
          description: "Verifique os detalhes abaixo",
          variant: "destructive"
        });
      }
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
              <li>• <strong>Admin:</strong> admin@sistema.com / admin123</li>
              <li>• <strong>PDV:</strong> pdv@sistema.com / pdv123</li>
            </ul>
          </div>

          <Button 
            onClick={handleCreateMasterUsers} 
            disabled={isLoading}
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

          {results.some(r => r.success) && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">✅ Usuários criados com sucesso!</h4>
              <p className="text-green-700 text-sm">
                Agora você pode fazer login com as credenciais acima. 
                Após o primeiro login, você pode excluir este componente de configuração.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 