import { ExternalLink, LocateFixed, MapPin, Navigation, Store } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PUYO_CENTER } from '../../../data/seeds';
import type { Coordinates, Landmark, Order, Restaurant } from '../../../domain/entities';
import { useDelivery } from '../../../application/delivery/DeliveryProvider';
import { Card } from '../atoms/Card';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';

type GoogleMarker = {
  setMap(map: GoogleMap | null): void;
};

type GooglePolyline = {
  setMap(map: GoogleMap | null): void;
};

type GoogleMap = {
  setCenter(position: Coordinates): void;
};

type GoogleDirectionsRenderer = {
  setDirections(result: unknown): void;
  setMap(map: GoogleMap | null): void;
};

type GoogleDirectionsService = {
  route(
    request: {
      destination: Coordinates;
      origin: Coordinates;
      travelMode: string;
    },
    callback: (result: unknown, status: string) => void,
  ): void;
};

type GoogleMapsApi = {
  maps: {
    DirectionsRenderer: new (options: { map: GoogleMap; suppressMarkers: boolean }) => GoogleDirectionsRenderer;
    DirectionsService: new () => GoogleDirectionsService;
    Map: new (
      element: HTMLElement,
      options: {
        center: Coordinates;
        disableDefaultUI: boolean;
        mapTypeControl: boolean;
        streetViewControl: boolean;
        styles: Array<Record<string, unknown>>;
        zoom: number;
      },
    ) => GoogleMap;
    Marker: new (options: {
      icon?: string;
      label?: string;
      map: GoogleMap;
      position: Coordinates;
      title: string;
    }) => GoogleMarker;
    Polyline: new (options: {
      geodesic: boolean;
      map: GoogleMap;
      path: Coordinates[];
      strokeColor: string;
      strokeOpacity: number;
      strokeWeight: number;
    }) => GooglePolyline;
    TravelMode: {
      DRIVING: string;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleMapsApi;
    puyoExpressGoogleMapsReady?: () => void;
  }
}

const GOOGLE_MAPS_SCRIPT_ID = 'puyo-express-google-maps';

function loadGoogleMaps(apiKey: string): Promise<GoogleMapsApi> {
  if (window.google) return Promise.resolve(window.google);

  return new Promise((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);
    if (existingScript) {
      window.puyoExpressGoogleMapsReady = () => {
        if (window.google) resolve(window.google);
      };
      return;
    }

    window.puyoExpressGoogleMapsReady = () => {
      if (window.google) resolve(window.google);
      else reject(new Error('Google Maps no se cargó correctamente.'));
    };

    const script = document.createElement('script');
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey,
    )}&callback=puyoExpressGoogleMapsReady`;
    script.onerror = () => reject(new Error('No se pudo cargar Google Maps.'));
    document.head.appendChild(script);
  });
}

function googleMapsDirectionsUrl(origin: Coordinates, destination: Coordinates) {
  const originParam = `${origin.lat},${origin.lng}`;
  const destinationParam = `${destination.lat},${destination.lng}`;
  return `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destinationParam}&travelmode=driving`;
}

const MAP_BOUNDS = {
  north: -1.46,
  south: -1.525,
  east: -77.96,
  west: -78.025,
};

function projectToMap(position: Coordinates) {
  const x = ((position.lng - MAP_BOUNDS.west) / (MAP_BOUNDS.east - MAP_BOUNDS.west)) * 100;
  const y = ((MAP_BOUNDS.north - position.lat) / (MAP_BOUNDS.north - MAP_BOUNDS.south)) * 100;

  return {
    x: Math.min(96, Math.max(4, x)),
    y: Math.min(96, Math.max(4, y)),
  };
}

function LocalDemoMap({
  activeOrder,
  activeRestaurant,
  landmarks,
  restaurants,
  selectLandmark,
  selectedLandmarkId,
}: {
  activeOrder?: Order;
  activeRestaurant?: Restaurant;
  landmarks: Landmark[];
  restaurants: Restaurant[];
  selectLandmark: (landmarkId: string) => void;
  selectedLandmarkId: string;
}) {
  const origin = activeRestaurant?.position ?? restaurants[0]?.position;
  const destination = activeOrder?.destination;
  const originPoint = origin ? projectToMap(origin) : null;
  const destinationPoint = destination ? projectToMap(destination) : null;
  const riderPoint =
    originPoint && destinationPoint && activeOrder?.status === 'picked_up'
      ? {
          x: originPoint.x + (destinationPoint.x - originPoint.x) * (activeOrder.routeProgress / 100),
          y: originPoint.y + (destinationPoint.y - originPoint.y) * (activeOrder.routeProgress / 100),
        }
      : null;

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#e8f3ec]">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,.06)_1px,transparent_1px),linear-gradient(0deg,rgba(15,23,42,.06)_1px,transparent_1px)] bg-[size:36px_36px]" />
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
        <path
          d="M 77 -8 C 72 12 66 24 68 38 C 72 60 86 70 81 108"
          fill="none"
          stroke="#38bdf8"
          strokeLinecap="round"
          strokeWidth="5"
        />
        <path d="M -5 74 C 22 68 36 70 54 58 C 70 48 82 55 105 62" fill="none" stroke="#cbd5e1" strokeWidth="3" />
        <path d="M 12 36 L 76 36" fill="none" stroke="#d7dee8" strokeWidth="2.5" />
        <path d="M 45 -5 C 47 20 45 45 48 105" fill="none" stroke="#d7dee8" strokeWidth="2.5" />
        <path d="M 8 18 C 22 9 37 12 52 18 C 66 24 84 18 98 10 L 105 -5 L -5 -5 Z" fill="#bbf7d0" opacity=".45" />
        <path d="M -5 98 C 18 84 35 90 52 86 C 68 82 82 88 105 78 L 105 105 L -5 105 Z" fill="#bbf7d0" opacity=".48" />

        {originPoint && destinationPoint && (
          <line
            stroke="#059669"
            strokeDasharray="3 3"
            strokeLinecap="round"
            strokeWidth="1.7"
            x1={originPoint.x}
            x2={destinationPoint.x}
            y1={originPoint.y}
            y2={destinationPoint.y}
          />
        )}
      </svg>

      {restaurants.map((restaurant) => {
        const point = projectToMap(restaurant.position);
        const isActive = activeOrder?.restaurantId === restaurant.id;

        return (
          <div
            key={restaurant.id}
            className={`absolute z-20 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg border-2 border-white text-lg shadow-md ${
              isActive ? 'bg-emerald-600 text-white ring-4 ring-emerald-300/40' : 'bg-orange-500 text-white'
            }`}
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
            title={restaurant.name}
          >
            {restaurant.logo}
          </div>
        );
      })}

      {landmarks.map((landmark) => {
        const point = projectToMap(landmark.position);
        const isSelected = selectedLandmarkId === landmark.id;
        const isDestination = activeOrder?.deliveryLandmarkId === landmark.id;

        return (
          <button
            key={landmark.id}
            className={`absolute z-30 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white p-1.5 shadow-md transition hover:scale-110 ${
              isDestination ? 'bg-red-500 text-white' : isSelected ? 'bg-amber-400 text-amber-950' : 'bg-white text-emerald-700'
            }`}
            onClick={() => selectLandmark(landmark.id)}
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
            title={landmark.name}
            type="button"
          >
            <MapPin className="h-4 w-4" />
          </button>
        );
      })}

      {riderPoint && (
        <div
          className="absolute z-40 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-emerald-600 px-2 py-1 text-lg text-white shadow-lg transition-all duration-300"
          style={{ left: `${riderPoint.x}%`, top: `${riderPoint.y}%` }}
          title="Repartidor en ruta"
        >
          🏍️
        </div>
      )}

      <div className="absolute left-3 top-3 z-40 rounded-lg border border-white/70 bg-white/90 p-3 text-xs text-slate-600 shadow-sm backdrop-blur">
        <p className="font-bold text-slate-900">Mapa demo de Puyo</p>
        <p>Funciona sin API key. Los puntos usan latitud/longitud reales.</p>
      </div>
    </div>
  );
}

export function DeliveryMap() {
  const {
    activeOrder,
    assignDriver,
    drivers,
    landmarks,
    restaurants,
    selectLandmark,
    selectedLandmark,
    selectedLandmarkId,
    setActiveTab,
    simulateDemoOrder,
    updateOrderStatus,
  } = useDelivery();
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<GoogleMap | null>(null);
  const markersRef = useRef<GoogleMarker[]>([]);
  const routeRef = useRef<GooglePolyline | GoogleDirectionsRenderer | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const activeRestaurant = useMemo(
    () => restaurants.find((restaurant) => restaurant.id === activeOrder?.restaurantId),
    [activeOrder, restaurants],
  );

  const routeOrigin = activeRestaurant?.position ?? restaurants[0]?.position ?? PUYO_CENTER;
  const routeDestination = activeOrder?.destination ?? selectedLandmark?.position ?? PUYO_CENTER;
  const availableDriver = drivers.find((driver) => driver.status === 'active');

  useEffect(() => {
    if (!apiKey || !mapElementRef.current) return;

    let cancelled = false;

    loadGoogleMaps(apiKey)
      .then((googleApi) => {
        if (cancelled || !mapElementRef.current) return;

        if (!mapRef.current) {
          mapRef.current = new googleApi.maps.Map(mapElementRef.current, {
            center: PUYO_CENTER,
            disableDefaultUI: false,
            mapTypeControl: false,
            streetViewControl: false,
            styles: [
              { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
              { featureType: 'transit', stylers: [{ visibility: 'simplified' }] },
            ],
            zoom: 13,
          });
        }

        const map = mapRef.current;
        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = [];
        routeRef.current?.setMap(null);
        routeRef.current = null;

        restaurants.forEach((restaurant) => {
          markersRef.current.push(
            new googleApi.maps.Marker({
              label: restaurant.logo,
              map,
              position: restaurant.position,
              title: restaurant.name,
            }),
          );
        });

        landmarks.forEach((landmark) => {
          const marker = new googleApi.maps.Marker({
            icon:
              landmark.id === selectedLandmarkId
                ? 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png'
                : 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
            map,
            position: landmark.position,
            title: landmark.name,
          });

          const clickableMarker = marker as GoogleMarker & { addListener?: (event: string, handler: () => void) => void };
          clickableMarker.addListener?.('click', () => selectLandmark(landmark.id));
          markersRef.current.push(marker);
        });

        if (activeOrder && activeRestaurant) {
          const renderer = new googleApi.maps.DirectionsRenderer({ map, suppressMarkers: true });
          const service = new googleApi.maps.DirectionsService();
          service.route(
            {
              destination: activeOrder.destination,
              origin: activeRestaurant.position,
              travelMode: googleApi.maps.TravelMode.DRIVING,
            },
            (result, status) => {
              if (status === 'OK') {
                renderer.setDirections(result);
                routeRef.current = renderer;
                return;
              }

              renderer.setMap(null);
              routeRef.current = new googleApi.maps.Polyline({
                geodesic: true,
                map,
                path: [activeRestaurant.position, activeOrder.destination],
                strokeColor: '#059669',
                strokeOpacity: 0.9,
                strokeWeight: 4,
              });
            },
          );
        } else {
          map.setCenter(selectedLandmark?.position ?? PUYO_CENTER);
        }
      })
      .catch((error: unknown) => {
        setMapError(error instanceof Error ? error.message : 'No se pudo inicializar el mapa.');
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeOrder,
    activeRestaurant,
    apiKey,
    landmarks,
    restaurants,
    selectLandmark,
    selectedLandmark,
    selectedLandmarkId,
  ]);

  const directionsUrl = googleMapsDirectionsUrl(routeOrigin, routeDestination);
  const mapAction = (() => {
    if (!activeOrder) {
      return {
        disabled: false,
        label: selectedLandmark ? `Crear demo a ${selectedLandmark.name}` : 'Crear pedido demo',
        run: simulateDemoOrder,
      };
    }

    if (activeOrder.status === 'pending') {
      return {
        disabled: false,
        label: 'Aceptar pedido',
        run: () => updateOrderStatus(activeOrder.id, 'accepted'),
      };
    }

    if (activeOrder.status === 'accepted') {
      return {
        disabled: false,
        label: 'Empezar cocina',
        run: () => updateOrderStatus(activeOrder.id, 'preparing'),
      };
    }

    if (activeOrder.status === 'preparing') {
      return {
        disabled: false,
        label: 'Marcar listo',
        run: () => updateOrderStatus(activeOrder.id, 'ready_for_pickup'),
      };
    }

    if (activeOrder.status === 'ready_for_pickup' && !activeOrder.driverId) {
      return {
        disabled: !availableDriver,
        label: availableDriver ? `Asignar ${availableDriver.name.split(' ')[0]}` : 'Sin repartidor disponible',
        run: () => availableDriver && assignDriver(activeOrder.id, availableDriver.id),
      };
    }

    if (activeOrder.status === 'ready_for_pickup' && activeOrder.driverId) {
      return {
        disabled: false,
        label: 'Recoger pedido',
        run: () => updateOrderStatus(activeOrder.id, 'picked_up'),
      };
    }

    if (activeOrder.status === 'picked_up') {
      return {
        disabled: activeOrder.routeProgress < 100,
        label: activeOrder.routeProgress < 100 ? `En ruta ${Math.round(activeOrder.routeProgress)}%` : 'Entregar pedido',
        run: () => updateOrderStatus(activeOrder.id, 'delivered'),
      };
    }

    return {
      disabled: false,
      label: 'Crear otro demo',
      run: simulateDemoOrder,
    };
  })();

  return (
    <Card className="overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <LocateFixed className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Mapa de entregas en Puyo</h2>
            <p className="text-xs text-slate-500">Google Maps con restaurantes, destinos y ruta activa.</p>
          </div>
        </div>
        {activeOrder ? <Badge tone="emerald">Pedido #{activeOrder.id.slice(-6)}</Badge> : <Badge>Sin pedido activo</Badge>}
      </header>

      <div className="relative min-h-[420px] bg-slate-100">
        {apiKey ? (
          <>
            <div ref={mapElementRef} className="absolute inset-0" />
            {mapError && (
              <LocalDemoMap
                activeOrder={activeOrder}
                activeRestaurant={activeRestaurant}
                landmarks={landmarks}
                restaurants={restaurants}
                selectLandmark={selectLandmark}
                selectedLandmarkId={selectedLandmarkId}
              />
            )}
            {mapError && (
              <div className="absolute inset-x-4 top-4 z-50 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 shadow-sm">
                {mapError}. Mostrando mapa demo local.
              </div>
            )}
          </>
        ) : (
          <LocalDemoMap
            activeOrder={activeOrder}
            activeRestaurant={activeRestaurant}
            landmarks={landmarks}
            restaurants={restaurants}
            selectLandmark={selectLandmark}
            selectedLandmarkId={selectedLandmarkId}
          />
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
              : selectedLandmark?.description ?? 'Haz click en un pin del mapa para cambiar el destino demo.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          <Button disabled={mapAction.disabled} onClick={mapAction.run}>
            {mapAction.label}
          </Button>
          <Button onClick={() => setActiveTab(activeOrder ? 'restaurant' : 'customer')} variant="secondary">
            Abrir panel
          </Button>
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
          <a className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800" href={directionsUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="h-3 w-3" />
            Google Maps
          </a>
        </div>
      </footer>
    </Card>
  );
}
