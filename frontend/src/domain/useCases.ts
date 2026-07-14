import type {
  Coordinates,
  Driver,
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
