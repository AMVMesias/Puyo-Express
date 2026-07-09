import { Activity, Bike, Clock3, MapPinned, ReceiptText, Wallet } from 'lucide-react';
import { useDelivery } from '../../../application/delivery/DeliveryProvider';
import { Badge } from '../atoms/Badge';

export function AppFooter() {
  const { activeOrder, drivers, isOnline, orders, pendingSyncOrders, restaurants, walletBalance } =
    useDelivery();
  const deliveredOrders = orders.filter((order) => order.status === 'delivered');
  const activeOrders = orders.filter((order) => order.status !== 'delivered');
  const availableDrivers = drivers.filter((driver) => driver.status === 'active').length;
  const totalCommissions = deliveredOrders.reduce((total, order) => total + order.commission, 0);

  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 lg:grid-cols-[1.2fr_2fr]">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
              <MapPinned className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-slate-100">Puyo Express Logistics</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Pastaza, Ecuador · Operación local de última milla</p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone={isOnline ? 'emerald' : 'red'}>{isOnline ? 'Operación en línea' : 'Modo offline'}</Badge>
            {pendingSyncOrders.length > 0 && <Badge tone="amber">{pendingSyncOrders.length} pendientes de sync</Badge>}
            <Badge tone="slate">{restaurants.length} restaurantes activos</Badge>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
            <span className="flex items-center gap-1 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
              <Activity className="h-3.5 w-3.5" />
              Pedidos activos
            </span>
            <strong className="mt-1 block text-lg text-slate-900 dark:text-slate-100">{activeOrders.length}</strong>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
            <span className="flex items-center gap-1 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
              <Bike className="h-3.5 w-3.5" />
              Repartidores libres
            </span>
            <strong className="mt-1 block text-lg text-slate-900 dark:text-slate-100">{availableDrivers}</strong>
          </div>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/30 dark:bg-emerald-500/15">
            <span className="flex items-center gap-1 text-xs font-bold uppercase text-emerald-700 dark:text-emerald-200">
              <Wallet className="h-3.5 w-3.5" />
              Billetera local
            </span>
            <strong className="mt-1 block text-lg text-emerald-900 dark:text-emerald-100">${walletBalance.toFixed(2)}</strong>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
            <span className="flex items-center gap-1 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
              <ReceiptText className="h-3.5 w-3.5" />
              Comisiones pagadas
            </span>
            <strong className="mt-1 block text-lg text-slate-900 dark:text-slate-100">${totalCommissions.toFixed(2)}</strong>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-emerald-600" />
              {activeOrder
                ? `Pedido activo: ${activeOrder.restaurantName} → ${activeOrder.deliveryLandmark}`
                : 'Sin pedido activo. Usa “Pedido demo” o crea uno desde Cliente.'}
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {deliveredOrders.length} entregas completadas
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
