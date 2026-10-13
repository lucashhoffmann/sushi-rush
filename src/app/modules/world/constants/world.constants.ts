import type {
  BoostId,
  CustomerKind,
  CustomerState,
} from '@/app/modules/world/types/world.types';

// Numeros de balanceamento do dia. Cada um diz o que muda no jogo: e aqui
// que se ajusta sem ler sistema.

// passo fixo da simulacao (s)
export const FIXED_DT = 1 / 60;

// --- o dia
// segundos de salao aberto. Depois disso nao entra mais ninguem e o dia
// acaba quando o ultimo cliente sai
export const DAY_LENGTH = 150;
// teto de espera pelo ultimo cliente depois de fechar (s)
export const CLOSING_LIMIT = 45;
// meta de pessoas atendidas: comeca em GOAL_BASE e sobe GOAL_PER_DAY por
// dia, ate GOAL_MAX. Bater a meta paga gorjeta (GOAL_BONUS + dia)
export const GOAL_BASE = 4;
export const GOAL_PER_DAY = 2;
export const GOAL_MAX = 60;
export const GOAL_BONUS = 10;

// --- movimento (tiles por segundo)
export const PLAYER_SPEED = 4.2;
export const PLAYER_RADIUS = 0.3;
// cada nivel do tenis soma isto a velocidade do player
export const SHOES_BONUS = 0.1;
export const CUSTOMER_SPEED = 2.4;
// garcom e cozinheiro andando: base mais um tanto por nivel
export const STAFF_SPEED = 2.6;
export const STAFF_SPEED_PER_LEVEL = 0.35;
// velocidade de trabalho (preparo e cobranca) do contratado: no nivel 1 e
// mais lento que o player (1.0), e passa dele no nivel 3
export const STAFF_WORK = 0.7;
export const STAFF_WORK_PER_LEVEL = 0.2;
// garcom leva 1 prato; mais um a cada WAITER_CARRY_EVERY niveis
export const WAITER_CARRY_EVERY = 2;
export const STAFF_MAX_LEVEL = 5;
// pratos que o player leva sem bandeja comprada
export const PLAYER_CARRY = 2;

// --- alcance (tiles): quao perto e preciso estar para agir
// da mesa (centro): os oito tiles em volta
export const TABLE_REACH = 1.55;
// do lugar no passa-pratos
export const PASS_REACH = 1.25;
// do ponto de trabalho da estacao
export const STATION_REACH = 0.6;
// do caixa (centro), para o player cobrar
export const REGISTER_REACH = 1.25;
// do caixote da entrega
export const DELIVERY_REACH = 1.1;
// da mesa da gerente
export const MANAGER_REACH = 1.3;

// --- clientes
// segundos entre um cliente e outro com 1 estrela; cada estrela a mais tira
// SPAWN_PER_STAR, ate o piso SPAWN_MIN
export const SPAWN_EVERY = 11;
export const SPAWN_PER_STAR = 1.3;
export const SPAWN_MIN = 4.5;
// o primeiro cliente do dia chega logo
export const FIRST_SPAWN = 2;
// Primeiros dias, para aprender sem aperto: o dia 1 usa a primeira linha, o
// 2 a segunda... Depois da lista vale 1. `spawn` multiplica o intervalo
// entre clientes (mais = menos gente); `patience` multiplica a duracao da
// paciencia
export const EARLY_DAYS = [
  { spawn: 2.2, patience: 1.6 },
  { spawn: 1.6, patience: 1.3 },
  { spawn: 1.25, patience: 1.15 },
];
// dia a partir do qual cliente comum pode vir em dupla
export const PAIRS_FROM_DAY = 2;
// segundos para escolher o prato depois de sentar, e para comer
export const DECIDE_TIME = 2.5;
export const EAT_TIME = 6;
// cobranca no caixa, em segundos de trabalho na velocidade 1.0
export const CHECKOUT_TIME = 2.5;
// Quantos segundos a paciencia inteira dura em cada espera. Estado fora da
// lista nao gasta paciencia
export const PATIENCE_TIME: Partial<Record<CustomerState, number>> = {
  queue: 40,
  wantOrder: 28,
  waitFood: 42,
  wantPay: 32,
  toRegister: 60,
  paying: 28,
};
// quanto da barra volta quando o pedido e anotado e quando a comida chega
export const ORDER_RELIEF = 0.25;
export const FOOD_RELIEF = 0.3;

