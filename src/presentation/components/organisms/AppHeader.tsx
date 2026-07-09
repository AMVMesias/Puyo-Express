import { FileText, LogOut, Moon, Play, RefreshCw, Sun, Wallet, Wifi, WifiOff } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../../application/auth/AuthProvider';
import { useDelivery } from '../../../application/delivery/DeliveryProvider';
import { useTheme } from '../../../application/theme/ThemeProvider';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { WeeklyReportModal } from './WeeklyReportModal';

export function AppHeader() {
  const {
    isOnline,
    pendingSyncOrders,
    rechargeRestaurantWallet,
    resetData,
    simulateDemoOrder,
    toggleOnline,
    walletBalance,
  } = useDelivery();
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showReport, setShowReport] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-emerald-950/20 bg-emerald-950 text-white shadow-md dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-lg font-black tracking-wide">PUYO EXPRESS</h1>
            <p className="text-sm text-emerald-100 dark:text-emerald-200/80">
              Pedidos y entregas locales para turismo en Pastaza.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={isOnline ? 'emerald' : 'red'}>
              {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isOnline ? 'En línea' : 'Offline'}
            </Badge>
            {pendingSyncOrders.length > 0 && <Badge tone="amber">{pendingSyncOrders.length} por sincronizar</Badge>}
            <Badge tone="slate">
              <Wallet className="h-3 w-3" />
              ${walletBalance.toFixed(2)}
            </Badge>
            <Button onClick={() => rechargeRestaurantWallet(10)} variant="secondary">
              Recargar
            </Button>
            <Button icon={<Wifi className="h-4 w-4" />} onClick={toggleOnline} variant="secondary">
              Red
            </Button>
            <Button icon={<FileText className="h-4 w-4" />} onClick={() => setShowReport(true)} variant="secondary">
              Corte
            </Button>
            <Button icon={<Play className="h-4 w-4" />} onClick={simulateDemoOrder} variant="secondary">
              Pedido demo
            </Button>
            <Button
              icon={theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              onClick={toggleTheme}
              variant="secondary"
            >
              {theme === 'dark' ? 'Claro' : 'Oscuro'}
            </Button>
            <Button
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={() => {
                if (confirm('¿Deseas reiniciar toda la simulación de Puyo Express?')) resetData();
              }}
              variant="secondary"
            >
              Reiniciar
            </Button>
            <Button className="text-white hover:bg-white/10" icon={<LogOut className="h-4 w-4" />} onClick={logout} variant="ghost">
              Salir
            </Button>
          </div>
        </div>
      </header>
      {showReport && <WeeklyReportModal onClose={() => setShowReport(false)} />}
    </>
  );
}
