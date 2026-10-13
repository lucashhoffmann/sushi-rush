import type {
  DecorId,
  SkinId,
  StaffRole,
  StationKind,
} from '@/app/modules/world/types/world.types';

// Precos e limites da gerencia. Moedas compram o que faz o restaurante
// render mais; gorjeta compra visual, bonus e pressa.

// --- comeco de jogo
export const START_COINS = 50;
export const START_REPUTATION = 10;
export const START_TABLES = 2;

// --- salao (moedas)
// mesas por coluna, e colunas sem expansao; cada expansao abre mais uma
export const TABLES_PER_COLUMN = 3;
export const BASE_COLUMNS = 2;
export const EXPANSION_MAX = 2;
// a mesa seguinte custa TABLE_COST vezes TABLE_GROWTH por mesa ja comprada
export const TABLE_COST = 80;
export const TABLE_GROWTH = 1.45;
// mesas de 4 lugares: troca todas de uma vez e passa a receber grupos
export const BIG_TABLES_COST = 900;
export const BIG_TABLES_STARS = 3;
// preco e estrelas de cada expansao, na ordem
export const EXPANSIONS = [
  { coins: 1500, stars: 3, days: 2 },
  { coins: 4200, stars: 4, days: 2 },
];
// preco do 2o caixa em diante; a obra leva REGISTER_DAYS dias
export const REGISTER_MAX = 3;
export const REGISTER_COSTS = [450, 1100];
export const REGISTER_DAYS = 1;

// --- cozinha (moedas)
// primeira estacao de cada tipo; cada outra do mesmo tipo custa
// STATION_GROWTH vezes mais. A obra leva STATION_DAYS dias
export const STATION_COST: Record<StationKind, number> = {
  board: 220,
  stove: 380,
  steamer: 460,
};
export const STATION_GROWTH = 1.8;
export const STATION_DAYS = 1;
export const STATION_KINDS: StationKind[] = ['board', 'stove', 'steamer'];

// --- equipe (moedas)
// primeiro contratado de cada funcao; cada outro custa HIRE_GROWTH vezes mais
export const HIRE_COST: Record<StaffRole, number> = {
  waiter: 150,
  cook: 200,
  cashier: 180,
};
export const HIRE_GROWTH = 2;
export const WAITER_MAX = 4;
export const STAFF_ROLES: StaffRole[] = ['waiter', 'cook', 'cashier'];
// subir do nivel n para n+1 custa TRAIN_COST * n * n; o treino leva
// TRAIN_DAYS dias (o funcionario segue trabalhando no nivel antigo)
export const TRAIN_COST = 110;
export const TRAIN_DAYS = 1;

// --- melhorias do player (moedas): preco de cada nivel
export const TRAY_COSTS = [320, 900];
export const SHOES_COSTS = [200, 520, 1100];

// --- gorjeta
// pular um dia de espera de obra ou treino
export const SKIP_TIPS_PER_DAY = 25;

// skins: de quem joga e da equipe. As de preco 0 ja vem: o panda (o dono)
// e o coelho cinza (o uniforme de quem e contratado)
export const SKINS: Record<SkinId, { tips: number }> = {
  panda: { tips: 0 },
  rabbitGrey: { tips: 0 },
  rabbitBald: { tips: 80 },
  rabbitCyan: { tips: 140 },
  rabbitGreen: { tips: 140 },
  rabbitPink: { tips: 220 },
  rabbitBlond: { tips: 300 },
  rabbitPurple: { tips: 380 },
};
export const SKIN_IDS = Object.keys(SKINS) as SkinId[];
export const DEFAULT_SKIN: SkinId = 'panda';
// skin de quem acabou de ser contratado, e a da gerente da sala ao lado
export const STAFF_SKIN: SkinId = 'rabbitGrey';
export const MANAGER_SKIN: SkinId = 'rabbitPink';

// Decoracao: cada peca soma `patience` a duracao da paciencia e `tip` a
// gorjeta (0.05 = 5%). A ordem e a da loja.
export const DECOR: Record<
  DecorId,
  { tips: number; patience: number; tip: number }
> = {
  plant: { tips: 50, patience: 0.04, tip: 0 },
  lantern: { tips: 80, patience: 0, tip: 0.05 },
  bamboo: { tips: 120, patience: 0.05, tip: 0 },
  painting: { tips: 180, patience: 0, tip: 0.07 },
  wallLight: { tips: 260, patience: 0.06, tip: 0.03 },
  fish: { tips: 360, patience: 0, tip: 0.1 },
  sign: { tips: 480, patience: 0.08, tip: 0.04 },
  sakura: { tips: 650, patience: 0.1, tip: 0.1 },
};
export const DECOR_IDS = Object.keys(DECOR) as DecorId[];
