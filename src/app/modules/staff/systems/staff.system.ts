import { followPath, tileCenter } from '@/app/modules/level/utils/layout.util';
import { pathBeside, pathTo } from '@/app/modules/level/utils/pathfinding.util';
import { DISHES } from '@/app/modules/menu/constants/menu.constants';
import {
  customerOf,
  deliver,
  pickUp,
  takeOrder,
  ticketOf,
  within,
  workRegister,
  workStation,
} from '@/app/modules/service/systems/service.system';
import {
  PASS_REACH,
  STAFF_SPEED,
  STAFF_SPEED_PER_LEVEL,
  STAFF_TURBO,
  STAFF_WORK,
  STAFF_WORK_PER_LEVEL,
  WAITER_CARRY_EVERY,
} from '@/app/modules/world/constants/world.constants';
import type { Staff, Vec2, World } from '@/app/modules/world/types/world.types';

// Contratados: cada um repete a tarefa da funcao dele. Garcom anota, busca e
// entrega; cozinheiro opera estacao; caixa cobra. Usam os mesmos verbos do
// player (service.system), so mais devagar no nivel 1.

// quantos pratos o garcom leva, pelo nivel
export const waiterCapacity = (level: number) =>
  1 + Math.floor((level - 1) / WAITER_CARRY_EVERY);

// Onde cada contratado comeca o dia e fica quando nao tem o que fazer:
// garcons na frente do passa-pratos, cozinheiros no corredor da cozinha,
// caixa atras do caixa dele.
export function restSpot(world: World, staff: Staff): Vec2 {
  const index = world.staff
    .filter((other) => other.role === staff.role)
    .indexOf(staff);
  const { layout } = world;
  if (staff.role === 'waiter') {
    return tileCenter(2 + 2 * index, layout.kitchenY - 1);
  }
  if (staff.role === 'cook') {
    return tileCenter(2 + 2 * index, layout.kitchenY + 1);
  }
  return (
    world.registers[index]?.back ?? tileCenter(layout.salonW - 1, 9 + index)
  );
}

// vai para `to`; devolve se ja esta la
function goTo(world: World, staff: Staff, to: Vec2): boolean {
  if (within(staff.pos, to, 0.05)) return true;
  if (staff.path.length === 0) {
    staff.path = pathTo(world.layout, staff.pos, to) ?? [];
  }
  return false;
}

function stepWaiter(world: World, staff: Staff): void {
  const { task } = staff;
  // a tarefa ainda vale?
  if (task?.kind === 'order') {
    if (customerOf(world, task.customer)?.state !== 'wantOrder') {
      staff.task = null;
    }
  } else if (task?.kind === 'pickup') {
    if (ticketOf(world, task.ticket)?.state !== 'ready') staff.task = null;
  } else if (task?.kind === 'deliver') {
    const carries = staff.carrying.some(
      (id) => ticketOf(world, id)?.table === task.table,
    );
    if (!carries) staff.task = null;
  }

  if (!staff.task) {
    staff.path = [];
    const carried = ticketOf(world, staff.carrying[0]);
    const ready = world.tickets.find(
      (ticket) => ticket.state === 'ready' && ticket.claimedBy === null,
    );
    const asking = world.customers.find(
      (customer) =>
        customer.state === 'wantOrder' && customer.claimedBy === null,
    );
    if (carried) {
      const table = world.tables.find((t) => t.id === carried.table);
      const path = table && pathBeside(world.layout, staff.pos, table.pos);
      if (table && path) {
        staff.task = { kind: 'deliver', table: table.id };
        staff.path = path;
      }
    } else if (ready && ready.slot !== null) {
      // de frente para o lugar do prato no passa-pratos
      const spot = world.layout.pass[ready.slot];
      const path = pathTo(world.layout, staff.pos, {
        x: spot.x,
        y: spot.y - 1,
      });
      if (path) {
        ready.claimedBy = staff.id;
        staff.task = { kind: 'pickup', ticket: ready.id };
        staff.path = path;
      }
    } else if (asking) {
      const table = world.tables.find((t) => t.id === asking.table);
      const path = table && pathBeside(world.layout, staff.pos, table.pos);
      if (path) {
        asking.claimedBy = staff.id;
        staff.task = { kind: 'order', customer: asking.id };
        staff.path = path;
      }
    }
  }

  const current = staff.task;
  if (!current) {
    goTo(world, staff, restSpot(world, staff));
    return;
  }
  if (staff.path.length > 0) return;
  // chegou
  if (current.kind === 'order') {
    const customer = customerOf(world, current.customer);
    if (customer) takeOrder(world, customer);
  } else if (current.kind === 'pickup') {
    const capacity = waiterCapacity(staff.level);
    const ticket = ticketOf(world, current.ticket);
    if (ticket) pickUp(staff.carrying, ticket, capacity);
    // aproveita a viagem: outros prontos ao alcance, sem dono
    for (const other of world.tickets) {
      if (other.slot === null || other.claimedBy !== null) continue;
      if (within(staff.pos, world.layout.pass[other.slot], PASS_REACH * 2)) {
        pickUp(staff.carrying, other, capacity);
      }
    }
  } else if (current.kind === 'deliver') {
    const table = world.tables.find((t) => t.id === current.table);
    if (table) deliver(world, staff.carrying, table);
  }
  staff.task = null;
}

