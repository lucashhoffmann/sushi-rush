import type {
  DecorId,
  DishId,
  StationKind,
} from '@/app/modules/world/types/world.types';

// O cenario deste jogo montado com o kit: que peca faz cada coisa. O kit e o
// "Sushi Restaurant" (public/models/sushi/kit.glb, scripts/pack-sushi.mjs);
// as pecas tem que estar no arquivo (tests/sushi-kit.assets.test.ts confere).
// As medidas de cada peca estao em public/models/sushi/kit.sizes.txt.

export const KIT_URL = '/models/sushi/kit.glb';

// O kit inteiro entra pela metade: o piso dele (4 x 4) cobre 2 x 2 tiles, o
// balcao (4 de comprido) cobre 2, e o personagem fica com ~1.65 de altura.
export const KIT_SCALE = 0.5;

export const SCENERY = {
  // pisos de 2 x 2 tiles; `top` e quanto o topo da peca fica acima da origem
  // dela (no tamanho do kit), para todos acabarem na mesma altura
  floor: {
    salon: { piece: 'Floor_Wood', top: 0.11 },
    kitchen: { piece: 'Floor_Kitchen1', top: 0 },
    street: { piece: 'Floor_Tiles', top: 0.1 },
  },
  // paredes de 2 tiles, encostadas na borda de tras do bloco de 2 x 2
  walls: ['Wall_Normal', 'Wall_Shoji', 'Wall_Normal'],
  kitchenWall: 'Wall_Shelves',
  // balcao de 2 tiles de comprido; `counterTop` e a altura do tampo
  counters: ['Environment_Counter_Drawers', 'Environment_Counter_Doors'],
  pass: 'Environment_Counter_Straight',
  sink: 'Environment_Counter_Sink',
  counterTop: 0.96,
  table: 'Environment_Table',
  tableTop: 0.775,
  stool: 'Environment_Stool',
  // o que fica em cima do balcao em cada estacao: peca, e onde (x ao longo
  // do balcao, z para a frente dele), em tiles
  stations: {
    board: [
      { piece: 'Environment_CuttingTable', x: 0, z: 0 },
      { piece: 'Environment_KitchenKnives', x: -0.55, z: -0.2 },
      { piece: 'FoodIngredient_Salmon', x: 0.05, z: 0.05 },
    ],
    stove: [
      { piece: 'Environment_Pot_1_Filled', x: -0.25, z: -0.05 },
      { piece: 'Environment_Pan', x: 0.3, z: -0.1 },
    ],
    steamer: [
      { piece: 'Environment_ChukamanSteamer', x: 0, z: 0 },
      { piece: 'FoodIngredient_Rice', x: -0.55, z: 0 },
    ],
  } satisfies Record<StationKind, { piece: string; x: number; z: number }[]>,
  // cerca viva da frente, portao e tapete da entrada
  hedge: 'Decoration_Plant1',
  gate: 'Environment_ToriiGate',
  carpet: 'Decoration_Carpet',
  truck: 'Truck',
  // enfeite fixo em cima do passa-pratos
  bottles: 'Environment_Bottles',
};

// a peca de cada prato
export const DISH_PIECES: Record<DishId, string> = {
  onigiri: 'Food_Onigiri',
  salmonNigiri: 'Food_SalmonNigiri',
  tamagoNigiri: 'Food_TamagoNigiri',
  maguroNigiri: 'Food_MaguroNigiri',
  roll: 'Food_Roll',
  salmonRoll: 'Food_SalmonRoll',
  seaUrchinRoll: 'Food_SeaUrchinRoll',
  gyoza: 'Food_Gyoza',
  ramen: 'Food_Ramen',
  udon: 'Food_Udon',
  chukaman: 'Food_Chukaman',
  dango: 'Food_Dango',
};
// prato na mesa e na bandeja: maior que no kit, para se ver de cima
export const DISH_SCALE = 0.65;

