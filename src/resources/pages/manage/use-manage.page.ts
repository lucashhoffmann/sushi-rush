import { useState } from 'react';

import {
  stationSlots,
  tableSlots,
} from '@/app/modules/level/utils/layout.util';
import {
  DECOR,
  DECOR_IDS,
  STAFF_ROLES,
  STATION_KINDS,
} from '@/app/modules/management/constants/management.constants';
import {
  type ManageAction,
  type Offer,
  offerOf,
  starsOf,
} from '@/app/modules/management/systems/management.system';
import { DISH_IDS, DISHES } from '@/app/modules/menu/constants/menu.constants';
import { PLAYER_CARRY } from '@/app/modules/world/constants/world.constants';
import type {
  Job,
  Restaurant,
  StaffMember,
} from '@/app/modules/world/types/world.types';
import { useGameStore } from '@/app/store/game-store/game.store';
import { getTexts, useTexts } from '@/shared/i18n';

export const TABS = ['salon', 'kitchen', 'team', 'decor', 'upgrades'] as const;
export type TabId = (typeof TABS)[number];

// um item a venda, pronto para o cartao
export type Card = {
  key: string;
  icon: string;
  title: string;
  detail: string;
  offer: Offer;
  action: ManageAction;
};

const STATION_ICONS = { board: '🔪', stove: '🍳', steamer: '♨️' };
const ROLE_ICONS = { waiter: '🤵', cook: '👨‍🍳', cashier: '🧾' };
const DECOR_ICONS = {
  plant: '🪴',
  lantern: '🏮',
  bamboo: '🎋',
  painting: '🖼️',
  wallLight: '💡',
  fish: '🐟',
  sign: '🪧',
  sakura: '🌸',
};

// nome de uma obra ou treino, para a lista de pendentes e o fim do dia
export function jobLabel(job: Job, staff: StaffMember[]): string {
  const t = getTexts();
  if (job.kind === 'register') return t.jobs.register;
  if (job.kind === 'expand') return t.jobs.expand;
  if (job.kind === 'station') return t.jobs.station(t.stations[job.station]);
  const member = staff.find((candidate) => candidate.id === job.staff);
  return t.jobs.train(member ? t.roles[member.role] : '');
}

function cardsOf(restaurant: Restaurant, t: ReturnType<typeof getTexts>) {
  const card = (
    key: string,
    icon: string,
    title: string,
    detail: string,
    action: ManageAction,
  ): Card => ({
    key,
    icon,
    title,
    detail,
    action,
    offer: offerOf(restaurant, action),
  });
  const m = t.manage;
  const percent = (value: number) => Math.round(value * 100);
  const cards: Record<TabId, Card[]> = {
    salon: [
      card(
        'table',
        '🪑',
        m.table[0],
        m.table[1](restaurant.tables, tableSlots(restaurant.expansion)),
        { type: 'table' },
      ),
      card('bigTables', '👨‍👩‍👧‍👦', m.bigTables[0], m.bigTables[1], {
        type: 'bigTables',
      }),
      card(
        'register',
        '🔔',
        m.register[0],
        m.register[1](restaurant.registers),
        {
          type: 'register',
        },
      ),
      card('expand', '🏗️', m.expand[0], m.expand[1], { type: 'expand' }),
    ],
    kitchen: [
      ...STATION_KINDS.map((station) =>
        card(
          `station:${station}`,
          STATION_ICONS[station],
          m.station(t.stations[station]),
          `${m.stationCount(restaurant.stations[station])} · ${
            restaurant.stations.board +
            restaurant.stations.stove +
            restaurant.stations.steamer
          }/${stationSlots(restaurant.expansion)}`,
          { type: 'station', station },
        ),
      ),
      ...DISH_IDS.map((dish) =>
        card(
          `dish:${dish}`,
          DISHES[dish].icon,
          t.dishes[dish],
          m.dishInfo(DISHES[dish].price, t.stations[DISHES[dish].station]),
          { type: 'dish', dish },
        ),
      ),
    ],
    team: STAFF_ROLES.map((role) =>
      card(
        `hire:${role}`,
        ROLE_ICONS[role],
        m.hire(t.roles[role]),
        m.hireInfo[role],
        {
          type: 'hire',
          role,
        },
      ),
    ),
    decor: DECOR_IDS.map((decor) =>
      card(
        `decor:${decor}`,
        DECOR_ICONS[decor],
        t.decor[decor],
        m.decorInfo(percent(DECOR[decor].patience), percent(DECOR[decor].tip)),
        { type: 'decor', decor },
      ),
    ),
    upgrades: [
      card('tray', '🍽️', m.tray[0], m.tray[1](PLAYER_CARRY + restaurant.tray), {
        type: 'tray',
      }),
      card('shoes', '👟', m.shoes[0], m.shoes[1](restaurant.shoes), {
        type: 'shoes',
      }),
    ],
  };
  return cards;
}

export function useManagePage() {
  const t = useTexts();
  const restaurant = useGameStore((state) => state.restaurant);
  const manage = useGameStore((state) => state.manage);
  const startDay = useGameStore((state) => state.startDay);
  const backToMenu = useGameStore((state) => state.backToMenu);
  const visiting = useGameStore((state) => state.visiting);
  const leaveManager = useGameStore((state) => state.leaveManager);
  const [tab, setTab] = useState<TabId>('salon');

  return {
    t,
    tab,
    setTab,
    restaurant,
    stars: starsOf(restaurant.reputation),
    cards: cardsOf(restaurant, t)[tab],
    // obras e treinos em andamento, com o preco de pular
    pending: restaurant.pending.map((pending, index) => ({
      key: `${index}:${pending.job.kind}`,
      label: jobLabel(pending.job, restaurant.staff),
      days: pending.days,
      offer: offerOf(restaurant, { type: 'skip', index }),
      action: { type: 'skip', index } as ManageAction,
    })),
    // a equipe contratada, com o treino de cada um
    staff: restaurant.staff.map((member) => ({
      member,
      icon: ROLE_ICONS[member.role],
      train: offerOf(restaurant, { type: 'train', staff: member.id }),
      // proxima skin que ele pode vestir, entre as compradas
      nextSkin:
        restaurant.skins[
          (restaurant.skins.indexOf(member.skin) + 1) % restaurant.skins.length
        ],
    })),
    manage,
    // na sala da gerente, sair e voltar para o dia em curso
    visiting,
    leave: visiting ? leaveManager : backToMenu,
    proceed: visiting ? leaveManager : startDay,
  };
}
