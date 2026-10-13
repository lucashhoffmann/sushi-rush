import { followPath, seatSpots } from '@/app/modules/level/utils/layout.util';
import { pathBeside, pathTo } from '@/app/modules/level/utils/pathfinding.util';
import { starsOf } from '@/app/modules/management/systems/management.system';
import { DISHES } from '@/app/modules/menu/constants/menu.constants';
import { leave } from '@/app/modules/service/systems/service.system';
import {
  CUSTOMER_KINDS,
  CUSTOMER_SPEED,
  DECIDE_TIME,
  PAIRS_FROM_DAY,
  PATIENCE_TIME,
  SPECIALS_FROM_DAY,
} from '@/app/modules/world/constants/world.constants';
import type {
  Customer,
  CustomerKind,
  CustomerState,
  DishId,
  SkinId,
  Vec2,
  World,
} from '@/app/modules/world/types/world.types';
import { nextRandom } from '@/shared/utils/rng.util';

// Clientes: chegam, esperam mesa, pedem, comem, pagam e vao embora. Quem os
// faz avancar de "quer pedir" ate "pagou" e o atendimento (service.system).

// clientes sao coelhos: o panda e o dono
const CUSTOMER_SKINS: SkinId[] = [
  'rabbitGrey',
  'rabbitBald',
  'rabbitBlond',
  'rabbitCyan',
  'rabbitGreen',
  'rabbitPink',
  'rabbitPurple',
];
const SPECIALS: CustomerKind[] = ['rushed', 'critic', 'vip', 'group'];
// sentados: cada pessoa no seu banco
const SEATED: CustomerState[] = [
  'deciding',
  'wantOrder',
  'waitFood',
  'eating',
  'wantPay',
];
// chance de um cliente comum vir em dupla
const PAIR_CHANCE = 0.35;
// distancia entre as pessoas de um grupo andando
const TRAIL = 0.55;

export const isSeated = (customer: Customer) => SEATED.includes(customer.state);

const pick = <T>(world: World, list: T[]): T =>
  list[Math.floor(nextRandom(world) * list.length)];

function rollKind(world: World): CustomerKind {
  if (world.day < SPECIALS_FROM_DAY) return 'regular';
  const stars = starsOf(world.reputation);
  const big = world.tables.some((table) => table.seats >= 3);
  let roll = nextRandom(world);
  for (const kind of SPECIALS) {
    const { chance, stars: needed } = CUSTOMER_KINDS[kind];
    if (stars < needed || (kind === 'group' && !big)) continue;
    if (roll < chance) return kind;
    roll -= chance;
  }
  return 'regular';
}

// Poe um cliente novo na calcada, se ha lugar na fila. Devolve se entrou.
export function spawnCustomer(world: World): boolean {
  const waiting = world.customers.filter((c) => c.state === 'queue').length;
  if (waiting >= world.layout.queue.length || world.tables.length === 0) {
    return false;
  }
  const kind = rollKind(world);
  const size =
    kind === 'group'
      ? 3 + (nextRandom(world) < 0.5 ? 1 : 0)
      : world.day >= PAIRS_FROM_DAY && nextRandom(world) < PAIR_CHANCE
        ? 2
        : 1;
  // o vip pede o mais caro do cardapio
  const priciest = world.menu.reduce((best, dish) =>
    DISHES[dish].price > DISHES[best].price ? dish : best,
  );
  const orders: DishId[] = Array.from({ length: size }, () =>
    kind === 'vip' ? priciest : pick(world, world.menu),
  );
  world.customers.push({
    id: world.nextId++,
    kind,
    skins: orders.map(() => pick(world, CUSTOMER_SKINS)),
    state: 'queue',
    pos: { ...world.layout.spawn },
    facing: Math.PI,
    moving: 0,
    path: [],
    table: null,
    register: null,
    spot: null,
    orders,
    delivered: 0,
    patience: 1,
    timer: 0,
    bill: orders.reduce((sum, dish) => sum + DISHES[dish].price, 0),
    claimedBy: null,
    angry: false,
  });
  return true;
}

// Quem esta na fila anda para a frente dela, e quem cabe numa mesa livre
// vai sentar (na ordem da fila).
function seatQueue(world: World): void {
  const queue = world.customers
    .filter((customer) => customer.state === 'queue')
    .sort((a, b) => a.id - b.id);
  let spot = 0;
  for (const customer of queue) {
    const table = world.tables.find(
      (candidate) =>
        candidate.customer === null &&
        candidate.seats >= customer.orders.length,
    );
    const path = table && pathBeside(world.layout, customer.pos, table.pos);
    if (table && path) {
      table.customer = customer.id;
      customer.table = table.id;
      customer.spot = null;
      customer.state = 'toTable';
      customer.path = path;
      continue;
    }
    if (customer.spot !== spot) {
      customer.spot = spot;
      customer.path =
        pathTo(world.layout, customer.pos, world.layout.queue[spot]) ?? [];
    }
    spot++;
  }
}

export function stepCustomers(world: World, dt: number): void {
  seatQueue(world);
  const frozen = world.boosts.freeze > 0;
  for (const customer of world.customers) {
    const lasts = PATIENCE_TIME[customer.state];
    if (lasts && !frozen) {
      customer.patience -=
        dt /
        (lasts * CUSTOMER_KINDS[customer.kind].patience * world.mods.patience);
      if (customer.patience <= 0) {
        customer.patience = 0;
        leave(world, customer, true);
      }
    }
    const arrived = isSeated(customer)
      ? true
      : followPath(customer, CUSTOMER_SPEED, dt);
    switch (customer.state) {
      case 'toTable':
        if (arrived) {
          customer.state = 'deciding';
          customer.timer = DECIDE_TIME;
          customer.moving = 0;
        }
        break;
      case 'deciding':
        customer.timer -= dt;
        if (customer.timer <= 0) customer.state = 'wantOrder';
        break;
      case 'eating':
        customer.timer -= dt;
        if (customer.timer <= 0) customer.state = 'wantPay';
        break;
      case 'wantPay': {
        // segue sentado ate vagar um caixa
        const register = world.registers.find((r) => r.customer === null);
        const path =
          register && pathTo(world.layout, customer.pos, register.front);
        if (!register || !path) break;
        const table = world.tables.find((t) => t.id === customer.table);
        if (table) table.customer = null;
        register.customer = customer.id;
        register.progress = 0;
        customer.register = register.id;
        customer.table = null;
        customer.state = 'toRegister';
        customer.path = path;
        break;
      }
      case 'toRegister':
        if (arrived) {
          customer.state = 'paying';
          // de frente para o caixa, que fica a direita
          customer.facing = 0;
        }
        break;
      default:
        break;
    }
  }
  // quem chegou na rua some
  world.customers = world.customers.filter(
    (customer) => customer.state !== 'leaving' || customer.path.length > 0,
  );
}

// Onde esta cada pessoa do grupo: sentada no banco dela, ou em fila atras da
// primeira quando o grupo anda.
export function memberSpots(
  world: World,
  customer: Customer,
): { pos: Vec2; facing: number }[] {
  const table = world.tables.find((t) => t.id === customer.table);
  if (table && isSeated(customer)) {
    const seats = seatSpots(table);
    return customer.skins.map((_, i) => seats[i % seats.length]);
  }
  const { pos, facing } = customer;
  return customer.skins.map((_, i) => ({
    pos: {
      x: pos.x - Math.cos(facing) * TRAIL * i,
      y: pos.y - Math.sin(facing) * TRAIL * i,
    },
    facing,
  }));
}
