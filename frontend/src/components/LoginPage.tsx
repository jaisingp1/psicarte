import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, UserPlus, Mail, Lock, User, Phone, AlertCircle, CheckCircle2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { PsicarteLogo } from './PsicarteLogo';
import { User as UserType } from '../types';

interface LoginPageProps {
  onLogin: (user: UserType) => void;
  onBack: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onBack }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const API = '/api';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onLogin(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (registerPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (registerPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: registerPassword, name, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess('Cuenta creada exitosamente. Puedes iniciar sesión.');
      setMode('login');
      setEmail(email);
      setPassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-base p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <PsicarteLogo size="lg" />
        </div>

        <div className="bg-white border border-secondary/10 rounded-sm shadow-sm overflow-hidden">
          <div className="flex border-b border-secondary/10">
            <button
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              className={`flex-1 py-4 text-xs uppercase tracking-widest font-bold transition-all cursor-pointer ${
                mode === 'login'
                  ? 'text-primary border-b-2 border-primary bg-white'
                  : 'text-text-muted hover:text-secondary bg-bg-base/20'
              }`}
            >
              <LogIn className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              Iniciar Sesión
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
              className={`flex-1 py-4 text-xs uppercase tracking-widest font-bold transition-all cursor-pointer ${
                mode === 'register'
                  ? 'text-primary border-b-2 border-primary bg-white'
                  : 'text-text-muted hover:text-secondary bg-bg-base/20'
              }`}
            >
              <UserPlus className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              Crear Cuenta
            </button>
          </div>

          <div className="p-8">
            <button onClick={onBack} className="text-[10px] uppercase tracking-widest font-bold text-text-muted hover:text-secondary mb-6 flex items-center gap-1 cursor-pointer">
              <ArrowLeft className="w-3 h-3" />
              Volver al sitio
            </button>

            <AnimatePresence mode="wait">
              {mode === 'login' ? (
                <motion.form
                  key="login"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  onSubmit={handleLogin}
                  className="space-y-5"
                >
                  <h3 className="font-serif text-2xl font-light text-secondary">Accede a tu cuenta</h3>

                  <div>
                    <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5">
                      <Mail className="w-3 h-3 inline mr-1" />
                      Email
                    </label>
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="tu@email.cl"
                      className="w-full px-3.5 py-2.5 text-sm border border-secondary/20 rounded-sm focus:border-primary focus:outline-none bg-[#FAF8F5]/30 focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5">
                      <Lock className="w-3 h-3 inline mr-1" />
                      Contraseña
                    </label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 pr-10 text-sm border border-secondary/20 rounded-sm focus:border-primary focus:outline-none bg-[#FAF8F5]/30 focus:ring-1 focus:ring-primary"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-text-muted hover:text-secondary cursor-pointer">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-sm text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <button type="submit" disabled={loading}
                    className="w-full py-4 bg-primary hover:bg-primary-dark text-white font-bold text-xs uppercase tracking-widest rounded-sm transition-all border border-primary cursor-pointer disabled:opacity-50"
                  >
                    {loading ? 'Ingresando...' : 'Ingresar'}
                  </button>

                  <div className="text-center text-[10px] text-text-muted">
                    ¿No tienes cuenta?{' '}
                    <button type="button" onClick={() => { setMode('register'); setError(''); }} className="text-primary font-bold hover:underline cursor-pointer">
                      Crear cuenta
                    </button>
                  </div>
                </motion.form>
              ) : (
                <motion.form
                  key="register"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onSubmit={handleRegister}
                  className="space-y-5"
                >
                  <h3 className="font-serif text-2xl font-light text-secondary">Crear cuenta nueva</h3>
                  <p className="text-xs text-text-muted -mt-3">Los nuevos usuarios se crean con perfil "usuario". El administrador puede cambiar tu rol después.</p>

                  <div>
                    <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5">
                      <User className="w-3 h-3 inline mr-1" />
                      Nombre Completo
                    </label>
                    <input type="text" required value={name} onChange={e => setName(e.target.value)}
                      placeholder="Tu nombre"
                      className="w-full px-3.5 py-2.5 text-sm border border-secondary/20 rounded-sm focus:border-primary focus:outline-none bg-[#FAF8F5]/30 focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5">
                      <Mail className="w-3 h-3 inline mr-1" />
                      Email
                    </label>
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="tu@email.cl"
                      className="w-full px-3.5 py-2.5 text-sm border border-secondary/20 rounded-sm focus:border-primary focus:outline-none bg-[#FAF8F5]/30 focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5">
                      <Phone className="w-3 h-3 inline mr-1" />
                      Teléfono
                    </label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                      placeholder="+56912345678"
                      className="w-full px-3.5 py-2.5 text-sm border border-secondary/20 rounded-sm focus:border-primary focus:outline-none bg-[#FAF8F5]/30 focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5">
                      <Lock className="w-3 h-3 inline mr-1" />
                      Contraseña
                    </label>
                    <input type="password" required value={registerPassword} onChange={e => setRegisterPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full px-3.5 py-2.5 text-sm border border-secondary/20 rounded-sm focus:border-primary focus:outline-none bg-[#FAF8F5]/30 focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5">
                      <Lock className="w-3 h-3 inline mr-1" />
                      Confirmar Contraseña
                    </label>
                    <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repite la contraseña"
                      className="w-full px-3.5 py-2.5 text-sm border border-secondary/20 rounded-sm focus:border-primary focus:outline-none bg-[#FAF8F5]/30 focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-sm text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-sm text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      {success}
                    </div>
                  )}

                  <button type="submit" disabled={loading}
                    className="w-full py-4 bg-primary hover:bg-primary-dark text-white font-bold text-xs uppercase tracking-widest rounded-sm transition-all border border-primary cursor-pointer disabled:opacity-50"
                  >
                    {loading ? 'Creando...' : 'Crear Cuenta'}
                  </button>

                  <div className="text-center text-[10px] text-text-muted">
                    ¿Ya tienes cuenta?{' '}
                    <button type="button" onClick={() => { setMode('login'); setError(''); }} className="text-primary font-bold hover:underline cursor-pointer">
                      Iniciar sesión
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-4 bg-white/50 border border-secondary/10 rounded-sm p-4 text-[10px] text-text-muted text-center">
          <strong className="text-secondary">Demo:</strong> admin@psicarte.cl / admin123 • profesional: ivan@psicarte.cl / ivan123 • usuario: usuario@test.cl / usuario123
        </div>
      </div>
    </div>
  );
};
