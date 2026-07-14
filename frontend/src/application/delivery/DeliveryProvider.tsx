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
  isOnline: boolean;
  landmarks: Landmark[];
  orders: Order[];
  pendingSyncOrders: Order[];
  restaurants: Restaurant[];
  selectedLandmark?: Landmark;
  selectedLandmarkId: string;
  walletBalance: number;
  assignDriver(orderId: string, driverId: string): Promise<void>;
  placeOrder(input: PlaceOrderInput): Promise<void>;
  rechargeRestaurantWallet(amount: number): void;
  resetData(): void;
  selectLandmark(landmarkId: string): void;
  setActiveTab(tab: AppTab): void;
  toggleOnline(): void;
  updateDriverStatus(driverId: string, status: DriverStatus): Promise<void>;
  updateOrderCommission(orderId: string, commission: number): void;
  updateOrderStatus(orderId: string, status: OrderStatus): Promise<void>;
  refreshOrders(): Promise<void>;
}

const DeliveryContext = createContext<DeliveryContextValue | null>(null);

export function DeliveryProvider({ children }: { children: ReactNode }) {
  const { notify } = useToast();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  
  const [walletBalance, setWalletBalance] = useState(35);
  const [isOnline, setIsOnline] = useState(true);
  const [activeTab, setActiveTab] = useState<AppTab>('customer');
  const [selectedLandmarkId, setSelectedLandmarkId] = useState('');

  const selectedLandmark = landmarks.find((l) => String(l.id) === selectedLandmarkId);
  const activeOrder = orders.find((order) => order.status !== 'delivered');
  const pendingSyncOrders: Order[] = [];

  const fetchData = useCallback(async () => {
    try {
      const [resReq, drvReq, lndReq, ordReq] = await Promise.all([
        fetch(`${API_URL}/restaurants`),
        fetch(`${API_URL}/drivers`),
        fetch(`${API_URL}/landmarks`),
        fetch(`${API_URL}/orders`)
      ]);
      if (resReq.ok) setRestaurants(await resReq.json());
      if (drvReq.ok) setDrivers(await drvReq.json());
      if (lndReq.ok) {
        const l = await lndReq.json();
        setLandmarks(l);
        if (l.length > 0 && !l.find((x: any) => String(x.id) === selectedLandmarkId)) {
          setSelectedLandmarkId(String(l[0].id));
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
      const req = await fetch(`${API_URL}/orders`);
      if (req.ok) setOrders(await req.json());
    } catch (e) {
      console.error(e);
    }
  };

  const selectLandmark = (landmarkId: string) => setSelectedLandmarkId(landmarkId);
  const toggleOnline = () => setIsOnline((prev) => !prev);
  const setActiveTabWrapper = (tab: AppTab) => setActiveTab(tab);

  const placeOrder = async (input: PlaceOrderInput) => {
    try {
      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: input.restaurantId,
          restaurantName: input.restaurantName,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          items: input.items,
          deliveryAddress: input.deliveryAddress,
          deliveryLandmarkId: input.landmarkId,
          total: input.items.reduce((acc, curr) => acc + curr.item.price * curr.quantity, 0),
          foodTotal: input.items.reduce((acc, curr) => acc + curr.item.price * curr.quantity, 0),
          commission: 0,
          distanceKm: 2.5
        }),
      });
      if (res.ok) {
        notify('Pedido enviado correctamente.', 'success');
        refreshOrders();
      } else {
        notify('Error al crear pedido.', 'warning');
      }
    } catch (e) {
      notify('Error de red al crear pedido.', 'warning');
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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

  const assignDriver = async (orderId: string, driverId: string) => {
    const driver = drivers.find(d => String(d.id) === driverId);
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/assign-driver`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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

  const updateDriverStatus = async (driverId: string, status: DriverStatus) => {
    try {
      const res = await fetch(`${API_URL}/drivers/${driverId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        const updated = await res.json();
        setDrivers(prev => prev.map(d => String(d.id) === driverId ? updated : d));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateOrderCommission = (orderId: string, commission: number) => {
    notify('Función no implementada en el backend aún', 'info');
  };

  const rechargeRestaurantWallet = (amount: number) => {
    setWalletBalance((prev) => prev + amount);
    notify(`Billetera recargada con $${amount.toFixed(2)}.`, 'success');
  };

  const resetData = () => {
    notify('Reset data no está disponible en modo backend real', 'info');
  };

  const value = useMemo(
    () => ({
      activeOrder,
      activeTab,
      assignDriver,
      drivers,
      isOnline,
      landmarks,
      orders,
      pendingSyncOrders,
      placeOrder,
      rechargeRestaurantWallet,
      resetData,
      restaurants,
      selectLandmark,
      selectedLandmark,
      selectedLandmarkId,
      setActiveTab: setActiveTabWrapper,
      toggleOnline,
      updateDriverStatus,
      updateOrderCommission,
      updateOrderStatus,
      refreshOrders,
    }),
    [
      activeOrder,
      activeTab,
      drivers,
      isOnline,
      landmarks,
      orders,
      pendingSyncOrders,
      restaurants,
      selectedLandmark,
      selectedLandmarkId,
      walletBalance,
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