// Tipos de cliente. `chance`: fracao dos que chegam (o resto e `regular`);
// `stars`: estrelas minimas para aparecer; `patience`: multiplica a duracao
// da paciencia; `tips`: multiplica a gorjeta; `reputation`: multiplica o
// ganho e a perda de reputacao.
export const CUSTOMER_KINDS: Record<
  CustomerKind,
  {
    chance: number;
    stars: number;
    patience: number;
    tips: number;
    reputation: number;
  }
> = {
  regular: { chance: 0, stars: 1, patience: 1, tips: 1, reputation: 1 },
  // apressado: pouca paciencia, gorjeta melhor
  rushed: { chance: 0.15, stars: 1, patience: 0.6, tips: 1.6, reputation: 1 },
  // critico: decide a reputacao
  critic: { chance: 0.05, stars: 2, patience: 0.9, tips: 1.5, reputation: 4 },
  // vip: pede o prato mais caro e da muita gorjeta
  vip: { chance: 0.06, stars: 3, patience: 0.9, tips: 3, reputation: 1.5 },
  // grupo de 3 ou 4: so com mesas grandes
  group: { chance: 0.18, stars: 1, patience: 1.15, tips: 1, reputation: 1 },
};
// dia a partir do qual chegam clientes especiais
export const SPECIALS_FROM_DAY = 2;

// --- dinheiro, gorjeta e reputacao
// gorjeta cheia (paciencia inteira, sem combo) como fracao da conta
export const TIP_RATE = 0.12;
// cada atendimento seguido soma isto a gorjeta, ate COMBO_MAX atendimentos
export const COMBO_STEP = 0.1;
export const COMBO_MAX = 10;
// teto de gorjeta de um cliente so: o cofre nao paga mais que isto
// (vault.system)
export const TIP_CAP = 80;
// entrega do caminhao recebida: os pratos valem isto a mais ate fechar
export const FRESH_BONUS = 0.2;
// reputacao ganha num atendimento com paciencia cheia, e perdida quando o
// cliente vai embora
export const REPUTATION_GAIN = 0.7;
export const REPUTATION_LOSS = 1.5;
export const REPUTATION_MAX = 100;
// cada REPUTATION_PER_STAR pontos valem uma estrela, de 1 a 5
export const REPUTATION_PER_STAR = 20;

// --- eventos do dia
// hora do rush: os clientes chegam RUSH_RATE vezes mais rapido por RUSH_TIME
// segundos. Comeca num ponto entre as duas fracoes do dia
export const RUSH_FROM_DAY = 2;
export const RUSH_TIME = 25;
export const RUSH_RATE = 2;
export const RUSH_WINDOW = [0.4, 0.7];
// entrega: o caixote espera DELIVERY_TIME segundos na calcada
export const DELIVERY_FROM_DAY = 3;
export const DELIVERY_TIME = 30;
export const DELIVERY_WINDOW = [0.12, 0.3];

// --- boosts (comprados com gorjeta, na hora): preco e duracao em segundos
export const BOOSTS: Record<BoostId, { tips: number; time: number }> = {
  // contratados andam e trabalham STAFF_TURBO vezes mais rapido
  staffTurbo: { tips: 10, time: 20 },
  // estacoes preparam KITCHEN_TURBO vezes mais rapido, com quem estiver nelas
  kitchenTurbo: { tips: 8, time: 20 },
  // ninguem perde paciencia
  freeze: { tips: 12, time: 10 },
  // mais clientes (RUSH_RATE), para quem da conta
  rushHour: { tips: 6, time: RUSH_TIME },
};
export const BOOST_IDS = Object.keys(BOOSTS) as BoostId[];
export const STAFF_TURBO = 1.8;
export const KITCHEN_TURBO = 2;

// segundos que o numero flutuante fica na tela
export const FLOATER_TIME = 1.4;
