import { LogOut, Moon, Sun, User } from 'lucide-react';
import { useAuth } from '../../../application/auth/AuthProvider';
import { useTheme } from '../../../application/theme/ThemeProvider';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';

const ROLE_LABELS = {
  ROLE_CUSTOMER: 'Cliente',
  ROLE_RESTAURANT: 'Restaurante',
  ROLE_DRIVER: 'Repartidor',
} as const;

export function AppHeader() {
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
      <header className="sticky top-0 z-50 border-b border-emerald-950/20 bg-emerald-950 text-white shadow-md dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-lg font-black tracking-wide">PUYO EXPRESS</h1>
            <p className="text-sm text-emerald-100 dark:text-emerald-200/80">
              Pedidos y entregas locales para turismo en Pastaza.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="emerald">
              <User className="h-3 w-3" />
              {user?.username} · {user ? ROLE_LABELS[user.role] : ''}
            </Badge>
            <Button
              icon={theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              onClick={toggleTheme}
              variant="secondary"
            >
              {theme === 'dark' ? 'Claro' : 'Oscuro'}
            </Button>
            <Button className="text-white hover:bg-white/10" icon={<LogOut className="h-4 w-4" />} onClick={logout} variant="ghost">
              Salir
            </Button>
          </div>
        </div>
      </header>
  );
}
