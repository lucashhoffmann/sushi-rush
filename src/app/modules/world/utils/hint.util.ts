import { DISHES } from '@/app/modules/menu/constants/menu.constants';
import type { World } from '@/app/modules/world/types/world.types';

// O que o jogador deveria fazer agora, para a dica do HUD. Considera so o que
// nenhum contratado faz por ele. null = nada pendente.
export type Hint =
  'order' | 'cook' | 'pickup' | 'deliver' | 'checkout' | 'delivery';

export function hintOf(world: World): Hint | null {
  const has = (role: string) => world.staff.some((s) => s.role === role);
  if (world.player.carrying.length > 0) return 'deliver';
  if (world.delivery > 0) return 'delivery';
  if (!has('waiter')) {
    if (world.tickets.some((t) => t.state === 'ready')) return 'pickup';
    if (world.customers.some((c) => c.state === 'wantOrder')) return 'order';
  }
  const cooks = world.staff.filter((s) => s.role === 'cook').length;
  const pending = world.tickets.filter(
    (t) => t.state === 'queued' || t.state === 'cooking',
  );
  if (
    pending.length > cooks &&
    pending.some((t) =>
      world.stations.some((s) => s.kind === DISHES[t.dish].station),
    )
  ) {
    return 'cook';
  }
  const cashiers = world.staff.filter((s) => s.role === 'cashier').length;
  if (
    world.registers.some(
      (register, index) => register.customer !== null && index >= cashiers,
    )
  ) {
    return 'checkout';
  }
  return null;
}
