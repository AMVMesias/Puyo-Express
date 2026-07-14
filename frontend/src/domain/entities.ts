export type Coordinates = {
  lat: number;
  lng: number;
};

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready_for_pickup'
  | 'picked_up'
  | 'delivered';

export type LandmarkType = 'hotel' | 'tourist_spot' | 'restaurant' | 'terminal';
export type DriverStatus = 'active' | 'delivering' | 'offline';
export type VehicleType = 'moto' | 'bici';

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
}

export interface Restaurant {
  id: number;
  name: string;
  description: string;
  category: string;
  logo: string;
  banner: string;
  rating: number;
  locationName: string;
  position: Coordinates;
  menu: MenuItem[];
}

export interface Driver {
  id: number;
  name: string;
  phone: string;
  zone: string;
  vehicle: VehicleType;
  rating: number;
  status: DriverStatus;
  totalEarnings: number;
  completedDeliveries: number;
  position: Coordinates;
}

export interface Landmark {
  id: number;
  name: string;
  type: LandmarkType;
  description: string;
  position: Coordinates;
}

export interface OrderItem {
  item: MenuItem;
  quantity: number;
}

export interface Order {
  id: number;
  restaurantId: number;
  restaurantName: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  total: number;
  foodTotal: number;
  commission: number;
  distanceKm: number;
  deliveryAddress: string;
  deliveryLandmarkId: number;
  deliveryLandmark: string;
  destination: Coordinates;
  status: OrderStatus;
  driverId?: number;
  driverName?: string;
  createdAt: string;
  routeProgress: number;
}

export interface PlaceOrderInput {
  restaurantId: number;
  restaurantName: string;
  items: OrderItem[];
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  landmarkId: number;
}

export type AppTab = 'customer' | 'restaurant' | 'driver';
