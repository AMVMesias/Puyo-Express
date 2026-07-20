import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  AppTab,
  Driver,
  DriverStatus,
  Landmark,
  Order,
  OrderStatus,
  PlaceOrderInput,
  Restaurant,
} from '../../domain/entities';
import { useToast } from '../toast/ToastProvider';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

interface DeliveryContextValue {
  activeOrder?: Order;
  activeTab: AppTab;
  drivers: Driver[];
  landmarks: Landmark[];
  orders: Order[];
  restaurants: Restaurant[];
  selectedLandmark?: Landmark;
  selectedLandmarkId: number | null;
  assignDriver(orderId: number, driverId: number): Promise<void>;
  placeOrder(input: PlaceOrderInput): Promise<boolean>;
  selectLandmark(landmarkId: number): void;
  setActiveTab(tab: AppTab): void;
  updateDriverStatus(driverId: number, status: DriverStatus): Promise<void>;
  updateOrderStatus(orderId: number, status: OrderStatus): Promise<void>;
  refreshOrders(): Promise<void>;
}

const DeliveryContext = createContext<DeliveryContextValue | null>(null);

export function DeliveryProvider({ children }: { children: ReactNode }) {
  const { notify } = useToast();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  
  const [activeTab, setActiveTab] = useState<AppTab>('customer');
  const [selectedLandmarkId, setSelectedLandmarkId] = useState<number | null>(null);

  const selectedLandmark = landmarks.find((landmark) => landmark.id === selectedLandmarkId);
  const activeOrder = orders.find((order) => order.status !== 'delivered');

  const fetchData = useCallback(async () => {
    try {
      const [resReq, drvReq, lndReq, ordReq] = await Promise.all([
        fetch(`${API_URL}/restaurants`, { credentials: 'include' }),
        fetch(`${API_URL}/drivers`, { credentials: 'include' }),
        fetch(`${API_URL}/landmarks`, { credentials: 'include' }),
        fetch(`${API_URL}/orders`, { credentials: 'include' })
      ]);
      if (resReq.ok) setRestaurants(await resReq.json());
      if (drvReq.ok) setDrivers(await drvReq.json());
      if (lndReq.ok) {
        const l = await lndReq.json();
        setLandmarks(l);
        if (l.length > 0 && !l.some((landmark: Landmark) => landmark.id === selectedLandmarkId)) {
          setSelectedLandmarkId(l[0].id);
        }
      }
      if (ordReq.ok) setOrders(await ordReq.json());
    } catch (e) {
      console.error('Error fetching data', e);
    }
  }, [selectedLandmarkId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refreshOrders = async () => {
    try {
      const req = await fetch(`${API_URL}/orders`, { credentials: 'include' });
      if (req.ok) setOrders(await req.json());
    } catch (e) {
      console.error(e);
    }
  };

  const selectLandmark = (landmarkId: number) => setSelectedLandmarkId(landmarkId);
  const setActiveTabWrapper = (tab: AppTab) => setActiveTab(tab);

  const placeOrder = async (input: PlaceOrderInput) => {
    try {
      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          restaurantId: input.restaurantId,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          items: input.items.map((orderItem) => ({
            menuItemId: orderItem.item.id,
            quantity: orderItem.quantity,
          })),
          deliveryAddress: input.deliveryAddress,
          deliveryLandmarkId: input.landmarkId,
        }),
      });
      if (res.ok) {
        notify('Pedido enviado correctamente.', 'success');
        await refreshOrders();
        return true;
      } else {
        const body = await res.json().catch(() => null);
        notify(body?.error ?? 'Error al crear pedido.', 'warning');
        return false;
      }
    } catch (e) {
      notify('Error de red al crear pedido.', 'warning');
      return false;
    }
  };

  const updateOrderStatus = async (orderId: number, status: OrderStatus) => {
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        notify(`Pedido actualizado a ${status}.`, 'success');
        refreshOrders();
      }
    } catch (e) {
      notify('Error al actualizar estado.', 'warning');
    }
  };

  const assignDriver = async (orderId: number, driverId: number) => {
    const driver = drivers.find((candidate) => candidate.id === driverId);
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/assign-driver`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ driverId, driverName: driver?.name })
      });
      if (res.ok) {
        notify('Repartidor asignado con éxito.', 'success');
        refreshOrders();
      }
    } catch (e) {
      notify('Error al asignar repartidor.', 'warning');
    }
  };

  const updateDriverStatus = async (driverId: number, status: DriverStatus) => {
    try {
      const res = await fetch(`${API_URL}/drivers/${driverId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        const updated = await res.json();
        setDrivers((currentDrivers) => currentDrivers.map((driver) => driver.id === driverId ? updated : driver));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const value = useMemo(
    () => ({
      activeOrder,
      activeTab,
      assignDriver,
      drivers,
      landmarks,
      orders,
      placeOrder,
      restaurants,
      selectLandmark,
      selectedLandmark,
      selectedLandmarkId,
      setActiveTab: setActiveTabWrapper,
      updateDriverStatus,
      updateOrderStatus,
      refreshOrders,
    }),
    [
      activeOrder,
      activeTab,
      drivers,
      landmarks,
      orders,
      restaurants,
      selectedLandmark,
      selectedLandmarkId,
    ],
  );

  return <DeliveryContext.Provider value={value}>{children}</DeliveryContext.Provider>;
}

export function useDelivery() {
  const context = useContext(DeliveryContext);
  if (!context) {
    throw new Error('useDelivery debe usarse dentro de DeliveryProvider');
  }
  return context;
}
