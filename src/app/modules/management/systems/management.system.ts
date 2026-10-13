import {
  stationSlots,
  tableSlots,
} from '@/app/modules/level/utils/layout.util';
import {
  BIG_TABLES_COST,
  BIG_TABLES_STARS,
  DECOR,
  DEFAULT_SKIN,
  EXPANSION_MAX,
  EXPANSIONS,
  HIRE_COST,
  HIRE_GROWTH,
  REGISTER_COSTS,
  REGISTER_DAYS,
  REGISTER_MAX,
  SHOES_COSTS,
  SKINS,
  SKIP_TIPS_PER_DAY,
  STAFF_SKIN,
  START_COINS,
  START_REPUTATION,
  START_TABLES,
  STATION_COST,
  STATION_DAYS,
  STATION_GROWTH,
  TABLE_COST,
  TABLE_GROWTH,
  TRAIN_COST,
  TRAIN_DAYS,
  TRAY_COSTS,
  WAITER_MAX,
} from '@/app/modules/management/constants/management.constants';
import { DISHES } from '@/app/modules/menu/constants/menu.constants';
import {
  REPUTATION_MAX,
  REPUTATION_PER_STAR,
  STAFF_MAX_LEVEL,
} from '@/app/modules/world/constants/world.constants';
import type {
  DecorId,
  DishId,
  Job,
  Restaurant,
  SkinId,
  StaffRole,
  StationKind,
} from '@/app/modules/world/types/world.types';
import { clamp } from '@/shared/utils/math.util';

// A gerencia: tudo que se compra entre um dia e outro. Funcoes puras sobre o
// `Restaurant`; quem guarda e sela o resultado e o save (store/game-store).

export const starsOf = (reputation: number) =>
  clamp(1 + Math.floor(reputation / REPUTATION_PER_STAR), 1, 5);

export function newRestaurant(): Restaurant {
  return {
    day: 1,
    coins: START_COINS,
    tips: 0,
    reputation: START_REPUTATION,
    expansion: 0,
    tables: START_TABLES,
    bigTables: false,
    registers: 1,
    stations: { board: 1, stove: 0, steamer: 0 },
    menu: ['onigiri', 'salmonNigiri'],
    staff: [],
    nextStaffId: 1,
    tray: 0,
    shoes: 0,
    skins: [DEFAULT_SKIN, STAFF_SKIN],
    skin: DEFAULT_SKIN,
    decor: [],
    pending: [],
    bestDay: 0,
  };
}

// tudo que a gerencia sabe fazer
export type ManageAction =
  | { type: 'table' }
  | { type: 'bigTables' }
  | { type: 'register' }
  | { type: 'expand' }
  | { type: 'station'; station: StationKind }
  | { type: 'dish'; dish: DishId }
  | { type: 'hire'; role: StaffRole }
  | { type: 'train'; staff: number }
  | { type: 'tray' }
  | { type: 'shoes' }
  | { type: 'skin'; skin: SkinId }
  | { type: 'wear'; skin: SkinId }
  | { type: 'staffSkin'; staff: number; skin: SkinId }
  | { type: 'decor'; decor: DecorId }
  // pular a espera da obra ou treino de indice `index` em `pending`
  | { type: 'skip'; index: number };

// Por que nao da para comprar agora: chegou no limite, falta estrela, ja
// tem, ja esta em obra, nao cabe na planta (precisa expandir), falta a
// estacao do prato, ou o alvo nao existe.
export type Blocked =
  'max' | 'stars' | 'owned' | 'pending' | 'slots' | 'station' | 'missing';

export type Offer = {
  currency: 'coins' | 'tips';
  cost: number;
  blocked?: Blocked;
  // estrelas que faltam ter, quando `blocked` e 'stars'
  stars?: number;
};

const growth = (base: number, rate: number, count: number) =>
  Math.round(base * rate ** count);
const pendingOf = (restaurant: Restaurant, match: (job: Job) => boolean) =>
  restaurant.pending.filter((pending) => match(pending.job)).length;
const stationsOf = (restaurant: Restaurant) =>
  restaurant.stations.board +
  restaurant.stations.stove +
  restaurant.stations.steamer;

