import { AuthProvider, useAuth } from './application/auth/AuthProvider';
import { DeliveryProvider } from './application/delivery/DeliveryProvider';
import { ThemeProvider } from './application/theme/ThemeProvider';
import { ToastProvider } from './application/toast/ToastProvider';
import { DashboardPage } from './presentation/pages/DashboardPage';
import { LoginPage } from './presentation/pages/LoginPage';

function AppGate() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <LoginPage />;

  return (
    <DeliveryProvider>
      <DashboardPage />
    </DeliveryProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <AppGate />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
