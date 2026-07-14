import { Navigation, Smartphone, Store } from 'lucide-react';
import { useAuth, type UserRole } from '../../application/auth/AuthProvider';
import { useDelivery } from '../../application/delivery/DeliveryProvider';
import { AppFooter } from '../components/organisms/AppFooter';
import { AppHeader } from '../components/organisms/AppHeader';
import { CustomerOrderFlow } from '../components/organisms/CustomerOrderFlow';
import { DeliveryMap } from '../components/organisms/DeliveryMap';
import { DriverDashboard } from '../components/organisms/DriverDashboard';
import { RestaurantDashboard } from '../components/organisms/RestaurantDashboard';

/**
 * Maps each user role to the tabs they are allowed to see.
 * Each role only sees their own tab — no tab switcher needed.
 */
const ROLE_TAB_MAP: Record<UserRole, { id: string; label: string; icon: typeof Smartphone }> = {
  ROLE_CUSTOMER: { id: 'customer', label: 'Cliente', icon: Smartphone },
  ROLE_RESTAURANT: { id: 'restaurant', label: 'Restaurante', icon: Store },
  ROLE_DRIVER: { id: 'driver', label: 'Repartidor', icon: Navigation },
};

export function DashboardPage() {
  const { user } = useAuth();
  const { activeTab, setActiveTab } = useDelivery();

  // Determine which view to show based on the user's role
  const userRole = user?.role;
  const allowedTab = userRole ? ROLE_TAB_MAP[userRole] : null;

  // If the user has a role-assigned tab that differs from the active tab, sync it
  if (allowedTab && activeTab !== allowedTab.id) {
    setActiveTab(allowedTab.id as 'customer' | 'restaurant' | 'driver');
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <AppHeader />
      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-5 xl:grid-cols-[460px_1fr]">
        <aside className="space-y-4">
          <DeliveryMap />
        </aside>

        <section className="space-y-4">
          {/* Role indicator badge */}
          {allowedTab && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600 text-white">
                <allowedTab.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">
                  Panel de {allowedTab.label}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sesión activa como <span className="font-semibold">{user?.username}</span>
                </p>
              </div>
            </div>
          )}

          {/* Render only the component matching the user's role */}
          {activeTab === 'customer' && <CustomerOrderFlow />}
          {activeTab === 'restaurant' && <RestaurantDashboard />}
          {activeTab === 'driver' && <DriverDashboard />}
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