// Preco de uma acao e, se for o caso, por que ela esta travada. Nao olha o
// saldo: quem confere se o dinheiro da e `applyManage`.
export function offerOf(restaurant: Restaurant, action: ManageAction): Offer {
  const stars = starsOf(restaurant.reputation);
  const coins = (cost: number, blocked?: Blocked, needs?: number): Offer => ({
    currency: 'coins',
    cost,
    ...(blocked && { blocked }),
    ...(needs !== undefined && { stars: needs }),
  });
  const tips = (cost: number, blocked?: Blocked): Offer => ({
    currency: 'tips',
    cost,
    ...(blocked && { blocked }),
  });
  // ja ter vem antes de faltar estrela, que vem antes das outras travas
  const gated = (cost: number, needs: number, blocked?: Blocked) =>
    coins(
      cost,
      blocked === 'owned' ? blocked : stars < needs ? 'stars' : blocked,
      needs,
    );

  switch (action.type) {
    case 'table':
      return coins(
        growth(TABLE_COST, TABLE_GROWTH, restaurant.tables - START_TABLES),
        restaurant.tables >= tableSlots(restaurant.expansion)
          ? 'slots'
          : undefined,
      );
    case 'bigTables':
      return gated(
        BIG_TABLES_COST,
        BIG_TABLES_STARS,
        restaurant.bigTables ? 'owned' : undefined,
      );
    case 'register': {
      const count =
        restaurant.registers +
        pendingOf(restaurant, (j) => j.kind === 'register');
      return coins(
        REGISTER_COSTS[count - 1] ?? 0,
        count >= REGISTER_MAX ? 'max' : undefined,
      );
    }
    case 'expand': {
      const building = pendingOf(restaurant, (j) => j.kind === 'expand') > 0;
      const next = EXPANSIONS[restaurant.expansion];
      if (restaurant.expansion >= EXPANSION_MAX || !next) {
        return coins(0, 'max');
      }
      return gated(next.coins, next.stars, building ? 'pending' : undefined);
    }
    case 'station': {
      const { station } = action;
      const building = pendingOf(restaurant, (j) => j.kind === 'station');
      const same =
        restaurant.stations[station] +
        pendingOf(
          restaurant,
          (j) => j.kind === 'station' && j.station === station,
        );
      return coins(
        growth(STATION_COST[station], STATION_GROWTH, same),
        stationsOf(restaurant) + building >= stationSlots(restaurant.expansion)
          ? 'slots'
          : undefined,
      );
    }
    case 'dish': {
      const dish = DISHES[action.dish];
      return gated(
        dish.cost,
        dish.stars,
        restaurant.menu.includes(action.dish)
          ? 'owned'
          : restaurant.stations[dish.station] === 0
            ? 'station'
            : undefined,
      );
    }
    case 'hire': {
      const { role } = action;
      const count = restaurant.staff.filter((s) => s.role === role).length;
      const limit =
        role === 'waiter'
          ? WAITER_MAX
          : role === 'cook'
            ? stationsOf(restaurant)
            : restaurant.registers;
      return coins(
        growth(HIRE_COST[role], HIRE_GROWTH, count),
        count >= limit ? 'max' : undefined,
      );
    }
    case 'train': {
      const member = restaurant.staff.find((s) => s.id === action.staff);
      if (!member) return coins(0, 'missing');
      const training =
        pendingOf(
          restaurant,
          (j) => j.kind === 'train' && j.staff === member.id,
        ) > 0;
      return coins(
        TRAIN_COST * member.level * member.level,
        member.level >= STAFF_MAX_LEVEL
          ? 'max'
          : training
            ? 'pending'
            : undefined,
      );
    }
    case 'tray':
      return coins(
        TRAY_COSTS[restaurant.tray] ?? 0,
        restaurant.tray >= TRAY_COSTS.length ? 'max' : undefined,
      );
    case 'shoes':
      return coins(
        SHOES_COSTS[restaurant.shoes] ?? 0,
        restaurant.shoes >= SHOES_COSTS.length ? 'max' : undefined,
      );
    case 'skin':
      return tips(
        SKINS[action.skin].tips,
        restaurant.skins.includes(action.skin) ? 'owned' : undefined,
      );
    case 'wear':
      return tips(
        0,
        restaurant.skins.includes(action.skin) ? undefined : 'missing',
      );
    case 'staffSkin':
      return tips(
        0,
        restaurant.skins.includes(action.skin) &&
          restaurant.staff.some((s) => s.id === action.staff)
          ? undefined
          : 'missing',
      );
    case 'decor':
      return tips(
        DECOR[action.decor].tips,
        restaurant.decor.includes(action.decor) ? 'owned' : undefined,
      );
    case 'skip': {
      const pending = restaurant.pending[action.index];
      return tips(
        pending ? SKIP_TIPS_PER_DAY * pending.days : 0,
        pending ? undefined : 'missing',
      );
    }
  }
}

