import { ShoppingBag, Truck, UserPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import loginHero from '../../../assets/puyo-express-login-hero.png';
import {
  useAuth,
  type PublicRegistrationRole,
  type RegistrationField,
} from '../../application/auth/AuthProvider';
import { useToast } from '../../application/toast/ToastProvider';
import { Button } from '../components/atoms/Button';
import { Card } from '../components/atoms/Card';
import { Input } from '../components/atoms/Field';

export function RegisterPage({ onNavigateToLogin }: { onNavigateToLogin: () => void }) {
  const { register } = useAuth();
  const { notify } = useToast();
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<PublicRegistrationRole>('CUSTOMER');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<RegistrationField, string>>>({});

  const clearFieldError = (field: RegistrationField) => {
    setFormError('');
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError('');
    setFieldErrors({});

    try {
      const result = await register(username.trim(), email.trim(), password, role);

      if (result.success) {
        notify('Registro exitoso. Ahora puedes iniciar sesión.', 'success');
        onNavigateToLogin();
      } else {
        const message = result.message ?? 'Hubo un problema con el registro.';
        setFormError(message);
        setFieldErrors(result.fieldErrors ?? {});
        notify(message, 'warning');
      }
    } catch {
      const message = 'Error de conexión con el servidor.';
      setFormError(message);
      notify(message, 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07130f] text-white flex items-center justify-center">
      <img
        alt=""
        aria-hidden="true"
        className="login-hero-pan absolute inset-0 h-full w-full object-cover opacity-85"
        src={loginHero}
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.6)_0%,rgba(0,0,0,0.4)_42%,rgba(0,0,0,0.85)_100%)]" />

      <div className="relative z-10 w-full max-w-[420px] px-4 py-8">
        <Card className="login-fade-up border-white/20 bg-white/90 p-5 text-slate-900 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="mb-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-lg shadow-emerald-700/25">
                <UserPlus className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-black">Crear cuenta</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Únete a Puyo Express y empieza a gestionar pedidos.
              </p>
            </div>

            <fieldset>
              <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                Tipo de cuenta
              </legend>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm font-bold transition ${
                    role === 'CUSTOMER'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-100'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300'
                  }`}
                  onClick={() => {
                    setRole('CUSTOMER');
                    clearFieldError('role');
                  }}
                  type="button"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Cliente
                </button>
                <button
                  className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm font-bold transition ${
                    role === 'DRIVER'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-100'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300'
                  }`}
                  onClick={() => {
                    setRole('DRIVER');
                    clearFieldError('role');
                  }}
                  type="button"
                >
                  <Truck className="h-4 w-4" />
                  Repartidor
                </button>
              </div>
            </fieldset>

            {formError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700" role="alert">
                {formError}
              </div>
            ) : null}
            
            <Input
              error={fieldErrors.username}
              label="Nombre de usuario"
              onChange={(event) => {
                setUsername(event.target.value);
                clearFieldError('username');
              }}
              required
              autoComplete="username"
              minLength={3}
              maxLength={50}
              type="text"
              value={username}
            />
            <Input
              error={fieldErrors.email}
              label="Correo electrónico"
              onChange={(event) => {
                setEmail(event.target.value);
                clearFieldError('email');
              }}
              required
              autoComplete="email"
              maxLength={100}
              type="email"
              value={email}
            />
            <Input
              error={fieldErrors.password}
              label="Contraseña"
              onChange={(event) => {
                setPassword(event.target.value);
                clearFieldError('password');
              }}
              required
              autoComplete="new-password"
              minLength={12}
              maxLength={120}
              type="password"
              value={password}
            />
            <p className="-mt-2 text-xs text-slate-500">Usa entre 12 y 120 caracteres.</p>
            
            <Button
              className="mt-6 w-full shadow-lg shadow-emerald-700/20 hover:shadow-emerald-700/30"
              icon={<UserPlus className="h-4 w-4" />}
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Registrando...' : `Crear cuenta de ${role === 'DRIVER' ? 'repartidor' : 'cliente'}`}
            </Button>
            
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
              >
                ¿Ya tienes cuenta? Inicia sesión aquí
              </button>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}
