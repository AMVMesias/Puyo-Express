import type { OrderStatus } from '../../../domain/entities';
import { Badge } from '../atoms/Badge';

type BadgeTone = 'emerald' | 'amber' | 'slate' | 'blue' | 'red' | 'indigo' | 'orange';

const statusLabel: Record<OrderStatus, string> = {
  accepted: 'Aceptado',
  delivered: 'Entregado',
  pending: 'Pendiente',
  picked_up: 'En camino',
  preparing: 'En cocina',
  ready_for_pickup: 'Listo',
};

const statusTone: Record<OrderStatus, BadgeTone> = {
  accepted: 'indigo',
  delivered: 'slate',
  pending: 'orange',
  picked_up: 'emerald',
  preparing: 'amber',
  ready_for_pickup: 'blue',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={statusTone[status]}>{statusLabel[status]}</Badge>;
}