// a peca de cada decoracao comprada; onde ela vai e com o world.renderer
export const DECOR_PIECES: Record<DecorId, string> = {
  plant: 'Decoration_Plant2',
  lantern: 'Decoration_Light',
  bamboo: 'Decoration_Bamboo',
  painting: 'Decoration_Painting',
  wallLight: 'Decoration_WallLight',
  fish: 'Decoration_Fish',
  sign: 'Decoration_Sign',
  sakura: 'Decoration_SakuraTree',
};

// todas as pecas que o jogo pede ao kit
export function sceneryPieces(): string[] {
  return [
    ...Object.values(SCENERY.floor).map((floor) => floor.piece),
    ...SCENERY.walls,
    SCENERY.kitchenWall,
    ...SCENERY.counters,
    SCENERY.pass,
    SCENERY.sink,
    SCENERY.table,
    SCENERY.stool,
    ...Object.values(SCENERY.stations).flatMap((parts) =>
      parts.map((part) => part.piece),
    ),
    SCENERY.hedge,
    SCENERY.gate,
    SCENERY.carpet,
    SCENERY.truck,
    SCENERY.bottles,
    ...Object.values(DISH_PIECES),
    ...Object.values(DECOR_PIECES),
  ];
}

// ---------------------------------------------------------------- KayKit
// Segundo kit, so de enfeite e detalhe: KayKit Restaurant Bits
// (public/models/kaykit/restaurant.glb, scripts/pack-kaykit-restaurant.mjs).
// Sem ele o jogo roda igual, so mais vazio.

export const BITS_URL = '/models/kaykit/restaurant.glb';
// as pecas dele tem 2 de lado por tile: entram pela metade
export const BITS_SCALE = 0.5;

export const BITS = {
  // no fim da bancada do fundo, no lugar do ultimo balcao
  fridges: ['fridge_A', 'fridge_B'],
  // na parede, em cima de cada fogao
  hood: 'extractorhood',
  // em cima da bancada, nos trechos sem estacao: um grupo por trecho, na
  // ordem. Cada peca com o deslocamento dela dentro do tile
  clutter: [
    [{ piece: 'pot_large', x: 0, z: 0 }],
    [
      { piece: 'jar_A_large', x: -0.22, z: -0.1 },
      { piece: 'jar_B_medium', x: 0.08, z: -0.15 },
      { piece: 'jar_C_small', x: 0.26, z: 0.1 },
    ],
    [{ piece: 'dishrack_plates', x: 0, z: 0 }],
    [
      { piece: 'papertowel', x: -0.2, z: -0.1 },
      { piece: 'jar_B_medium', x: 0.15, z: 0 },
    ],
  ],
  // pilha de caixotes, de baixo para cima; uma pilha por canto, na ordem
  crates: [
    ['crate_tomatoes', 'crate_cheese'],
    ['crate_lettuce', 'crate_carrots'],
    ['crate', 'crate_carrots'],
    ['crate_cheese', 'crate'],
  ],
  // altura de um caixote empilhado (no tamanho do kit) e tamanho da pilha
  crateHeight: 0.8,
  crateScale: 0.9,
  // caixote da entrega, na calcada
  delivery: 'crate_lettuce',
  // em cima de cada mesa e da mesa da gerente
  menu: 'menu',
  // em cima do balcao do caixa
  registerJar: 'jar_C_small',
  // na frente de quem senta: limpo ate comer, sujo depois
  plate: 'plate',
  plateDirty: 'plate_dirty',
  // folha da porta de correr da sala da gerencia (duas, abrem sozinhas)
  door: 'door_A',
};

// todas as pecas que o jogo pede ao segundo kit
export function bitsPieces(): string[] {
  return [
    ...BITS.fridges,
    BITS.hood,
    ...BITS.clutter.flatMap((group) => group.map((part) => part.piece)),
    ...BITS.crates.flat(),
    BITS.delivery,
    BITS.menu,
    BITS.registerJar,
    BITS.plate,
    BITS.plateDirty,
    BITS.door,
  ];
}
