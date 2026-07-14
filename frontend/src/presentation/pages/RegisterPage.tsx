import { Lock, MapPinned, Route, ShieldCheck, Store, Truck, UserPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import loginHero from '../../../assets/puyo-express-login-hero.png';
import { useAuth, type UserRole } from '../../application/auth/AuthProvider';
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
  const [role, setRole] = useState<UserRole>('ROLE_CUSTOMER');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const success = await register(username, email, password, role);

      if (success) {
        notify('Registro exitoso. Ahora puedes iniciar sesión.', 'emerald');
        onNavigateToLogin();
      } else {
        notify('Hubo un problema con el registro. Verifica tus datos.', 'warning');
      }
    } catch {
      notify('Error de conexión con el servidor.', 'warning');
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
            
            <Input
              label="Nombre de usuario"
              onChange={(event) => setUsername(event.target.value)}
              required
              minLength={3}
              maxLength={50}
              type="text"
              value={username}
            />
            <Input
              label="Correo electrónico"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
            <Input
              label="Contraseña"
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              type="password"
              value={password}
            />
            
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">Rol</label>
              <select
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
              >
                <option value="ROLE_CUSTOMER">Cliente</option>
                <option value="ROLE_DRIVER">Repartidor</option>
                <option value="ROLE_RESTAURANT">Restaurante</option>
              </select>
            </div>

            <Button
              className="mt-6 w-full shadow-lg shadow-emerald-700/20 hover:shadow-emerald-700/30"
              icon={<UserPlus className="h-4 w-4" />}
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Registrando...' : 'Registrarse'}
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
