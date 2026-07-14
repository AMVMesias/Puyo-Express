import type { Driver, Landmark, Order, Restaurant } from '../domain/entities';
import { DRIVER_SEED, LANDMARK_SEED, RESTAURANT_SEED } from './seeds';
import type { KeyValueStorage } from './storage';

export interface RestaurantRepository {
  getRestaurants(): Restaurant[];
  saveRestaurants(restaurants: Restaurant[]): void;
  resetRestaurants(): Restaurant[];
}

export interface DriverRepository {
  getDrivers(): Driver[];
  saveDrivers(drivers: Driver[]): void;
  resetDrivers(): Driver[];
}

export interface LandmarkRepository {
  getLandmarks(): Landmark[];
}

export interface OrderRepository {
  getOrders(): Order[];
  saveOrders(orders: Order[]): void;
  resetOrders(): Order[];
}

const RESTAURANTS_KEY = 'pe_restaurants';
const DRIVERS_KEY = 'pe_drivers';
const ORDERS_KEY = 'pe_orders';

export class LocalRestaurantRepository implements RestaurantRepository {
  constructor(private readonly storage: KeyValueStorage) {}

  getRestaurants(): Restaurant[] {
    return this.storage.get<Restaurant[]>(RESTAURANTS_KEY, [...RESTAURANT_SEED]);
  }

  saveRestaurants(restaurants: Restaurant[]): void {
    this.storage.set(RESTAURANTS_KEY, restaurants);
  }

  resetRestaurants(): Restaurant[] {
    const restaurants = [...RESTAURANT_SEED];
    this.saveRestaurants(restaurants);
    return restaurants;
  }
}

export class LocalDriverRepository implements DriverRepository {
  constructor(private readonly storage: KeyValueStorage) {}

  getDrivers(): Driver[] {
    return this.storage.get<Driver[]>(DRIVERS_KEY, [...DRIVER_SEED]);
  }

  saveDrivers(drivers: Driver[]): void {
    this.storage.set(DRIVERS_KEY, drivers);
  }

  resetDrivers(): Driver[] {
    const drivers = [...DRIVER_SEED];
    this.saveDrivers(drivers);
    return drivers;
  }
}

export class StaticLandmarkRepository implements LandmarkRepository {
  getLandmarks(): Landmark[] {
    return [...LANDMARK_SEED];
  }
}

export class LocalOrderRepository implements OrderRepository {
  constructor(private readonly storage: KeyValueStorage) {}

  getOrders(): Order[] {
    return this.storage.get<Order[]>(ORDERS_KEY, []);
  }

  saveOrders(orders: Order[]): void {
    this.storage.set(ORDERS_KEY, orders);
  }

  resetOrders(): Order[] {
    this.saveOrders([]);
    return [];
  }
}
