// Tipos compartilhados pela simulacao. Tudo aqui e dado simples: serializa
// em JSON (save e, no futuro, snapshot de rede). Contrato em docs/contracts.md.

export type Vec2 = { x: number; y: number };

// eixo de movimento, de -1 a 1; `moveY` positivo e para o fundo do salao
export type InputState = { moveX: number; moveY: number };

export type DishId =
  | 'onigiri'
  | 'salmonNigiri'
  | 'tamagoNigiri'
  | 'maguroNigiri'
  | 'roll'
  | 'salmonRoll'
  | 'gyoza'
  | 'ramen'
  | 'udon'
  | 'chukaman'
  | 'dango'
  | 'seaUrchinRoll';

// tabua (cortar), fogao (panela e frigideira) e vaporeira
export type StationKind = 'board' | 'stove' | 'steamer';
export type StaffRole = 'waiter' | 'cook' | 'cashier';
export type SkinId =
  | 'rabbitGrey'
  | 'rabbitBald'
  | 'rabbitBlond'
  | 'rabbitCyan'
  | 'rabbitGreen'
  | 'rabbitPink'
  | 'rabbitPurple'
  | 'panda';
export type CustomerKind = 'regular' | 'rushed' | 'vip' | 'critic' | 'group';
export type BoostId = 'staffTurbo' | 'kitchenTurbo' | 'freeze' | 'rushHour';
export type DecorId =
  | 'plant'
  | 'lantern'
  | 'bamboo'
  | 'painting'
  | 'wallLight'
  | 'fish'
  | 'sign'
  | 'sakura';

// ---------------------------------------------------------------- restaurante
// O que fica de um dia para o outro. Mora no save (store/game-store/save.ts).

export type StaffMember = {
  id: number;
  role: StaffRole;
  // 1 a STAFF_MAX_LEVEL
  level: number;
  skin: SkinId;
};

// obra ou treino em andamento: fica pronto quando `days` chega a zero
export type Job =
  | { kind: 'register' }
  | { kind: 'station'; station: StationKind }
  | { kind: 'expand' }
  | { kind: 'train'; staff: number };
export type Pending = { job: Job; days: number };

export type Restaurant = {
  // o proximo dia a ser jogado, a partir de 1
  day: number;
  // dinheiro dos pratos: compra o que faz o restaurante render mais
  coins: number;
  // gorjeta: compra skin, decoracao, boost e pula espera
  tips: number;
  // 0 a 100; as estrelas saem daqui (`starsOf`)
  reputation: number;
  // 0 a EXPANSION_MAX: cada nivel abre mais uma coluna de mesas
  expansion: number;
  tables: number;
  // mesas de 4 lugares (e grupos) no lugar das de 2
  bigTables: boolean;
  registers: number;
  stations: Record<StationKind, number>;
  menu: DishId[];
  staff: StaffMember[];
  nextStaffId: number;
  // pratos a mais que o player carrega, e nivel do tenis
  tray: number;
  shoes: number;
  skins: SkinId[];
  // a skin que o player veste
  skin: SkinId;
  decor: DecorId[];
  pending: Pending[];
  // maior caixa de um dia so
  bestDay: number;
};

// ---------------------------------------------------------------- o dia

export type Layout = {
  w: number;
  h: number;
  // largura do salao; dai ate `w` fica a sala da gerencia
  salonW: number;
  // mesa da gerente (solida) e onde ela fica, atras da mesa
  desk: Vec2;
  manager: Vec2;
  // w * h, linha por linha a partir de y = 0; 1 = nao da para andar
  solid: number[];
  // onde o cliente aparece e por onde vai embora (na rua)
  spawn: Vec2;
  // lugares da fila de espera na calcada, do primeiro ao ultimo
  queue: Vec2[];
  // onde o caixote da entrega aparece
  delivery: Vec2;
  // lugares do passa-pratos, onde o prato pronto espera o garcom
  pass: Vec2[];
  // primeira linha da cozinha (o passa-pratos)
  kitchenY: number;
  // vao da cerca da frente, por onde se entra (dois tiles: doorX e doorX+1)
  doorX: number;
};

// quem anda: posicao, para onde olha (rad) e quanto se move (0 a 1)
export type Mover = {
  pos: Vec2;
  facing: number;
  moving: number;
  // centros de tile que faltam percorrer
  path: Vec2[];
};

// o que o corpo esta fazendo, para a animacao
export type Action = 'none' | 'board' | 'stove' | 'steamer' | 'register';

export type Player = {
  skin: SkinId;
  pos: Vec2;
  facing: number;
  moving: number;
  // ids dos pedidos (`Ticket`) que leva na bandeja
  carrying: number[];
  action: Action;
  // segundos que faltam da corrida em curso; 0 = andando
  sprint: number;
  // corridas guardadas, de 0 a SPRINT_MAX
  sprints: number;
  // segundos ate as corridas voltarem todas; 0 = nenhuma gasta
  sprintReset: number;
};

