import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { RefreshCw, Trash2 } from 'lucide-react';

export const DebugRoles: React.FC = () => {
  const { user } = useAuth();
  const [storedRoles, setStoredRoles] = useState<any>(null);

  const refreshRoles = () => {
    const roles = localStorage.getItem('userRoles');
    if (roles) {
      try {
        setStoredRoles(JSON.parse(roles));
      } catch (error) {
        setStoredRoles({ error: 'Erro ao parsear roles' });
      }
    } else {
      setStoredRoles(null);
    }
  };

  const clearRoles = () => {
    localStorage.removeItem('userRoles');
    setStoredRoles(null);
  };

  React.useEffect(() => {
    refreshRoles();
  }, []);

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Debug - Roles do Sistema
          </CardTitle>
          <CardDescription>
            Informações de debug sobre os roles dos usuários
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={refreshRoles} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
            <Button onClick={clearRoles} variant="outline" size="sm">
              <Trash2 className="mr-2 h-4 w-4" />
              Limpar Roles
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Usuário Atual:</h4>
              {user ? (
                <div className="bg-muted p-3 rounded-lg">
                  <p><strong>Nome:</strong> {user.name}</p>
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Role:</strong> 
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="ml-2">
                      {user.role === 'admin' ? 'Administrador' : 'PDV'}
                    </Badge>
                  </p>
                  <p><strong>ID:</strong> {user.id}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">Nenhum usuário logado</p>
              )}
            </div>

            <div>
              <h4 className="font-semibold mb-2">Roles Armazenados (localStorage):</h4>
              {storedRoles ? (
                <div className="bg-muted p-3 rounded-lg">
                  <pre className="text-sm overflow-auto">
                    {JSON.stringify(storedRoles, null, 2)}
                  </pre>
                </div>
              ) : (
                <p className="text-muted-foreground">Nenhum role armazenado</p>
              )}
            </div>

            <div>
              <h4 className="font-semibold mb-2">localStorage Raw:</h4>
              <div className="bg-muted p-3 rounded-lg">
                <pre className="text-sm overflow-auto">
                  {localStorage.getItem('userRoles') || 'null'}
                </pre>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 