import { moveCircle } from '@/app/modules/level/utils/layout.util';
import {
  addFloater,
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
  DELIVERY_REACH,
  MANAGER_REACH,
  PASS_REACH,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  REGISTER_REACH,
  SPRINT_MAX,
  SPRINT_RESET,
  SPRINT_SPEED,
  SPRINT_TIME,
  STATION_REACH,
  TABLE_REACH,
} from '@/app/modules/world/constants/world.constants';
import type { InputState, World } from '@/app/modules/world/types/world.types';

// Gasta uma corrida guardada. A primeira gasta liga a contagem que devolve
// todas. Devolve false se nao deu (ja correndo, sem corrida, dia parado).
export function startSprint(world: World): boolean {
  const { player } = world;
  if (world.status !== 'playing' || player.sprint > 0 || player.sprints === 0) {
    return false;
  }
  player.sprints--;
  player.sprint = SPRINT_TIME;
  if (player.sprintReset === 0) player.sprintReset = SPRINT_RESET;
  return true;
}

// O player atende por proximidade: chegou perto, faz. Nao ha botao de acao:
// a decisao do jogador e para onde ir.
export function stepPlayer(world: World, input: InputState, dt: number): void {
  const { player, layout } = world;
  // diagonal nao anda mais rapido
  const length = Math.hypot(input.moveX, input.moveY);
  const scale = length > 1 ? 1 / length : 1;
  const moveX = input.moveX * scale;
  const moveY = input.moveY * scale;
  player.sprint = Math.max(0, player.sprint - dt);
  if (player.sprintReset > 0) {
    player.sprintReset = Math.max(0, player.sprintReset - dt);
    if (player.sprintReset === 0) player.sprints = SPRINT_MAX;
  }
  const speed =
    PLAYER_SPEED *
    world.mods.playerSpeed *
    (player.sprint > 0 ? SPRINT_SPEED : 1);
  moveCircle(
    layout,
    player.pos,
    moveX * speed * dt,
    moveY * speed * dt,
    PLAYER_RADIUS,
  );
  player.moving = Math.min(1, length);
  if (length > 0.05) player.facing = Math.atan2(moveY, moveX);
  player.action = 'none';

  for (const table of world.tables) {
    if (!within(player.pos, table.pos, TABLE_REACH)) continue;
    const customer = customerOf(world, table.customer);
    if (customer?.state === 'wantOrder') takeOrder(world, customer);
    deliver(world, player.carrying, table);
  }

  for (const ticket of world.tickets) {
    if (ticket.slot === null) continue;
    if (within(player.pos, layout.pass[ticket.slot], PASS_REACH)) {
      pickUp(player.carrying, ticket, world.mods.capacity);
    }
  }

  for (const station of world.stations) {
    if (!within(player.pos, station.front, STATION_REACH)) continue;
    if (workStation(world, station, 1, dt)) {
      player.action = station.kind;
      // vira para a bancada
      player.facing = Math.PI / 2;
    }
  }

  for (const register of world.registers) {
    if (!within(player.pos, register.pos, REGISTER_REACH)) continue;
    if (workRegister(world, register, 1, dt)) player.action = 'register';
  }

  world.atManager = within(player.pos, layout.desk, MANAGER_REACH);

  if (
    world.delivery > 0 &&
    within(player.pos, layout.delivery, DELIVERY_REACH)
  ) {
    world.delivery = 0;
    world.fresh = true;
    addFloater(world, layout.delivery, 'fresh');
  }
}

// mesas dos pratos que o player leva, para a seta de "leve ate la"
export function carriedTables(world: World): number[] {
  return world.player.carrying.flatMap((id) => {
    const ticket = ticketOf(world, id);
    return ticket ? [ticket.table] : [];
  });
}
