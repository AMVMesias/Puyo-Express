import type {
  Coordinates,
  Driver,
  DriverStatus,
  Landmark,
  Order,
  OrderStatus,
  PlaceOrderInput,
  Restaurant,
} from './entities';

const EARTH_RADIUS_KM = 6371;
const MAX_DRIVER_RADIUS_KM = 5;

export function calculateDistanceKm(origin: Coordinates, destination: Coordinates): number {
  const toRadians = (degrees: number) => degrees * (Math.PI / 180);
  const dLat = toRadians(destination.lat - origin.lat);
  const dLng = toRadians(destination.lng - origin.lng);
  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(destination.lat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((EARTH_RADIUS_KM * c).toFixed(2));
}

export function isInsideDriverRadius(driver: Driver, restaurant: Restaurant): boolean {
  return calculateDistanceKm(driver.position, restaurant.position) <= MAX_DRIVER_RADIUS_KM;
}

export function calculateDeliveryCommission(distanceKm: number): number {
  const baseCommission = 2;
  const extraKmCharge = distanceKm > 2 ? (distanceKm - 2) * 0.5 : 0;
  return Number((baseCommission + extraKmCharge).toFixed(2));
}

export function createOrder(
  input: PlaceOrderInput,
  restaurant: Restaurant,
  landmark: Landmark,
  isOnline: boolean,
): Order {
  const foodTotal = input.items.reduce(
    (total, orderItem) => total + orderItem.item.price * orderItem.quantity,
    0,
  );
  const distanceKm = calculateDistanceKm(restaurant.position, landmark.position);
  const commission = calculateDeliveryCommission(distanceKm);

  return {
    id: `pe_ord_${crypto.randomUUID().slice(0, 8)}`,
    restaurantId: input.restaurantId,
    restaurantName: input.restaurantName,
    customerName: input.customerName.trim(),
    customerPhone: input.customerPhone.trim(),
    items: input.items,
    total: Number((foodTotal + commission).toFixed(2)),
    foodTotal: Number(foodTotal.toFixed(2)),
    commission,
    distanceKm,
    deliveryAddress: input.deliveryAddress.trim(),
    deliveryLandmarkId: landmark.id,
    deliveryLandmark: landmark.name,
    destination: landmark.position,
    status: 'pending',
    createdAt: new Date().toLocaleTimeString('es-EC', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    routeProgress: 0,
    synchronized: isOnline,
    isOfflinePending: !isOnline,
  };
}

export function updateOrderStatus(order: Order, status: OrderStatus, isOnline: boolean): Order {
  return {
    ...order,
    status,
    routeProgress: status === 'picked_up' ? 0 : order.routeProgress,
    synchronized: isOnline,
    isOfflinePending: !isOnline,
  };
}

export function assignDriverToOrder(order: Order, driver: Driver, isOnline: boolean): Order {
  return {
    ...order,
    driverId: driver.id,
    driverName: driver.name,
    status: 'ready_for_pickup',
    synchronized: isOnline,
    isOfflinePending: !isOnline,
  };
}

export function updateDriverStatus(driver: Driver, status: DriverStatus): Driver {
  return {
    ...driver,
    status,
  };
}

export function completeDriverDelivery(driver: Driver, commission: number): Driver {
  return {
    ...driver,
    status: 'active',
    totalEarnings: Number((driver.totalEarnings + commission).toFixed(2)),
    completedDeliveries: driver.completedDeliveries + 1,
  };
}

export function debitWallet(balance: number, commission: number): number {
  if (balance < commission) {
    throw new Error('Saldo insuficiente en la billetera del restaurante.');
  }

  return Number((balance - commission).toFixed(2));
}

export function rechargeWallet(balance: number, amount: number): number {
  return Number((balance + amount).toFixed(2));
}
