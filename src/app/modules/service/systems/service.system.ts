import { pathTo } from '@/app/modules/level/utils/pathfinding.util';
import { DISHES } from '@/app/modules/menu/constants/menu.constants';
import { claimTip } from '@/app/modules/vault/systems/vault.system';
import {
  CHECKOUT_TIME,
  COMBO_MAX,
  COMBO_STEP,
  CUSTOMER_KINDS,
  EAT_TIME,
  FOOD_RELIEF,
  FRESH_BONUS,
  KITCHEN_TURBO,
  ORDER_RELIEF,
  REPUTATION_GAIN,
  REPUTATION_LOSS,
  REPUTATION_MAX,
  TIP_RATE,
} from '@/app/modules/world/constants/world.constants';
import type {
  Customer,
  FloaterKind,
  Register,
  Station,
  Table,
  Ticket,
  Vec2,
  World,
} from '@/app/modules/world/types/world.types';
import { clamp, distance } from '@/shared/utils/math.util';

// Os verbos do atendimento. Player e contratados chamam as mesmas funcoes:
// quem faz muda so a velocidade.

export const customerOf = (world: World, id: number | null) =>
  world.customers.find((customer) => customer.id === id);
export const ticketOf = (world: World, id: number | null) =>
  world.tickets.find((ticket) => ticket.id === id);

export function addFloater(
  world: World,
  pos: Vec2,
  kind: FloaterKind,
  amount = 0,
): void {
  world.floaters.push({
    id: world.nextId++,
    pos: { ...pos },
    kind,
    amount,
    age: 0,
  });
}

function addReputation(world: World, amount: number): void {
  world.reputation = clamp(world.reputation + amount, 0, REPUTATION_MAX);
}

// Anota o pedido da mesa: cada prato vira uma comanda na fila da cozinha.
export function takeOrder(world: World, customer: Customer): void {
  if (customer.state !== 'wantOrder' || customer.table === null) return;
  customer.state = 'waitFood';
  customer.claimedBy = null;
  customer.patience = Math.min(1, customer.patience + ORDER_RELIEF);
  for (const dish of customer.orders) {
    world.tickets.push({
      id: world.nextId++,
      dish,
      customer: customer.id,
      table: customer.table,
      state: 'queued',
      progress: 0,
      slot: null,
      claimedBy: null,
    });
  }
}

// Trabalha na estacao por `dt`: pega a comanda mais antiga do tipo dela, se
// esta parada, e avanca o preparo. Pronto, o prato vai para o passa-pratos;
// sem lugar la, fica esperando na estacao. Devolve se havia o que fazer.
export function workStation(
  world: World,
  station: Station,
  speed: number,
  dt: number,
): boolean {
  if (station.busy) return false;
  let ticket = ticketOf(world, station.ticket);
  if (!ticket) {
    ticket = world.tickets.find(
      (candidate) =>
        candidate.state === 'queued' &&
        DISHES[candidate.dish].station === station.kind,
    );
    if (!ticket) return false;
    ticket.state = 'cooking';
    station.ticket = ticket.id;
  }
  station.busy = true;
  const turbo = world.boosts.kitchenTurbo > 0 ? KITCHEN_TURBO : 1;
  ticket.progress = Math.min(
    1,
    ticket.progress + (dt * speed * turbo) / DISHES[ticket.dish].prep,
  );
  if (ticket.progress < 1) return true;
  // lugar livre mais perto da estacao
  const taken = new Set(world.tickets.map((other) => other.slot));
  let slot = -1;
  world.layout.pass.forEach((spot, index) => {
    if (taken.has(index)) return;
    if (
      slot === -1 ||
      Math.abs(spot.x - station.pos.x) <
        Math.abs(world.layout.pass[slot].x - station.pos.x)
    ) {
      slot = index;
    }
  });
  if (slot === -1) return true;
  ticket.state = 'ready';
  ticket.slot = slot;
  station.ticket = null;
  return true;
}

// Tira o prato pronto do passa-pratos para a bandeja. Devolve se pegou.
export function pickUp(
  carrying: number[],
  ticket: Ticket,
  capacity: number,
): boolean {
  if (ticket.state !== 'ready' || carrying.length >= capacity) return false;
  ticket.state = 'carried';
  ticket.slot = null;
  ticket.claimedBy = null;
  carrying.push(ticket.id);
  return true;
}

