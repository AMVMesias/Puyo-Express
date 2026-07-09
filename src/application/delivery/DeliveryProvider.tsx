import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  assignDriverToOrder,
  completeDriverDelivery,
  createOrder,
  debitWallet,
  isInsideDriverRadius,
  rechargeWallet,
  updateDriverStatus as applyDriverStatus,
  updateOrderStatus as applyOrderStatus,
} from '../../domain/useCases';
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
import {
  LocalDriverRepository,
  LocalOrderRepository,
  LocalRestaurantRepository,
  StaticLandmarkRepository,
} from '../../data/repositories';
import { LocalStorageGateway } from '../../data/storage';
import { useToast } from '../toast/ToastProvider';

const WALLET_KEY = 'pe_v2_wallet_balance';
const INITIAL_WALLET_BALANCE = 35;

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
  assignDriver(orderId: string, driverId: string): void;
  placeOrder(input: PlaceOrderInput): void;
  rechargeRestaurantWallet(amount: number): void;
  resetData(): void;
  selectLandmark(landmarkId: string): void;
  setActiveTab(tab: AppTab): void;
  simulateDemoOrder(): void;
  toggleOnline(): void;
  updateDriverStatus(driverId: string, status: DriverStatus): void;
  updateOrderCommission(orderId: string, commission: number): void;
  updateOrderStatus(orderId: string, status: OrderStatus): void;
}

const DeliveryContext = createContext<DeliveryContextValue | null>(null);

