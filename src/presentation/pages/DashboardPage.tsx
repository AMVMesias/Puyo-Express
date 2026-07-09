import { Navigation, Smartphone, Store } from 'lucide-react';
import { useDelivery } from '../../application/delivery/DeliveryProvider';
import { AppFooter } from '../components/organisms/AppFooter';
import { AppHeader } from '../components/organisms/AppHeader';
import { CustomerOrderFlow } from '../components/organisms/CustomerOrderFlow';
import { DeliveryMap } from '../components/organisms/DeliveryMap';
import { DriverDashboard } from '../components/organisms/DriverDashboard';
import { RestaurantDashboard } from '../components/organisms/RestaurantDashboard';

const tabs = [
  { id: 'customer', label: 'Cliente', icon: Smartphone },
  { id: 'restaurant', label: 'Restaurante', icon: Store },
  { id: 'driver', label: 'Repartidor', icon: Navigation },
] as const;

export function DashboardPage() {
  const { activeTab, setActiveTab } = useDelivery();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <AppHeader />
      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-5 xl:grid-cols-[460px_1fr]">
        <aside className="space-y-4">
          <DeliveryMap />
        </aside>

        <section className="space-y-4">
          <div className="grid rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  className={`flex min-h-11 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                  type="button"
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === 'customer' && <CustomerOrderFlow />}
          {activeTab === 'restaurant' && <RestaurantDashboard />}
          {activeTab === 'driver' && <DriverDashboard />}
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
