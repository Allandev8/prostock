import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, LogIn, Settings } from 'lucide-react';

export const LoginForm: React.FC = () => {
  const [credentials, setCredentials] = useState({ 
    email: '', 
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldError, setFieldError] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/admin';

  // Validação simples de email
  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFieldError({});
    setFormError(null);

    let hasError = false;
    if (!validateEmail(credentials.email)) {
      setFieldError(prev => ({ ...prev, email: 'Email inválido' }));
      hasError = true;
    }
    if (!credentials.password) {
      setFieldError(prev => ({ ...prev, password: 'Senha obrigatória' }));
      hasError = true;
    }
    if (hasError) {
      setIsLoading(false);
      return;
    }

    try {
      const success = await login({ email: credentials.email, password: credentials.password });
      if (success) {
        navigate(from, { replace: true });
      } else {
        setFormError('Email ou senha incorretos.');
      }
    } catch (error) {
      setFormError('Erro no sistema. Tente novamente em alguns instantes.');
      toast({
        title: 'Erro no sistema',
        description: 'Tente novamente em alguns instantes',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isEmailValid = validateEmail(credentials.email);
  const isFormValid = Boolean(credentials.email) && Boolean(credentials.password) && isEmailValid;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">StockPro</CardTitle>
          <CardDescription>
            Sistema de Controle de Estoque e PDV
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={credentials.email}
                onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
                required
                autoComplete="username"
                aria-invalid={!!fieldError.email}
                className={fieldError.email ? 'border-red-500' : ''}
              />
              {fieldError.email && (
                <span className="text-xs text-red-500">{fieldError.email}</span>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Sua senha"
                  value={credentials.password}
                  onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                  required
                  autoComplete="current-password"
                  aria-invalid={!!fieldError.password}
                  className={fieldError.password ? 'border-red-500' : ''}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldError.password && (
                <span className="text-xs text-red-500">{fieldError.password}</span>
              )}
            </div>
            {formError && (
              <div className="text-sm text-red-600 text-center">{formError}</div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading || !isFormValid}>
              <LogIn className="mr-2 h-4 w-4" />
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
          <div className="mt-6 pt-4 border-t">
            <div className="text-center">
              <Link to="/setup">
                <Button variant="link" className="text-sm">
                  <Settings className="mr-2 h-4 w-4" />
                  Primeira vez? Configurar usuários
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="link" className="text-sm text-primary">
                  Criar Conta
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};