export function DeliveryProvider({ children }: { children: ReactNode }) {
  const { notify } = useToast();
  const repositories = useMemo(() => {
    const storage = new LocalStorageGateway();
    return {
      drivers: new LocalDriverRepository(storage),
      landmarks: new StaticLandmarkRepository(),
      orders: new LocalOrderRepository(storage),
      restaurants: new LocalRestaurantRepository(storage),
      storage,
    };
  }, []);

  const [restaurants, setRestaurants] = useState<Restaurant[]>(() =>
    repositories.restaurants.getRestaurants(),
  );
  const [drivers, setDrivers] = useState<Driver[]>(() => repositories.drivers.getDrivers());
  const [orders, setOrders] = useState<Order[]>(() => repositories.orders.getOrders());
  const [walletBalance, setWalletBalance] = useState(() =>
    repositories.storage.get<number>(WALLET_KEY, INITIAL_WALLET_BALANCE),
  );
  const [isOnline, setIsOnline] = useState(true);
  const [activeTab, setActiveTab] = useState<AppTab>('customer');
  const [selectedLandmarkId, setSelectedLandmarkId] = useState('l4');

  const landmarks = useMemo(() => repositories.landmarks.getLandmarks(), [repositories]);
  const selectedLandmark = landmarks.find((landmark) => landmark.id === selectedLandmarkId);
  const activeOrder = orders.find((order) => order.status !== 'delivered');
  const pendingSyncOrders = orders.filter((order) => order.isOfflinePending);

  useEffect(() => repositories.restaurants.saveRestaurants(restaurants), [repositories, restaurants]);
  useEffect(() => repositories.drivers.saveDrivers(drivers), [drivers, repositories]);
  useEffect(() => repositories.orders.saveOrders(orders), [orders, repositories]);
  useEffect(() => repositories.storage.set(WALLET_KEY, walletBalance), [repositories, walletBalance]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setOrders((currentOrders) => {
        const nextOrders = currentOrders.map((order) => {
          if (order.status !== 'picked_up' || order.routeProgress >= 100) return order;
          return {
            ...order,
            routeProgress: Math.min(order.routeProgress + 10, 100),
          };
        });

        return nextOrders.some((order, index) => order !== currentOrders[index])
          ? nextOrders
          : currentOrders;
      });
    }, 1200);

    return () => window.clearInterval(intervalId);
  }, []);

  const selectLandmark = (landmarkId: string) => setSelectedLandmarkId(landmarkId);

  const toggleOnline = () => {
    setIsOnline((currentOnline) => {
      const nextOnline = !currentOnline;

      if (nextOnline) {
        setOrders((currentOrders) =>
          currentOrders.map((order) =>
            order.isOfflinePending
              ? { ...order, isOfflinePending: false, synchronized: true }
              : order,
          ),
        );
        notify('Conexión restablecida. Pedidos sincronizados.', 'success');
      } else {
        notify('Modo fuera de línea activado. Los cambios se guardarán localmente.', 'warning');
      }

      return nextOnline;
    });
  };

  const placeOrder = (input: PlaceOrderInput) => {
    const restaurant = restaurants.find((item) => item.id === input.restaurantId);
    const landmark = landmarks.find((item) => item.id === input.landmarkId);

    if (!restaurant || !landmark) {
      notify('No se pudo crear el pedido porque faltan datos de ubicación.', 'warning');
      return;
    }

    const newOrder = createOrder(input, restaurant, landmark, isOnline);
    setOrders((currentOrders) => [newOrder, ...currentOrders]);
    setSelectedLandmarkId(landmark.id);
    notify(isOnline ? 'Pedido enviado en tiempo real.' : 'Pedido guardado sin conexión.', 'success');
  };

  const simulateDemoOrder = () => {
    const restaurant = restaurants[0];
    const landmark = landmarks.find((item) => item.id === selectedLandmarkId) ?? landmarks[3] ?? landmarks[0];

    if (!restaurant || !landmark || restaurant.menu.length === 0) {
      notify('No hay datos suficientes para simular un pedido.', 'warning');
      return;
    }

    const demoOrder = createOrder(
      {
        customerName: 'Denise Turista',
        customerPhone: '0981234567',
        deliveryAddress: 'Habitación 203, referencia principal del hospedaje',
        items: [
          { item: restaurant.menu[0], quantity: 1 },
          ...(restaurant.menu[2] ? [{ item: restaurant.menu[2], quantity: 2 }] : []),
        ],
        landmarkId: landmark.id,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
      },
      restaurant,
      landmark,
      isOnline,
    );

    setOrders((currentOrders) => [demoOrder, ...currentOrders]);
    setSelectedLandmarkId(landmark.id);
    setActiveTab('restaurant');
    notify('Pedido demo creado. Continúa el flujo desde Restaurante.', 'success');
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    const targetOrder = orders.find((order) => order.id === orderId);
    if (!targetOrder) return;

    const updatedOrder = applyOrderStatus(targetOrder, status, isOnline);
    setOrders((currentOrders) =>
      currentOrders.map((order) => (order.id === orderId ? updatedOrder : order)),
    );

    if (status === 'picked_up' && targetOrder.driverId) {
      setDrivers((currentDrivers) =>
        currentDrivers.map((driver) =>
          driver.id === targetOrder.driverId ? applyDriverStatus(driver, 'delivering') : driver,
        ),
      );
    }

    if (status === 'delivered' && targetOrder.driverId) {
      setDrivers((currentDrivers) =>
        currentDrivers.map((driver) =>
          driver.id === targetOrder.driverId
            ? completeDriverDelivery(driver, targetOrder.commission)
            : driver,
        ),
      );
    }

    notify(
      isOnline
        ? `Pedido actualizado a ${status.replaceAll('_', ' ')}.`
        : 'Estado guardado en modo fuera de línea.',
      status === 'delivered' ? 'success' : 'info',
    );
  };

  const assignDriver = (orderId: string, driverId: string) => {
    const targetOrder = orders.find((order) => order.id === orderId);
    const driver = drivers.find((item) => item.id === driverId);
    const restaurant = restaurants.find((item) => item.id === targetOrder?.restaurantId);

    if (!targetOrder || !driver || !restaurant) return;

    if (driver.status !== 'active') {
      notify('El repartidor no está disponible.', 'warning');
      return;
    }

    if (!isInsideDriverRadius(driver, restaurant)) {
      notify('El repartidor está fuera del radio operativo de 5 km.', 'warning');
      return;
    }

    try {
      const nextWalletBalance = debitWallet(walletBalance, targetOrder.commission);
      setWalletBalance(nextWalletBalance);
      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === orderId ? assignDriverToOrder(order, driver, isOnline) : order,
        ),
      );
      setDrivers((currentDrivers) =>
        currentDrivers.map((item) =>
          item.id === driver.id ? applyDriverStatus(item, 'delivering') : item,
        ),
      );
      notify(`Comisión de $${targetOrder.commission.toFixed(2)} debitada de la billetera.`, 'info');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo asignar el repartidor.', 'warning');
    }
  };

  const updateDriverStatus = (driverId: string, status: DriverStatus) => {
    setDrivers((currentDrivers) =>
      currentDrivers.map((driver) =>
        driver.id === driverId ? applyDriverStatus(driver, status) : driver,
      ),
    );
  };

  const updateOrderCommission = (orderId: string, commission: number) => {
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              commission,
              total: Number((order.foodTotal + commission).toFixed(2)),
              synchronized: isOnline,
              isOfflinePending: !isOnline,
            }
          : order,
      ),
    );
    notify(`Comisión actualizada a $${commission.toFixed(2)}.`, 'success');
  };

  const rechargeRestaurantWallet = (amount: number) => {
    setWalletBalance((currentBalance) => rechargeWallet(currentBalance, amount));
    notify(`Billetera recargada con $${amount.toFixed(2)}.`, 'success');
  };

  const resetData = () => {
    setRestaurants(repositories.restaurants.resetRestaurants());
    setDrivers(repositories.drivers.resetDrivers());
    setOrders(repositories.orders.resetOrders());
    setWalletBalance(INITIAL_WALLET_BALANCE);
    setIsOnline(true);
    setActiveTab('customer');
    setSelectedLandmarkId('l4');
    notify('Datos restaurados a los valores iniciales.', 'info');
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
      setActiveTab,
      simulateDemoOrder,
      toggleOnline,
      updateDriverStatus,
      updateOrderCommission,
      updateOrderStatus,
      walletBalance,
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
