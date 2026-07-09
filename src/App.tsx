import { AuthProvider, useAuth } from './application/auth/AuthProvider';
import { DeliveryProvider } from './application/delivery/DeliveryProvider';
import { ThemeProvider } from './application/theme/ThemeProvider';
import { ToastProvider } from './application/toast/ToastProvider';
import { DashboardPage } from './presentation/pages/DashboardPage';
import { LoginPage } from './presentation/pages/LoginPage';

function AppGate() {
  const { isAuthenticated } = useAuth();

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
