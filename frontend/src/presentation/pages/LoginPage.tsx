import { Lock, MapPinned, Route, ShieldCheck, Store, Truck, User } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import loginHero from '../../../assets/puyo-express-login-hero.png';
import { useAuth } from '../../application/auth/AuthProvider';
import { useToast } from '../../application/toast/ToastProvider';
import { Button } from '../components/atoms/Button';
import { Card } from '../components/atoms/Card';
import { Input } from '../components/atoms/Field';

export function LoginPage() {
  const { login } = useAuth();
  const { notify } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const success = await login(username, password);

      if (!success) {
        notify('Credenciales incorrectas. Verifica tu usuario y contraseña.', 'warning');
      }
    } catch {
      notify('Error de conexión con el servidor.', 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07130f] text-white">
      <img
        alt=""
        aria-hidden="true"
        className="login-hero-pan absolute inset-0 h-full w-full object-cover opacity-85"
        src={loginHero}
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.44)_0%,rgba(0,0,0,0.2)_42%,rgba(0,0,0,0.72)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_78%,rgba(245,158,11,0.12),transparent_32%)]" />

      <div className="pointer-events-none absolute left-[12%] top-[21%] hidden h-3 w-3 rounded-full bg-amber-300 shadow-[0_0_30px_rgba(252,211,77,0.9)] login-route-pulse md:block" />
      <div className="pointer-events-none absolute bottom-[23%] left-[36%] hidden h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_26px_rgba(110,231,183,0.85)] login-route-pulse md:block [animation-delay:850ms]" />
      <div className="pointer-events-none absolute right-[35%] top-[31%] hidden h-2 w-2 rounded-full bg-red-300 shadow-[0_0_24px_rgba(252,165,165,0.85)] login-route-pulse lg:block [animation-delay:1400ms]" />

      <div className="relative z-10 flex min-h-screen flex-col justify-center gap-10 px-4 py-8 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-[clamp(4rem,7vw,9rem)]">
        <section className="login-fade-up max-w-[540px] lg:mr-auto">
          <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-emerald-300/30 bg-emerald-950/45 px-3 py-1 text-sm font-bold text-emerald-100 shadow-lg shadow-emerald-950/25 backdrop-blur">
            <Truck className="h-4 w-4" />
            Puyo Express
          </div>
          <h1 className="max-w-[520px] text-4xl font-black leading-tight text-white drop-shadow-2xl sm:text-5xl">
            Pedidos calientes, rutas claras y entregas listas para salir.
          </h1>
          <p className="mt-4 max-w-[500px] text-base leading-7 text-emerald-50/80">
            Coordina clientes, restaurantes y repartidores desde una cabina visual pensada para la operacion local en Puyo.
          </p>

          <div className="mt-8 grid max-w-[520px] gap-3 sm:grid-cols-3">
            {[
              { icon: Store, label: 'Restaurantes', value: 'Activos' },
              { icon: Route, label: 'Rutas', value: 'En vivo' },
              { icon: MapPinned, label: 'Cobertura', value: 'Puyo' },
            ].map(({ icon: Icon, label, value }, index) => (
              <div
                className="login-float-slow rounded-lg border border-white/15 bg-white/10 px-4 py-3 shadow-2xl shadow-black/20 backdrop-blur-md"
                key={label}
                style={{ animationDelay: `${index * 180}ms` }}
              >
                <Icon className="mb-3 h-5 w-5 text-amber-200" />
                <p className="text-xs font-semibold uppercase text-emerald-50/60">{label}</p>
                <p className="mt-1 text-sm font-black text-white">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <Card className="login-fade-up w-full max-w-[420px] border-white/20 bg-white/90 p-5 text-slate-900 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-6 lg:ml-[clamp(10rem,18vw,24rem)] lg:[animation-delay:160ms]">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-lg shadow-emerald-700/25">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-black">Ingresa a la cabina</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Inicia sesión con tu usuario para acceder a tu panel.
              </p>
            </div>
            <Input
              autoComplete="username"
              label="Usuario"
              onChange={(event) => setUsername(event.target.value)}
              required
              type="text"
              value={username}
            />
            <Input
              autoComplete="current-password"
              label="Contraseña"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
            <Button
              className="w-full shadow-lg shadow-emerald-700/20 hover:shadow-emerald-700/30"
              icon={<Lock className="h-4 w-4" />}
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Ingresando...' : 'Entrar a la app'}
            </Button>

            {/* Test credentials info */}
            <div className="space-y-2">
              <div className="flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">
                <User className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <div>
                  <p className="font-bold mb-1">Cuentas de prueba:</p>
                  <p><span className="font-semibold">Cliente:</span> cliente / Cliente2026!</p>
                  <p><span className="font-semibold">Restaurante:</span> restaurante / Restaurante2026!</p>
                  <p><span className="font-semibold">Repartidor:</span> repartidor / Repartidor2026!</p>
                </div>
              </div>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}
