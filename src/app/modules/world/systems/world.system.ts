import {
  spawnCustomer,
  stepCustomers,
} from '@/app/modules/customer/systems/customer.system';
import { buildLevel, tileCenter } from '@/app/modules/level/utils/layout.util';
import {
  decorBonus,
  starsOf,
} from '@/app/modules/management/systems/management.system';
import { stepPlayer } from '@/app/modules/player/systems/player.system';
import { leave } from '@/app/modules/service/systems/service.system';
import { restSpot, stepStaff } from '@/app/modules/staff/systems/staff.system';
import { claimTip } from '@/app/modules/vault/systems/vault.system';
import {
  BOOST_IDS,
  BOOSTS,
  CLOSING_LIMIT,
  DAY_LENGTH,
  DELIVERY_FROM_DAY,
  DELIVERY_TIME,
  DELIVERY_WINDOW,
  EARLY_DAYS,
  FIRST_SPAWN,
  FLOATER_TIME,
  GOAL_BASE,
  GOAL_BONUS,
  GOAL_MAX,
  GOAL_PER_DAY,
  PLAYER_CARRY,
  RUSH_FROM_DAY,
  RUSH_RATE,
  RUSH_TIME,
  RUSH_WINDOW,
  SHOES_BONUS,
  SPAWN_EVERY,
  SPAWN_MIN,
  SPAWN_PER_STAR,
  SPRINT_MAX,
} from '@/app/modules/world/constants/world.constants';
import type {
  BoostId,
  InputState,
  Restaurant,
  World,
} from '@/app/modules/world/types/world.types';
import { nextRandom } from 'three-hex-engine/kit';

// Contrato em docs/contracts.md (secao Simulacao).

// teto do bonus da meta: cabe no teto de gorjeta do cofre
const GOAL_BONUS_DAYS = 30;

// Monta o dia a partir do restaurante. Mesma `seed`, mesmo dia.
export function createWorld(restaurant: Restaurant, seed: number): World {
  const { layout, tables, stations, registers } = buildLevel(restaurant);
  const world: World = {
    rngState: seed | 0,
    status: 'intro',
    day: restaurant.day,
    clock: 0,
    layout,
    player: {
      skin: restaurant.skin,
      pos: tileCenter(layout.doorX, 3),
      facing: Math.PI / 2,
      moving: 0,
      carrying: [],
      action: 'none',
      sprint: 0,
      sprints: SPRINT_MAX,
      sprintReset: 0,
    },
    staff: [],
    customers: [],
    tables,
    stations,
    registers,
    tickets: [],
    floaters: [],
    menu: [...restaurant.menu],
    reputation: restaurant.reputation,
    boosts: { staffTurbo: 0, kitchenTurbo: 0, freeze: 0, rushHour: 0 },
    rush: 0,
    delivery: 0,
    fresh: false,
    schedule: { rush: -1, delivery: -1 },
    atManager: false,
    spawnIn: FIRST_SPAWN,
    nextId: 1,
    mods: modsOf(restaurant, restaurant.day),
    decor: [...restaurant.decor],
    run: {
      served: 0,
      lost: 0,
      coins: 0,
      tips: 0,
      combo: 0,
      bestCombo: 0,
      goal: Math.min(
        GOAL_MAX,
        Math.round(GOAL_BASE + GOAL_PER_DAY * (restaurant.day - 1)),
      ),
      goalBonus: GOAL_BONUS + Math.min(restaurant.day, GOAL_BONUS_DAYS),
    },
  };
  const within = ([from, to]: number[]) =>
    DAY_LENGTH * (from + nextRandom(world) * (to - from));
  if (restaurant.day >= RUSH_FROM_DAY)
    world.schedule.rush = within(RUSH_WINDOW);
  if (restaurant.day >= DELIVERY_FROM_DAY) {
    world.schedule.delivery = within(DELIVERY_WINDOW);
  }
  syncPurchases(world, restaurant);
  return world;
}

