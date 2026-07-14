import { ExternalLink, LocateFixed, MapPin, Navigation, Store } from 'lucide-react';
import L, { type Layer, type Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDelivery } from '../../../application/delivery/DeliveryProvider';
import type { Coordinates } from '../../../domain/entities';
import { Badge } from '../atoms/Badge';
import { Card } from '../atoms/Card';

const PUYO_CENTER: Coordinates = { lat: -1.488333, lng: -77.994444 };
const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

function openStreetMapUrl(origin: Coordinates, destination?: Coordinates) {
  if (!destination) {
    return `https://www.openstreetmap.org/#map=13/${PUYO_CENTER.lat}/${PUYO_CENTER.lng}`;
  }

  const params = new URLSearchParams({
    engine: 'fossgis_osrm_car',
    route: `${origin.lat},${origin.lng};${destination.lat},${destination.lng}`,
  });
  return `https://www.openstreetmap.org/directions?${params.toString()}`;
}

function markerIcon(symbol: string, background: string, selected = false) {
  const ring = selected ? 'box-shadow:0 0 0 5px rgba(16,185,129,.25),0 3px 8px rgba(15,23,42,.28);' : 'box-shadow:0 3px 8px rgba(15,23,42,.24);';

  return L.divIcon({
    className: '',
    html: `<div aria-hidden="true" style="align-items:center;background:${background};border:2px solid white;border-radius:9999px;color:white;display:flex;font-size:17px;height:36px;justify-content:center;${ring}width:36px">${symbol}</div>`,
    iconAnchor: [18, 18],
    iconSize: [36, 36],
  });
}

export function DeliveryMap() {
  const {
    activeOrder,
    landmarks,
    restaurants,
    selectLandmark,
    selectedLandmark,
    selectedLandmarkId,
  } = useDelivery();
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const overlaysRef = useRef<Layer[]>([]);
  const [tileError, setTileError] = useState(false);

  const activeRestaurant = useMemo(
    () => restaurants.find((restaurant) => restaurant.id === activeOrder?.restaurantId),
    [activeOrder, restaurants],
  );

  const routeOrigin = activeRestaurant?.position ?? restaurants[0]?.position ?? PUYO_CENTER;
  const routeDestination = activeOrder?.destination ?? selectedLandmark?.position;
  const directionsUrl = openStreetMapUrl(routeOrigin, routeDestination);

  useEffect(() => {
    const element = mapElementRef.current;
    if (!element || mapRef.current) return;

    const map = L.map(element, {
      attributionControl: true,
      minZoom: 11,
      zoomControl: true,
    }).setView([PUYO_CENTER.lat, PUYO_CENTER.lng], 13);

    const tileLayer = L.tileLayer(OSM_TILE_URL, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    });
    tileLayer.on('tileerror', () => setTileError(true));
    tileLayer.on('load', () => setTileError(false));
    tileLayer.addTo(map);
    mapRef.current = map;

    const resizeTimer = window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
      window.clearTimeout(resizeTimer);
      overlaysRef.current = [];
      mapRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    overlaysRef.current.forEach((layer) => layer.removeFrom(map));
    overlaysRef.current = [];

    restaurants.forEach((restaurant) => {
      const isActive = activeOrder?.restaurantId === restaurant.id;
      const marker = L.marker([restaurant.position.lat, restaurant.position.lng], {
        icon: markerIcon('🍽️', isActive ? '#059669' : '#f97316', isActive),
        keyboard: true,
        title: restaurant.name,
      }).addTo(map);
      overlaysRef.current.push(marker);
    });

    landmarks.forEach((landmark) => {
      const isSelected = landmark.id === selectedLandmarkId;
      const isDestination = landmark.id === activeOrder?.deliveryLandmarkId;
      const marker = L.marker([landmark.position.lat, landmark.position.lng], {
        icon: markerIcon('●', isDestination ? '#ef4444' : isSelected ? '#10b981' : '#0f766e', isSelected || isDestination),
        keyboard: true,
        title: landmark.name,
      }).addTo(map);
      marker.on('click', () => selectLandmark(landmark.id));
      overlaysRef.current.push(marker);
    });

    if (routeDestination) {
      const route = L.polyline(
        [
          [routeOrigin.lat, routeOrigin.lng],
          [routeDestination.lat, routeDestination.lng],
        ],
        {
          color: '#059669',
          dashArray: activeOrder ? undefined : '8 8',
          opacity: 0.9,
          weight: 5,
        },
      ).addTo(map);
      overlaysRef.current.push(route);

      if (activeOrder?.status === 'picked_up') {
        const progress = Math.min(1, Math.max(0, activeOrder.routeProgress / 100));
        const riderPosition: Coordinates = {
          lat: routeOrigin.lat + (routeDestination.lat - routeOrigin.lat) * progress,
          lng: routeOrigin.lng + (routeDestination.lng - routeOrigin.lng) * progress,
        };
        const rider = L.marker([riderPosition.lat, riderPosition.lng], {
          icon: markerIcon('🏍️', '#047857', true),
          title: 'Repartidor en ruta',
        }).addTo(map);
        overlaysRef.current.push(rider);
      }

      map.fitBounds(route.getBounds(), { maxZoom: 15, padding: [55, 55] });
    }
  }, [
    activeOrder,
    landmarks,
    restaurants,
    routeDestination,
    routeOrigin,
    selectLandmark,
    selectedLandmarkId,
  ]);

  return (
    <Card className="overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <LocateFixed className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Mapa de entregas en Puyo</h2>
            <p className="text-xs text-slate-500">OpenStreetMap con restaurantes, destinos y ruta activa.</p>
          </div>
        </div>
        {activeOrder ? <Badge tone="emerald">Pedido #{String(activeOrder.id).padStart(6, '0')}</Badge> : <Badge>Sin pedido activo</Badge>}
      </header>

      <div className="relative min-h-[420px] bg-[#e8f3ec]">
        <div ref={mapElementRef} className="absolute inset-0 z-0" aria-label="Mapa interactivo de Puyo" />
        {tileError && (
          <div className="absolute inset-x-4 top-4 z-[500] rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 shadow-sm">
            No se pudieron descargar algunas calles. Los destinos registrados continúan disponibles en el mapa.
          </div>
        )}
      </div>

      <section className="grid gap-3 border-t border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[1fr_auto]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={activeOrder ? 'emerald' : 'amber'}>{activeOrder ? 'Flujo activo' : 'Destino seleccionado'}</Badge>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {activeOrder?.deliveryLandmark ?? selectedLandmark?.name ?? 'Selecciona un punto'}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {activeOrder
              ? `${activeOrder.restaurantName} · ${activeOrder.distanceKm.toFixed(2)} km · $${activeOrder.commission.toFixed(2)} comisión`
              : selectedLandmark?.description ?? 'Selecciona un punto de referencia en el mapa.'}
          </p>
        </div>
      </section>

      <footer className="grid gap-3 border-t border-slate-100 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <Store className="h-4 w-4 text-orange-500" />
          <span>{activeRestaurant?.name ?? 'Selecciona o crea un pedido'}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-slate-600 dark:text-slate-300">
          <span className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-emerald-600" />
            {activeOrder?.deliveryLandmark ?? selectedLandmark?.name ?? 'Destino pendiente'}
          </span>
          <a
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
            href={directionsUrl}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink className="h-3 w-3" />
            OpenStreetMap
          </a>
        </div>
      </footer>
    </Card>
  );
}