// Poe na mesa os pratos da bandeja que sao dela. Com todos na mesa, o
// cliente come. Devolve quantos entregou.
export function deliver(
  world: World,
  carrying: number[],
  table: Table,
): number {
  const customer = customerOf(world, table.customer);
  if (!customer || customer.state !== 'waitFood') return 0;
  let count = 0;
  for (const id of [...carrying]) {
    const ticket = ticketOf(world, id);
    if (!ticket || ticket.customer !== customer.id) continue;
    carrying.splice(carrying.indexOf(id), 1);
    world.tickets.splice(world.tickets.indexOf(ticket), 1);
    customer.delivered++;
    customer.patience = Math.min(
      1,
      customer.patience + FOOD_RELIEF / customer.orders.length,
    );
    count++;
  }
  if (customer.delivered >= customer.orders.length) {
    customer.state = 'eating';
    customer.timer = EAT_TIME;
  }
  return count;
}

// Cobra o cliente parado no caixa por `dt`. Devolve se havia quem cobrar.
export function workRegister(
  world: World,
  register: Register,
  speed: number,
  dt: number,
): boolean {
  const customer = customerOf(world, register.customer);
  if (register.busy || !customer || customer.state !== 'paying') return false;
  register.busy = true;
  register.progress += (dt * speed) / CHECKOUT_TIME;
  if (register.progress >= 1) checkout(world, customer);
  return true;
}

// O cliente paga a conta e a gorjeta e vai embora. A gorjeta sai da paciencia
// que sobrou, do combo e do tipo de cliente.
function checkout(world: World, customer: Customer): void {
  const kind = CUSTOMER_KINDS[customer.kind];
  const { run } = world;
  const coins = Math.round(customer.bill * (world.fresh ? 1 + FRESH_BONUS : 1));
  const tip = claimTip(
    world,
    customer.id,
    customer.bill *
      TIP_RATE *
      customer.patience *
      (1 + COMBO_STEP * Math.min(run.combo, COMBO_MAX)) *
      kind.tips *
      world.mods.tips,
  );
  run.coins += coins;
  run.tips += tip;
  run.served += customer.skins.length;
  run.combo++;
  run.bestCombo = Math.max(run.bestCombo, run.combo);
  // o critico tira reputacao se saiu com menos de meia paciencia
  const mood =
    customer.kind === 'critic'
      ? (customer.patience - 0.5) * 2
      : customer.patience;
  addReputation(world, mood * REPUTATION_GAIN * kind.reputation);
  addFloater(world, customer.pos, 'coins', coins);
  if (tip > 0) addFloater(world, customer.pos, 'tips', tip);
  leave(world, customer);
}

// O cliente vai embora: solta mesa e caixa e some com as comandas dele.
// `angry`: desistiu de esperar (nao paga, derruba reputacao e combo).
export function leave(world: World, customer: Customer, angry = false): void {
  if (customer.state === 'leaving') return;
  for (const table of world.tables) {
    if (table.customer === customer.id) table.customer = null;
  }
  for (const register of world.registers) {
    if (register.customer === customer.id) {
      register.customer = null;
      register.progress = 0;
    }
  }
  const gone = new Set(
    world.tickets
      .filter((ticket) => ticket.customer === customer.id)
      .map((ticket) => ticket.id),
  );
  world.tickets = world.tickets.filter((ticket) => !gone.has(ticket.id));
  for (const station of world.stations) {
    if (station.ticket !== null && gone.has(station.ticket)) {
      station.ticket = null;
    }
  }
  for (const carrier of [world.player, ...world.staff]) {
    carrier.carrying = carrier.carrying.filter((id) => !gone.has(id));
  }
  customer.state = 'leaving';
  customer.table = null;
  customer.register = null;
  customer.spot = null;
  customer.claimedBy = null;
  customer.angry = angry;
  customer.path = pathTo(world.layout, customer.pos, world.layout.spawn) ?? [];
  if (!angry) return;
  world.run.lost++;
  world.run.combo = 0;
  addReputation(
    world,
    -REPUTATION_LOSS * CUSTOMER_KINDS[customer.kind].reputation,
  );
  addFloater(world, customer.pos, 'angry');
}

// distancia de quem atende ate o ponto de atendimento
export const within = (a: Vec2, b: Vec2, reach: number) =>
  distance(a, b) < reach;