function modsOf(restaurant: Restaurant, day: number): World['mods'] {
  const bonus = decorBonus(restaurant.decor);
  const early = EARLY_DAYS[day - 1] ?? { spawn: 1, patience: 1 };
  return {
    playerSpeed: 1 + SHOES_BONUS * restaurant.shoes,
    capacity: PLAYER_CARRY + restaurant.tray,
    patience: (1 + bonus.patience) * early.patience,
    tips: 1 + bonus.tip,
    spawn: early.spawn,
  };
}

// Traz para o dia em curso o que foi comprado na gerencia e nao mexe na
// planta: equipe (quem foi contratado entra, nivel e skin atualizam),
// cardapio, melhorias do player, bonus e skin. Mesa, caixa, estacao e
// expansao so no dia seguinte.
export function syncPurchases(world: World, restaurant: Restaurant): void {
  world.mods = modsOf(restaurant, world.day);
  world.menu = [...restaurant.menu];
  world.player.skin = restaurant.skin;
  for (const member of restaurant.staff) {
    const working = world.staff.find((staff) => staff.id === member.id);
    if (working) {
      working.level = member.level;
      working.skin = member.skin;
      continue;
    }
    const hired: World['staff'][number] = {
      ...member,
      pos: { x: 0, y: 0 },
      facing: -Math.PI / 2,
      moving: 0,
      path: [],
      carrying: [],
      task: null,
      action: 'none',
    };
    world.staff.push(hired);
    hired.pos = { ...restSpot(world, hired) };
  }
}

export function begin(world: World): void {
  if (world.status === 'intro') world.status = 'playing';
}

export function togglePause(world: World): void {
  if (world.status === 'playing') world.status = 'paused';
  else if (world.status === 'paused') world.status = 'playing';
}

// o salao ja fechou: so falta o ultimo cliente sair
export const isClosing = (world: World) => world.clock >= DAY_LENGTH;

// Liga o boost, se nao esta ligado. Quem cobra a gorjeta e o store.
export function startBoost(world: World, id: BoostId): boolean {
  if (world.status !== 'playing' || world.boosts[id] > 0) return false;
  if (id === 'rushHour' && isClosing(world)) return false;
  world.boosts[id] = BOOSTS[id].time;
  return true;
}

export function stepWorld(world: World, input: InputState, dt: number): void {
  if (world.status !== 'playing') return;
  world.clock += dt;
  for (const station of world.stations) station.busy = false;
  for (const register of world.registers) register.busy = false;
  for (const id of BOOST_IDS) {
    world.boosts[id] = Math.max(0, world.boosts[id] - dt);
  }
  world.rush = Math.max(0, world.rush - dt);
  world.delivery = Math.max(0, world.delivery - dt);

  const { schedule } = world;
  if (schedule.rush >= 0 && world.clock >= schedule.rush) {
    schedule.rush = -1;
    world.rush = RUSH_TIME;
  }
  if (schedule.delivery >= 0 && world.clock >= schedule.delivery) {
    schedule.delivery = -1;
    world.delivery = DELIVERY_TIME;
  }

  if (!isClosing(world)) {
    const rate = world.rush > 0 || world.boosts.rushHour > 0 ? RUSH_RATE : 1;
    world.spawnIn -= dt * rate;
    if (world.spawnIn <= 0) {
      spawnCustomer(world);
      world.spawnIn =
        world.mods.spawn *
        Math.max(
          SPAWN_MIN,
          SPAWN_EVERY - SPAWN_PER_STAR * (starsOf(world.reputation) - 1),
        );
    }
  }

  stepPlayer(world, input, dt);
  stepStaff(world, dt);
  stepCustomers(world, dt);

  for (const floater of world.floaters) floater.age += dt;
  world.floaters = world.floaters.filter((f) => f.age < FLOATER_TIME);

  if (!isClosing(world)) return;
  // fechou: quem ainda esperava mesa vai embora, sem reclamar
  for (const customer of world.customers) {
    if (customer.state === 'queue') leave(world, customer);
  }
  if (world.customers.length > 0 && world.clock < DAY_LENGTH + CLOSING_LIMIT) {
    return;
  }
  if (world.run.served >= world.run.goal) {
    world.run.tips += claimTip(world, 'goal', world.run.goalBonus);
  }
  world.status = 'dayover';
}
