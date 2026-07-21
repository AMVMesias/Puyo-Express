import { Award, Bike, CheckCircle2, MapPin, Navigation, Power, RefreshCw, Wallet } from 'lucide-react';
import { useAuth } from '../../../application/auth/AuthProvider';
import { useDelivery } from '../../../application/delivery/DeliveryProvider';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { EmptyState } from '../molecules/EmptyState';
import { MetricTile } from '../molecules/MetricTile';
import { OrderStatusBadge } from '../molecules/OrderStatusBadge';

export function DriverDashboard() {
  const { user } = useAuth();
  const {
    assignDriver,
    drivers,
    orders,
    refreshOrders,
    updateDriverStatus,
    updateOrderStatus,
  } = useDelivery();
  const currentDriver = drivers.find((driver) => driver.userId === user?.id);
  const myActiveOrder = orders.find(
    (order) => order.driverId === currentDriver?.id && order.status !== 'delivered',
  );
  const completedOrders = orders.filter(
    (order) => order.driverId === currentDriver?.id && order.status === 'delivered',
  );
  const availableOrders = orders.filter(
    (order) => order.status === 'ready_for_pickup' && !order.driverId,
  );

  const toggleConnection = () => {
    if (!currentDriver || currentDriver.status === 'delivering') return;
    updateDriverStatus(currentDriver.id, currentDriver.status === 'offline' ? 'active' : 'offline');
  };

  if (!currentDriver) {
    return (
      <EmptyState icon={<Bike className="h-6 w-6" />} title="Perfil de repartidor no disponible">
        Tu cuenta no tiene un perfil operativo asociado. Cierra sesión y vuelve a entrar; si continúa, contacta al administrador.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-2xl">
              {currentDriver?.vehicle === 'bici' ? '🚲' : '🏍️'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Perfil del repartidor</p>
              <p className="mt-1 font-black text-slate-900">{currentDriver.name}</p>
              <p className="text-sm text-slate-500">{currentDriver.vehicle === 'moto' ? 'Moto' : 'Bicicleta'} · {currentDriver.zone}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={() => void refreshOrders()}
              variant="ghost"
            >
              Actualizar
            </Button>
            <Button
              disabled={currentDriver?.status === 'delivering'}
              icon={<Power className="h-4 w-4" />}
              onClick={toggleConnection}
              variant={currentDriver?.status === 'offline' ? 'primary' : 'secondary'}
            >
              {currentDriver?.status === 'offline' ? 'Conectarse' : 'Desconectarse'}
            </Button>
          </div>
        </div>
      </Card>

      {currentDriver && (
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricTile icon={<Wallet className="h-4 w-4" />} label="Billetera" tone="emerald" value={`$${(currentDriver.totalEarnings ?? 0).toFixed(2)}`} />
          <MetricTile label="Calificación" tone="amber" value={`⭐ ${currentDriver.rating}`} />
          <MetricTile icon={<Bike className="h-4 w-4" />} label="Envíos" value={String(currentDriver.completedDeliveries ?? 0)} />
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {currentDriver?.status === 'offline' ? (
            <EmptyState icon={<Power className="h-6 w-6" />} title="Estás desconectado">
              {availableOrders.length > 0
                ? `Hay ${availableOrders.length} ${availableOrders.length === 1 ? 'pedido listo' : 'pedidos listos'}. Conéctate para ver y aceptar la cola.`
                : 'Conéctate para recibir pedidos disponibles cerca de los restaurantes.'}
            </EmptyState>
          ) : myActiveOrder ? (
            <Card className="space-y-4 border-emerald-300 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Badge tone="emerald">Reparto en curso</Badge>
                <OrderStatusBadge status={myActiveOrder.status} />
              </div>
              <div className="grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm sm:grid-cols-[1fr_auto_1fr]">
                <div>
                  <span className="text-xs font-bold uppercase text-slate-400">Retiro</span>
                  <p className="font-bold text-slate-900">{myActiveOrder.restaurantName}</p>
                </div>
                <Navigation className="hidden h-5 w-5 self-center text-emerald-600 sm:block" />
                <div className="sm:text-right">
                  <span className="text-xs font-bold uppercase text-slate-400">Entrega</span>
                  <p className="font-bold text-slate-900">{myActiveOrder.deliveryLandmark}</p>
                  <p className="text-xs text-slate-500">{myActiveOrder.deliveryAddress}</p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-3">
                <span className="text-sm font-semibold text-slate-600">Comisión de entrega</span>
                <strong className="text-xl text-emerald-700">${myActiveOrder.commission.toFixed(2)}</strong>
              </div>
              {myActiveOrder.status !== 'picked_up' ? (
                <Button
                  className="w-full"
                  disabled={myActiveOrder.status !== 'ready_for_pickup'}
                  onClick={() => updateOrderStatus(myActiveOrder.id, 'picked_up')}
                >
                  Recoger pedido
                </Button>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="mb-1 flex justify-between text-sm font-semibold text-slate-600">
                      <span>Progreso de ruta</span>
                      <span>{Math.round(myActiveOrder.routeProgress)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full bg-emerald-600 transition-all" style={{ width: `${myActiveOrder.routeProgress}%` }} />
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    onClick={() => updateOrderStatus(myActiveOrder.id, 'delivered')}
                  >
                    Entregar pedido
                  </Button>
                </div>
              )}
            </Card>
          ) : availableOrders.length === 0 ? (
            <EmptyState icon={<Navigation className="h-6 w-6" />} title="Sin pedidos disponibles">
              Cuando un restaurante marque listo un pedido aparecerá aquí.
            </EmptyState>
          ) : (
            availableOrders.map((order) => (
              <Card key={order.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Badge tone="orange">{order.restaurantName}</Badge>
                  <h3 className="mt-2 font-bold text-slate-900">{order.deliveryLandmark}</h3>
                  <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                    <MapPin className="h-4 w-4" />
                    {order.distanceKm.toFixed(2)} km - {order.items.length} artículos
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <strong className="text-lg text-emerald-700">${order.commission.toFixed(2)}</strong>
                  <Button onClick={() => currentDriver && assignDriver(order.id, currentDriver.id)}>
                    Aceptar viaje
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>

        <aside className="space-y-3">
          <h2 className="flex items-center gap-2 font-black text-slate-900">
            <Award className="h-5 w-5 text-amber-500" />
            Historial
          </h2>
          {completedOrders.length === 0 ? (
            <Card className="p-4 text-sm text-slate-500">Completa tu primer reparto para ver el historial.</Card>
          ) : (
            completedOrders.map((order) => (
              <Card key={order.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div>
                  <strong className="text-slate-900">{order.restaurantName}</strong>
                  <p className="text-xs text-slate-500">{order.deliveryLandmark}</p>
                </div>
                <Badge tone="emerald">+${order.commission.toFixed(2)}</Badge>
              </Card>
            ))
          )}
        </aside>
      </div>
    </div>
  );
}
