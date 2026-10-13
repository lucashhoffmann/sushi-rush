import {
  SKINS,
  SKIP_TIPS_PER_DAY,
  START_TABLES,
} from '@/app/modules/management/constants/management.constants';
import {
  applyManage,
  endDay,
  newRestaurant,
  offerOf,
  starsOf,
} from '@/app/modules/management/systems/management.system';
import { tableSlots } from '@/app/modules/level/utils/layout.util';
import { restaurantWith } from '@/test/world.fixture';

const rich = () => restaurantWith({ coins: 1e6, tips: 1e6, reputation: 100 });

describe('gerencia', () => {
  it('estrelas saem da reputacao, de 1 a 5', () => {
    expect([0, 19, 20, 60, 100].map(starsOf)).toEqual([1, 1, 2, 4, 5]);
  });

  it('sem saldo nao compra, e nada muda', () => {
    const restaurant = restaurantWith({ coins: 0 });
    const before = JSON.stringify(restaurant);
    expect(applyManage(restaurant, { type: 'table' })).toBe(false);
    expect(JSON.stringify(restaurant)).toBe(before);
  });

  it('mesa: cada uma mais cara, ate encher a planta', () => {
    const restaurant = rich();
    const first = offerOf(restaurant, { type: 'table' }).cost;
    expect(applyManage(restaurant, { type: 'table' })).toBe(true);
    expect(restaurant.tables).toBe(START_TABLES + 1);
    expect(offerOf(restaurant, { type: 'table' }).cost).toBeGreaterThan(first);
    restaurant.tables = tableSlots(0);
    expect(offerOf(restaurant, { type: 'table' }).blocked).toBe('slots');
  });

  it('obra leva dias; pular custa gorjeta e entrega na hora', () => {
    const restaurant = rich();
    expect(applyManage(restaurant, { type: 'register' })).toBe(true);
    expect(restaurant.registers).toBe(1);
    expect(restaurant.pending).toHaveLength(1);
    const tips = restaurant.tips;
    expect(applyManage(restaurant, { type: 'skip', index: 0 })).toBe(true);
    expect(restaurant.registers).toBe(2);
    expect(restaurant.tips).toBe(tips - SKIP_TIPS_PER_DAY);
    expect(restaurant.pending).toHaveLength(0);
  });

  it('fim do dia entrega a obra, credita o caixa e avanca o dia', () => {
    const restaurant = rich();
    applyManage(restaurant, { type: 'station', station: 'stove' });
    const coins = restaurant.coins;
    endDay(restaurant, { coins: 120, reputation: 55 });
    expect(restaurant.stations.stove).toBe(1);
    expect(restaurant.coins).toBe(coins + 120);
    expect(restaurant.bestDay).toBe(120);
    expect(restaurant.day).toBe(2);
    expect(restaurant.reputation).toBe(55);
  });

  it('prato precisa de estrela e da estacao dele', () => {
    const poor = restaurantWith({ coins: 1e6 });
    expect(offerOf(poor, { type: 'dish', dish: 'ramen' }).blocked).toBe(
      'stars',
    );
    const restaurant = rich();
    expect(offerOf(restaurant, { type: 'dish', dish: 'ramen' }).blocked).toBe(
      'station',
    );
    restaurant.stations.stove = 1;
    expect(applyManage(restaurant, { type: 'dish', dish: 'ramen' })).toBe(true);
    expect(offerOf(restaurant, { type: 'dish', dish: 'ramen' }).blocked).toBe(
      'owned',
    );
  });

  it('equipe: contrata ate o limite da funcao, treina um nivel por vez', () => {
    const restaurant = rich();
    expect(applyManage(restaurant, { type: 'hire', role: 'cashier' })).toBe(
      true,
    );
    // um caixa por caixa registradora
    expect(offerOf(restaurant, { type: 'hire', role: 'cashier' }).blocked).toBe(
      'max',
    );
    const { id } = restaurant.staff[0];
    expect(applyManage(restaurant, { type: 'train', staff: id })).toBe(true);
    expect(offerOf(restaurant, { type: 'train', staff: id }).blocked).toBe(
      'pending',
    );
    endDay(restaurant, { coins: 0, reputation: 100 });
    expect(restaurant.staff[0].level).toBe(2);
  });

  it('skin se compra com gorjeta e serve ao player e a equipe', () => {
    const restaurant = rich();
    applyManage(restaurant, { type: 'hire', role: 'waiter' });
    const { id } = restaurant.staff[0];
    expect(
      applyManage(restaurant, { type: 'wear', skin: 'rabbitPurple' }),
    ).toBe(false);
    const tips = restaurant.tips;
    expect(
      applyManage(restaurant, { type: 'skin', skin: 'rabbitPurple' }),
    ).toBe(true);
    expect(restaurant.tips).toBe(tips - SKINS.rabbitPurple.tips);
    expect(
      applyManage(restaurant, { type: 'wear', skin: 'rabbitPurple' }),
    ).toBe(true);
    expect(
      applyManage(restaurant, {
        type: 'staffSkin',
        staff: id,
        skin: 'rabbitPurple',
      }),
    ).toBe(true);
    expect(restaurant.skin).toBe('rabbitPurple');
    expect(restaurant.staff[0].skin).toBe('rabbitPurple');
    // o dono comeca de panda; a equipe, de coelho cinza
    expect(newRestaurant().skin).toBe('panda');
    expect(newRestaurant().skins).toEqual(['panda', 'rabbitGrey']);
  });
});
