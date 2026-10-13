import type {
  DishId,
  StationKind,
} from '@/app/modules/world/types/world.types';

// O cardapio. `prep`: segundos de preparo na velocidade 1.0; `price`: o que
// o cliente paga; `cost`: moedas para liberar o prato (0 = ja vem liberado);
// `stars`: estrelas minimas para poder liberar; `icon`: como o prato aparece
// no balao do pedido e na loja. A ordem e a da loja.
export const DISHES: Record<
  DishId,
  {
    icon: string;
    station: StationKind;
    prep: number;
    price: number;
    cost: number;
    stars: number;
  }
> = {
  onigiri: {
    icon: '🍙',
    station: 'board',
    prep: 3,
    price: 8,
    cost: 0,
    stars: 1,
  },
  salmonNigiri: {
    icon: '🍣',
    station: 'board',
    prep: 4,
    price: 12,
    cost: 0,
    stars: 1,
  },
  tamagoNigiri: {
    icon: '🍳',
    station: 'board',
    prep: 4,
    price: 15,
    cost: 120,
    stars: 1,
  },
  maguroNigiri: {
    icon: '🐟',
    station: 'board',
    prep: 5,
    price: 19,
    cost: 260,
    stars: 2,
  },
  roll: {
    icon: '🍥',
    station: 'board',
    prep: 5,
    price: 22,
    cost: 400,
    stars: 2,
  },
  gyoza: {
    icon: '🥟',
    station: 'stove',
    prep: 6,
    price: 26,
    cost: 350,
    stars: 2,
  },
  ramen: {
    icon: '🍜',
    station: 'stove',
    prep: 8,
    price: 36,
    cost: 700,
    stars: 3,
  },
  dango: {
    icon: '🍡',
    station: 'steamer',
    prep: 5,
    price: 24,
    cost: 450,
    stars: 2,
  },
  chukaman: {
    icon: '🥠',
    station: 'steamer',
    prep: 6,
    price: 30,
    cost: 650,
    stars: 3,
  },
  udon: {
    icon: '🍲',
    station: 'stove',
    prep: 8,
    price: 40,
    cost: 1100,
    stars: 3,
  },
  salmonRoll: {
    icon: '🍱',
    station: 'board',
    prep: 6,
    price: 32,
    cost: 900,
    stars: 3,
  },
  seaUrchinRoll: {
    icon: '🦪',
    station: 'board',
    prep: 9,
    price: 58,
    cost: 2400,
    stars: 4,
  },
};
export const DISH_IDS = Object.keys(DISHES) as DishId[];
