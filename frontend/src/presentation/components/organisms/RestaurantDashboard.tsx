import { Clock, ClipboardList, DollarSign, Send, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useDelivery } from '../../../application/delivery/DeliveryProvider';
import { isInsideDriverRadius } from '../../../domain/useCases';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Select } from '../atoms/Field';
import { EmptyState } from '../molecules/EmptyState';
import { MetricTile } from '../molecules/MetricTile';
import { OrderStatusBadge } from '../molecules/OrderStatusBadge';

export function RestaurantDashboard() {
  const {
    assignDriver,
    drivers,
    orders,
    restaurants,
    updateOrderStatus,
  } = useDelivery();
  const [activeRestaurantId, setActiveRestaurantId] = useState<number | null>(null);

  const activeRestaurant = restaurants.find((restaurant) => restaurant.id === activeRestaurantId) ?? restaurants[0];
  const effectiveRestaurantId = activeRestaurant?.id;
  const restaurantOrders = orders.filter((order) => order.restaurantId === effectiveRestaurantId);
  const completedOrders = restaurantOrders.filter((order) => order.status === 'delivered');
  const activeOrders = restaurantOrders.filter((order) => order.status !== 'delivered');
  const sales = completedOrders.reduce((total, order) => total + order.foodTotal, 0);
  const commissions = completedOrders.reduce((total, order) => total + order.commission, 0);

  const availableDrivers = useMemo(
    () =>
      drivers.filter(
        (driver) =>
          driver.status === 'active' &&
          activeRestaurant &&
          isInsideDriverRadius(driver, activeRestaurant),
      ),
    [activeRestaurant, drivers],
  );

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-50 text-2xl">
              {activeRestaurant?.logo}
            </span>
            <div className="min-w-0 flex-1">
              <Select label="Restaurante en gestión" onChange={(event) => setActiveRestaurantId(Number(event.target.value))} value={effectiveRestaurantId ?? ''}>
                {restaurants.map((restaurant) => (
                  <option key={restaurant.id} value={restaurant.id}>
                    {restaurant.name} - {restaurant.category}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <MetricTile icon={<DollarSign className="h-4 w-4" />} label="Ventas" value={`$${sales.toFixed(2)}`} />
            <MetricTile label="Comisiones" tone="emerald" value={`$${commissions.toFixed(2)}`} />
            <MetricTile label="Activos" tone="amber" value={String(activeOrders.length)} />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-black text-slate-900">
              <ClipboardList className="h-5 w-5 text-orange-500" />
              Pedidos
            </h2>
            <Badge>{restaurantOrders.length} registrados</Badge>
          </div>

          {restaurantOrders.length === 0 ? (
            <EmptyState icon={<ClipboardList className="h-6 w-6" />} title="Sin pedidos">
              Crea un pedido desde la vista cliente para operar este restaurante.
            </EmptyState>
          ) : (
            restaurantOrders.map((order) => (
              <Card key={order.id} className="space-y-4 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Badge>#{String(order.id).padStart(6, '0')}</Badge>
                    <h3 className="mt-2 font-black text-slate-900">{order.customerName}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {order.deliveryLandmark} - {order.deliveryAddress}
                    </p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                  {order.items.map((orderItem) => (
                    <div key={orderItem.item.id} className="flex justify-between gap-3 py-1">
                      <span>
                        {orderItem.item.image} {orderItem.item.name} x{orderItem.quantity}
                      </span>
                      <strong>${(orderItem.item.price * orderItem.quantity).toFixed(2)}</strong>
                    </div>
                  ))}
                  <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 font-black">
                    <span>Total comida</span>
                    <span>${order.foodTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-600">Comisión:</span>
                    <Badge tone="emerald">${order.commission.toFixed(2)}</Badge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {order.status === 'pending' && (
                      <Button icon={<Send className="h-4 w-4" />} onClick={() => updateOrderStatus(order.id, 'accepted')}>
                        Aceptar
                      </Button>
                    )}
                    {order.status === 'accepted' && (
                      <Button icon={<Clock className="h-4 w-4" />} onClick={() => updateOrderStatus(order.id, 'preparing')}>
                        Preparar
                      </Button>
                    )}
                    {order.status === 'preparing' && (
                      <Button onClick={() => updateOrderStatus(order.id, 'ready_for_pickup')}>Marcar listo</Button>
                    )}
                    {order.status === 'ready_for_pickup' && !order.driverId && (
                      availableDrivers.map((driver) => (
                        <Button key={driver.id} onClick={() => assignDriver(order.id, driver.id)} variant="secondary">
                          Asignar {driver.name.split(' ')[0]}
                        </Button>
                      ))
                    )}
                    {order.driverName && <Badge tone="blue">Asignado a {order.driverName}</Badge>}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        <aside className="space-y-3">
          <h2 className="flex items-center gap-2 font-black text-slate-900">
            <Users className="h-5 w-5 text-emerald-600" />
            Repartidores
          </h2>
          {drivers.map((driver) => (
            <Card key={driver.id} className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900">{driver.name}</h3>
                  <p className="text-xs text-slate-500">{driver.zone}</p>
                </div>
                <Badge tone={driver.status === 'active' ? 'emerald' : driver.status === 'delivering' ? 'indigo' : 'slate'}>
                  {driver.status === 'active' ? 'Disponible' : driver.status === 'delivering' ? 'En reparto' : 'Offline'}
                </Badge>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-500">
                <span>⭐ {driver.rating}</span>
                <span>{driver.completedDeliveries ?? '—'} envíos</span>
                <strong className="text-emerald-700">
                  {driver.totalEarnings == null ? 'Privado' : `$${driver.totalEarnings.toFixed(2)}`}
                </strong>
              </div>
            </Card>
          ))}
        </aside>
      </div>
    </div>
  );
}
