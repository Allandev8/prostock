import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Eye, EyeOff, UserPlus, LogIn } from 'lucide-react';
import { signUp } from '@/lib/firebase';

const Register: React.FC = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!form.name || !form.email || !form.password || !form.confirm) {
      setError('Preencha todos os campos.');
      return;
    }
    if (!validateEmail(form.email)) {
      setError('Email inválido.');
      return;
    }
    if (form.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    setIsLoading(true);
    const result = await signUp(form.email, form.password);
    setIsLoading(false);
    if (result.success) {
      setSuccess(true);
      setTimeout(() => navigate('/login'), 1500);
    } else {
      setError(result.error || 'Erro ao criar conta.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Criar Conta</CardTitle>
          <CardDescription>Preencha os dados para se cadastrar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Seu nome completo"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="seu@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmar Senha</Label>
              <Input
                id="confirm"
                type={showPassword ? 'text' : 'password'}
                value={form.confirm}
                onChange={e => setForm(prev => ({ ...prev, confirm: e.target.value }))}
                placeholder="Repita a senha"
                required
                minLength={6}
              />
            </div>
            {error && <div className="text-sm text-red-600 text-center">{error}</div>}
            {success && <div className="text-sm text-green-600 text-center">Conta criada com sucesso! Redirecionando...</div>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              <UserPlus className="mr-2 h-4 w-4" />
              {isLoading ? 'Criando...' : 'Criar Conta'}
            </Button>
          </form>
          <div className="mt-6 pt-4 border-t">
            <div className="text-center">
              <Link to="/login">
                <Button variant="link" className="text-sm">
                  <LogIn className="mr-2 h-4 w-4" />
                  Já tem conta? Entrar
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register; 