function stepCook(world: World, staff: Staff, work: number, dt: number): void {
  const queued = (kind: string) =>
    world.tickets.filter(
      (ticket) =>
        ticket.state === 'queued' && DISHES[ticket.dish].station === kind,
    ).length;
  const target = staff.task?.kind === 'cook' ? staff.task.station : -1;
  let station = world.stations.find((s) => s.id === target);
  // a estacao ainda tem o que fazer?
  if (station && station.ticket === null && queued(station.kind) === 0) {
    station = undefined;
    staff.task = null;
    staff.path = [];
  }
  if (!station) {
    const targeted = new Set(
      world.staff.flatMap((other) =>
        other !== staff && other.task?.kind === 'cook'
          ? [other.task.station]
          : [],
      ),
    );
    const free = world.stations.filter((s) => !targeted.has(s.id));
    // preparo parado no meio vem antes; depois, comanda na fila que ninguem
    // esta indo fazer
    station =
      free.find((s) => s.ticket !== null) ??
      free.find((s) => {
        const going = world.stations.filter(
          (other) =>
            other.kind === s.kind &&
            other.ticket === null &&
            targeted.has(other.id),
        ).length;
        return queued(s.kind) > going;
      });
    if (!station) {
      goTo(world, staff, restSpot(world, staff));
      return;
    }
    staff.task = { kind: 'cook', station: station.id };
    staff.path = [];
  }
  if (!goTo(world, staff, station.front)) return;
  staff.facing = Math.PI / 2;
  if (workStation(world, station, work, dt)) staff.action = station.kind;
}

function stepCashier(
  world: World,
  staff: Staff,
  work: number,
  dt: number,
): void {
  const index = world.staff
    .filter((other) => other.role === 'cashier')
    .indexOf(staff);
  const register = world.registers[index];
  if (!goTo(world, staff, restSpot(world, staff)) || !register) return;
  // de frente para o caixa, que fica a esquerda
  staff.facing = Math.PI;
  if (workRegister(world, register, work, dt)) staff.action = 'register';
}

export function stepStaff(world: World, dt: number): void {
  const turbo = world.boosts.staffTurbo > 0 ? STAFF_TURBO : 1;
  for (const staff of world.staff) {
    const speed =
      (STAFF_SPEED + STAFF_SPEED_PER_LEVEL * (staff.level - 1)) * turbo;
    const work =
      (STAFF_WORK + STAFF_WORK_PER_LEVEL * (staff.level - 1)) * turbo;
    staff.action = 'none';
    if (staff.role === 'waiter') stepWaiter(world, staff);
    else if (staff.role === 'cook') stepCook(world, staff, work, dt);
    else stepCashier(world, staff, work, dt);
    followPath(staff, speed, dt);
  }
}