export type StaffTask =
  | { kind: 'order'; customer: number }
  | { kind: 'pickup'; ticket: number }
  | { kind: 'deliver'; table: number }
  | { kind: 'cook'; station: number }
  | { kind: 'register'; register: number };

export type Staff = Mover & {
  id: number;
  role: StaffRole;
  level: number;
  skin: SkinId;
  carrying: number[];
  task: StaffTask | null;
  action: Action;
};

export type Table = {
  id: number;
  // centro do tile da mesa
  pos: Vec2;
  seats: number;
  // id do cliente (grupo) sentado ou a caminho; null = livre
  customer: number | null;
};

export type Station = {
  id: number;
  kind: StationKind;
  pos: Vec2;
  // onde fica quem opera
  front: Vec2;
  // pedido em preparo; null = parada
  ticket: number | null;
  // alguem ja trabalhou nela neste passo
  busy: boolean;
};

export type Register = {
  id: number;
  pos: Vec2;
  // onde o cliente para, e onde fica o caixa
  front: Vec2;
  back: Vec2;
  customer: number | null;
  // 0 a 1 da cobranca em curso
  progress: number;
  busy: boolean;
};

export type TicketState = 'queued' | 'cooking' | 'ready' | 'carried';

// um prato pedido, da comanda ate a mesa
export type Ticket = {
  id: number;
  dish: DishId;
  customer: number;
  table: number;
  state: TicketState;
  // 0 a 1 do preparo
  progress: number;
  // lugar no passa-pratos, quando `ready`
  slot: number | null;
  // garcom que vem buscar; null = de quem chegar
  claimedBy: number | null;
};

export type CustomerState =
  | 'queue'
  | 'toTable'
  | 'deciding'
  | 'wantOrder'
  | 'waitFood'
  | 'eating'
  | 'wantPay'
  | 'toRegister'
  | 'paying'
  | 'leaving';

// Um grupo de 1 a 4 pessoas que anda, senta e paga junto. `pos` e a do
// primeiro; onde fica cada pessoa sai de `memberSpots`.
export type Customer = Mover & {
  id: number;
  kind: CustomerKind;
  // uma skin por pessoa
  skins: SkinId[];
  state: CustomerState;
  table: number | null;
  register: number | null;
  // lugar na fila de espera, quando `queue`
  spot: number | null;
  // um prato por pessoa
  orders: DishId[];
  // quantos pratos ja chegaram na mesa
  delivered: number;
  // 1 = feliz, 0 = vai embora
  patience: number;
  // contagem regressiva do estado atual (decidir, comer)
  timer: number;
  // conta a pagar
  bill: number;
  // garcom que vem anotar o pedido
  claimedBy: number | null;
  // foi embora sem pagar ou de cara feia
  angry: boolean;
};

export type FloaterKind = 'coins' | 'tips' | 'angry' | 'fresh';

// texto que sobe e some
export type Floater = {
  id: number;
  pos: Vec2;
  kind: FloaterKind;
  amount: number;
  age: number;
};

export type Run = {
  // pessoas atendidas e grupos perdidos
  served: number;
  lost: number;
  coins: number;
  tips: number;
  // atendimentos seguidos sem perder cliente
  combo: number;
  bestCombo: number;
  // meta de pessoas atendidas do dia, e o bonus de gorjeta por bater
  goal: number;
  goalBonus: number;
};

export type WorldStatus = 'intro' | 'playing' | 'paused' | 'dayover';

export type World = {
  rngState: number;
  status: WorldStatus;
  day: number;
  // segundos de salao aberto; passou de DAY_LENGTH, nao entra mais ninguem
  clock: number;
  layout: Layout;
  player: Player;
  staff: Staff[];
  customers: Customer[];
  tables: Table[];
  stations: Station[];
  registers: Register[];
  tickets: Ticket[];
  floaters: Floater[];
  menu: DishId[];
  // reputacao viva do dia (0 a 100); volta para o restaurante no fim
  reputation: number;
  // segundos que faltam de cada boost; 0 = desligado
  boosts: Record<BoostId, number>;
  // hora do rush do proprio dia (nao comprada): segundos que faltam
  rush: number;
  // entrega do caminhao esperando na calcada: segundos que faltam
  delivery: number;
  // entrega recebida: pratos valem mais ate o fim do dia
  fresh: boolean;
  // a que horas (clock) comecam o rush e a entrega; -1 = nao tem hoje
  schedule: { rush: number; delivery: number };
  // o player esta na mesa da gerente (o store abre a gerencia)
  atManager: boolean;
  // segundos ate o proximo cliente
  spawnIn: number;
  nextId: number;
  // o que as compras do restaurante mudam no dia
  mods: {
    // multiplica a velocidade do player e quantos pratos ele leva
    playerSpeed: number;
    capacity: number;
    // multiplicam a paciencia (mais = dura mais) e a gorjeta
    patience: number;
    tips: number;
    // multiplica o intervalo entre clientes (primeiros dias: mais folga)
    spawn: number;
  };
  decor: DecorId[];
  run: Run;
};
