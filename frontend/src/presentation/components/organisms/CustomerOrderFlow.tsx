import { ArrowLeft, Check, MapPin, Minus, Plus, ShoppingBag, Star } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useDelivery } from '../../../application/delivery/DeliveryProvider';
import type { MenuItem, OrderItem, Restaurant } from '../../../domain/entities';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Input, Select, Textarea } from '../atoms/Field';
import { EmptyState } from '../molecules/EmptyState';
import { OrderStatusBadge } from '../molecules/OrderStatusBadge';

const steps = [
  { key: 'pending', label: 'Orden enviada', description: 'Esperando confirmación del restaurante.' },
  { key: 'accepted', label: 'Orden aceptada', description: 'El restaurante revisó el pedido.' },
  { key: 'preparing', label: 'En preparación', description: 'Cocina está preparando tu orden.' },
  { key: 'ready_for_pickup', label: 'Listo para retiro', description: 'Un repartidor puede recogerlo.' },
  { key: 'picked_up', label: 'En camino', description: 'El pedido está viajando hacia el destino.' },
  { key: 'delivered', label: 'Entregado', description: 'Pedido completado.' },
] as const;

export function CustomerOrderFlow() {
  const {
    activeOrder,
    landmarks,
    placeOrder,
    restaurants,
    selectLandmark,
    selectedLandmark,
  } = useDelivery();
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [landmarkId, setLandmarkId] = useState<number | null>(selectedLandmark?.id ?? null);

  useEffect(() => {
    if (selectedLandmark) setLandmarkId(selectedLandmark.id);
  }, [selectedLandmark]);

  const subtotal = useMemo(
    () => cart.reduce((total, orderItem) => total + orderItem.item.price * orderItem.quantity, 0),
    [cart],
  );

  const addToCart = (item: MenuItem) => {
    setCart((currentCart) => {
      const existingItem = currentCart.find((cartItem) => cartItem.item.id === item.id);
      if (!existingItem) return [...currentCart, { item, quantity: 1 }];
      return currentCart.map((cartItem) =>
        cartItem.item.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem,
      );
    });
  };

  const updateQuantity = (itemId: number, change: number) => {
    setCart((currentCart) =>
      currentCart
        .map((cartItem) =>
          cartItem.item.id === itemId
            ? { ...cartItem, quantity: cartItem.quantity + change }
            : cartItem,
        )
        .filter((cartItem) => cartItem.quantity > 0),
    );
  };

  const submitOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRestaurant || cart.length === 0 || landmarkId === null) return;

    const created = await placeOrder({
      customerName,
      customerPhone,
      deliveryAddress,
      items: cart,
      landmarkId,
      restaurantId: selectedRestaurant.id,
      restaurantName: selectedRestaurant.name,
    });
    if (created) {
      setCart([]);
      setSelectedRestaurant(null);
    }
  };

  if (activeOrder) {
    const currentStepIndex = steps.findIndex((step) => step.key === activeOrder.status);

    return (
      <div className="space-y-4">
        <Card className="!border-emerald-800 !bg-emerald-950 p-5 text-white shadow-lg">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge tone="emerald" className="border-emerald-500 bg-emerald-900 text-emerald-100">
                Rastreo activo
              </Badge>
              <h2 className="mt-3 text-xl font-black text-white">Tu pedido está en proceso</h2>
              <p className="mt-1 text-sm text-emerald-100">{activeOrder.restaurantName}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase text-emerald-200">Total</p>
              <p className="text-2xl font-black">${activeOrder.total.toFixed(2)}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 text-sm sm:grid-cols-2">
            <span>{activeOrder.deliveryLandmark}</span>
            <span className="sm:text-right">{activeOrder.deliveryAddress}</span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">Estado del pedido</h3>
            <OrderStatusBadge status={activeOrder.status} />
          </div>
          <div className="space-y-4 border-l-2 border-emerald-100 pl-5">
            {steps.map((step, index) => {
              const isDone = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              return (
                <div key={step.key} className="relative">
                  <span
                    className={`absolute -left-[29px] top-1 h-4 w-4 rounded-full border-2 ${
                      isDone
                        ? 'border-emerald-600 bg-emerald-600'
                        : isCurrent
                          ? 'border-amber-500 bg-amber-500'
                          : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                    }`}
                  />
                  <h4 className={`text-sm font-bold ${isCurrent ? 'text-amber-700' : 'text-slate-800'}`}>
                    {step.label}
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{step.description}</p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    );
  }

  if (selectedRestaurant) {
    return (
      <div className="space-y-4">
        <Button
          icon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => {
            setSelectedRestaurant(null);
            setCart([]);
          }}
          variant="ghost"
        >
          Volver
        </Button>

        <Card className="overflow-hidden">
          <div className="relative h-40">
            <img
              alt={selectedRestaurant.name}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
              src={selectedRestaurant.banner}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3 text-white">
              <div>
                <Badge tone="emerald">{selectedRestaurant.category}</Badge>
                <h2 className="mt-2 text-xl font-black">{selectedRestaurant.name}</h2>
              </div>
              <span className="flex items-center gap-1 rounded-lg bg-amber-400 px-2 py-1 text-sm font-black text-amber-950">
                <Star className="h-4 w-4 fill-amber-950" />
                {selectedRestaurant.rating}
              </span>
            </div>
          </div>
          <p className="p-4 text-sm text-slate-600">{selectedRestaurant.description}</p>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="space-y-3">
            {selectedRestaurant.menu.map((dish) => {
              const quantity = cart.find((cartItem) => cartItem.item.id === dish.id)?.quantity ?? 0;
              return (
                <Card key={dish.id} className="flex items-start justify-between gap-3 p-4">
                  <div className="flex min-w-0 gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-2xl">
                      {dish.image}
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100">{dish.name}</h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{dish.description}</p>
                      <p className="mt-2 font-black text-emerald-700">${dish.price.toFixed(2)}</p>
                    </div>
                  </div>
                  {quantity > 0 ? (
                    <div className="flex items-center rounded-lg border border-emerald-200 bg-emerald-50">
                      <button className="p-2 text-emerald-700" onClick={() => updateQuantity(dish.id, -1)} type="button">
                        <Minus className="h-4 w-4" />
                      </button>
                      <strong className="min-w-8 text-center text-sm text-emerald-900">{quantity}</strong>
                      <button className="p-2 text-emerald-700" onClick={() => addToCart(dish)} type="button">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <Button icon={<Plus className="h-4 w-4" />} onClick={() => addToCart(dish)} variant="secondary">
                      Añadir
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>

          <Card className="h-max p-4">
            <form className="space-y-4" onSubmit={submitOrder}>
              <h3 className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                <ShoppingBag className="h-4 w-4 text-emerald-600" />
                Carrito
              </h3>
              {cart.length === 0 ? (
                <EmptyState icon={<ShoppingBag className="h-6 w-6" />} title="Carrito vacío">
                  Añade platos para crear el pedido.
                </EmptyState>
              ) : (
                <div className="space-y-2">
                  {cart.map((cartItem) => (
                    <div key={cartItem.item.id} className="flex justify-between gap-3 text-sm">
                      <span className="text-slate-600">
                        {cartItem.item.name} x{cartItem.quantity}
                      </span>
                      <strong>${(cartItem.item.price * cartItem.quantity).toFixed(2)}</strong>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-slate-100 pt-2 font-black">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <Select
                label="Punto de entrega"
                onChange={(event) => {
                  const id = Number(event.target.value);
                  setLandmarkId(id);
                  selectLandmark(id);
                }}
                value={landmarkId ?? ''}
              >
                {landmarks.map((landmark) => (
                  <option key={landmark.id} value={landmark.id}>
                    {landmark.name}
                  </option>
                ))}
              </Select>
              <Input label="Nombre" onChange={(event) => setCustomerName(event.target.value)} required value={customerName} />
              <Input label="Teléfono" onChange={(event) => setCustomerPhone(event.target.value)} required value={customerPhone} />
              <Textarea
                label="Dirección / referencia"
                onChange={(event) => setDeliveryAddress(event.target.value)}
                required
                rows={3}
                value={deliveryAddress}
              />
              <Button className="w-full" disabled={cart.length === 0} icon={<Check className="h-4 w-4" />} type="submit">
                Confirmar pedido
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Gastronomía local en Puyo</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Elige un restaurante y envía el pedido a tu hotel o punto turístico.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {restaurants.map((restaurant) => (
          <Card key={restaurant.id} className="cursor-pointer overflow-hidden transition hover:border-emerald-300 hover:shadow-md">
            <button className="block h-full w-full text-left" onClick={() => setSelectedRestaurant(restaurant)} type="button">
              <div className="relative h-32">
                <img alt={restaurant.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" src={restaurant.banner} />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 to-transparent" />
                <Badge className="absolute right-2 top-2" tone="amber">
                  <Star className="h-3 w-3 fill-amber-700" />
                  {restaurant.rating}
                </Badge>
              </div>
              <div className="space-y-2 p-4">
                <h3 className="font-black text-slate-900 dark:text-slate-100">{restaurant.name}</h3>
                <p className="line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{restaurant.description}</p>
                <p className="flex items-center gap-1 text-xs font-semibold text-slate-400">
                  <MapPin className="h-3 w-3" />
                  {restaurant.locationName}
                </p>
              </div>
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}
