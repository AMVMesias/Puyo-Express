import { Download } from 'lucide-react';
import { useDelivery } from '../../../application/delivery/DeliveryProvider';
import { Button } from '../atoms/Button';
import { Modal } from '../atoms/Modal';

export function WeeklyReportModal({ onClose }: { onClose: () => void }) {
  const { drivers, orders } = useDelivery();
  const deliveredOrders = orders.filter((order) => order.status === 'delivered');
  const foodSales = deliveredOrders.reduce((total, order) => total + order.foodTotal, 0);
  const commissions = deliveredOrders.reduce((total, order) => total + order.commission, 0);

  return (
    <Modal onClose={onClose} title="Corte de cuentas semanal">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-3">
            <span className="text-xs font-bold uppercase text-slate-500">Ventas comida</span>
            <strong className="block text-lg text-slate-900">${foodSales.toFixed(2)}</strong>
          </div>
          <div className="rounded-lg bg-emerald-50 p-3">
            <span className="text-xs font-bold uppercase text-emerald-700">Comisiones</span>
            <strong className="block text-lg text-emerald-800">${commissions.toFixed(2)}</strong>
          </div>
          <div className="rounded-lg bg-slate-900 p-3 text-white">
            <span className="text-xs font-bold uppercase text-slate-300">Total</span>
            <strong className="block text-lg">${(foodSales + commissions).toFixed(2)}</strong>
          </div>
        </div>

        <div className="space-y-2">
          {drivers.map((driver) => (
            <div key={driver.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-sm">
              <span className="font-semibold text-slate-800">{driver.name}</span>
              <span className="text-slate-500">
                {driver.completedDeliveries} envíos - ${driver.totalEarnings.toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <Button className="w-full" icon={<Download className="h-4 w-4" />} onClick={onClose}>
          Simular descarga PDF
        </Button>
      </div>
    </Modal>
  );
}