function finishJob(restaurant: Restaurant, job: Job): void {
  if (job.kind === 'register') restaurant.registers++;
  else if (job.kind === 'station') restaurant.stations[job.station]++;
  else if (job.kind === 'expand') restaurant.expansion++;
  else {
    const member = restaurant.staff.find((s) => s.id === job.staff);
    if (member) member.level = Math.min(STAFF_MAX_LEVEL, member.level + 1);
  }
}

// Faz a compra, se nao esta travada e o saldo cobre. Devolve se fez.
export function applyManage(
  restaurant: Restaurant,
  action: ManageAction,
): boolean {
  const offer = offerOf(restaurant, action);
  if (offer.blocked || restaurant[offer.currency] < offer.cost) return false;
  restaurant[offer.currency] -= offer.cost;
  const start = (job: Job, days: number) =>
    restaurant.pending.push({ job, days });

  switch (action.type) {
    case 'table':
      restaurant.tables++;
      break;
    case 'bigTables':
      restaurant.bigTables = true;
      break;
    case 'register':
      start({ kind: 'register' }, REGISTER_DAYS);
      break;
    case 'expand':
      start({ kind: 'expand' }, EXPANSIONS[restaurant.expansion].days);
      break;
    case 'station':
      start({ kind: 'station', station: action.station }, STATION_DAYS);
      break;
    case 'dish':
      restaurant.menu.push(action.dish);
      break;
    case 'hire':
      restaurant.staff.push({
        id: restaurant.nextStaffId++,
        role: action.role,
        level: 1,
        skin: STAFF_SKIN,
      });
      break;
    case 'train':
      start({ kind: 'train', staff: action.staff }, TRAIN_DAYS);
      break;
    case 'tray':
      restaurant.tray++;
      break;
    case 'shoes':
      restaurant.shoes++;
      break;
    case 'skin':
      restaurant.skins.push(action.skin);
      break;
    case 'wear':
      restaurant.skin = action.skin;
      break;
    case 'staffSkin': {
      const member = restaurant.staff.find((s) => s.id === action.staff);
      if (member) member.skin = action.skin;
      break;
    }
    case 'decor':
      restaurant.decor.push(action.decor);
      break;
    case 'skip': {
      const [pending] = restaurant.pending.splice(action.index, 1);
      finishJob(restaurant, pending.job);
      break;
    }
  }
  return true;
}

// Fecha o dia: entra o caixa, a reputacao passa a ser a do fim do dia, e as
// obras e treinos andam um dia.
export function endDay(
  restaurant: Restaurant,
  result: { coins: number; reputation: number },
): void {
  const coins = Math.max(0, Math.floor(result.coins));
  restaurant.coins += coins;
  restaurant.bestDay = Math.max(restaurant.bestDay, coins);
  restaurant.reputation = clamp(result.reputation, 0, REPUTATION_MAX);
  restaurant.day++;
  for (const pending of restaurant.pending) pending.days--;
  for (const pending of restaurant.pending) {
    if (pending.days <= 0) finishJob(restaurant, pending.job);
  }
  restaurant.pending = restaurant.pending.filter((p) => p.days > 0);
}

// soma dos bonus da decoracao comprada
export function decorBonus(decor: DecorId[]): {
  patience: number;
  tip: number;
} {
  return decor.reduce(
    (sum, id) => ({
      patience: sum.patience + DECOR[id].patience,
      tip: sum.tip + DECOR[id].tip,
    }),
    { patience: 0, tip: 0 },
  );
}
