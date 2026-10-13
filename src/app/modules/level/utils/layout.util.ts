import {
  BASE_COLUMNS,
  TABLES_PER_COLUMN,
} from '@/app/modules/management/constants/management.constants';
import type {
  Layout,
  Mover,
  Register,
  Restaurant,
  Station,
  StationKind,
  Table,
  Vec2,
} from '@/app/modules/world/types/world.types';

// A planta do restaurante, montada a partir do que foi comprado. Um tile vale
// 1 de lado; `y` cresce da rua para o fundo.
//
//   y = 16  bancada do fundo, com as estacoes (solida)
//   y = 14, 15  cozinha (dois tiles, para se ver por cima do passa-pratos)
//   y = 13  passa-pratos (solido), com vao nas duas pontas
//   y = 11, 12  corredor
//   y = 4, 7, 10  mesas, de 4 em 4 tiles em x a partir de x = 2
//   y = 2  entrada
//   y = 1  cerca da frente (solida), com o portao
//   y = 0  calcada: fila de espera e entrega
//
// Os caixas ficam na penultima coluna do salao, com o cliente a esquerda e o
// caixa a direita. Depois do salao vem a sala da gerencia: uma parede de um
// tile com a porta, e a sala com a mesa e a gerente.

const TABLE_ROWS = [4, 7, 10];
const REGISTER_ROWS = [3, 5, 7];
const PASS_Y = 13;
const STATION_Y = 16;
export const LAYOUT_H = 18;
const DOOR_X = 4;
const QUEUE_SPOTS = 4;
// sala da gerencia: colunas a mais (parede + sala), fileiras da sala e da
// porta
const OFFICE_W = 4;
export const OFFICE_ROWS = [6, 11];
export const OFFICE_DOOR = [8, 9];
// distancia do centro da mesa ao banco
export const SEAT_OFFSET = 0.8;

type Plan = Pick<
  Restaurant,
  'expansion' | 'tables' | 'bigTables' | 'registers' | 'stations'
>;

export const columnsOf = (expansion: number) => BASE_COLUMNS + expansion;
export const widthOf = (expansion: number) => 4 * columnsOf(expansion) + 4;
// quantas mesas e estacoes cabem na planta
export const tableSlots = (expansion: number) =>
  TABLES_PER_COLUMN * columnsOf(expansion);
export const stationSlots = (expansion: number) =>
  Math.floor((widthOf(expansion) - 2) / 2);

export const tileCenter = (tx: number, ty: number): Vec2 => ({
  x: tx + 0.5,
  y: ty + 0.5,
});

export function isSolid(layout: Layout, tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= layout.w || ty >= layout.h) return true;
  return layout.solid[ty * layout.w + tx] === 1;
}

export function buildLevel(plan: Plan): {
  layout: Layout;
  tables: Table[];
  stations: Station[];
  registers: Register[];
} {
  const columns = columnsOf(plan.expansion);
  // `w` aqui e a largura do salao; a planta inteira tem a sala a mais
  const w = widthOf(plan.expansion);
  const total = w + OFFICE_W;
  const h = LAYOUT_H;
  const solid = new Array<number>(total * h).fill(0);
  const block = (tx: number, ty: number) => {
    solid[ty * total + tx] = 1;
  };

  // sala da gerencia: tudo solido depois do salao, menos a porta e a sala
  for (let x = w; x < total; x++) {
    for (let y = 2; y < h; y++) {
      const open =
        x === w
          ? OFFICE_DOOR.includes(y)
          : y >= OFFICE_ROWS[0] && y <= OFFICE_ROWS[1];
      if (!open) block(x, y);
    }
  }
  block(w + 2, OFFICE_DOOR[1]);

  // cerca da frente, com o portao de dois tiles
  for (let x = 0; x < total; x++) {
    if (x !== DOOR_X && x !== DOOR_X + 1) block(x, 1);
  }
  // passa-pratos: vao de um tile a esquerda e de dois a direita
  const pass: Vec2[] = [];
  for (let x = 1; x <= w - 3; x++) {
    block(x, PASS_Y);
    pass.push(tileCenter(x, PASS_Y));
  }
  for (let x = 0; x < total; x++) block(x, STATION_Y);

  // mesas: enche a fileira da frente antes de abrir a de tras
  const tables: Table[] = [];
  const count = Math.min(plan.tables, tableSlots(plan.expansion));
  for (let i = 0; i < count; i++) {
    const tx = 2 + 4 * (i % columns);
    const ty = TABLE_ROWS[Math.floor(i / columns)];
    block(tx, ty);
    tables.push({
      id: i,
      pos: tileCenter(tx, ty),
      seats: plan.bigTables ? 4 : 2,
      customer: null,
    });
  }

  const kinds = (['board', 'stove', 'steamer'] as StationKind[]).flatMap(
    (kind) => new Array<StationKind>(plan.stations[kind]).fill(kind),
  );
  const stations: Station[] = kinds
    .slice(0, stationSlots(plan.expansion))
    .map((kind, i) => ({
      id: i,
      kind,
      pos: tileCenter(1 + 2 * i, STATION_Y),
      front: tileCenter(1 + 2 * i, STATION_Y - 1),
      ticket: null,
      busy: false,
    }));

  const registers: Register[] = [];
  for (let i = 0; i < Math.min(plan.registers, REGISTER_ROWS.length); i++) {
    const ty = REGISTER_ROWS[i];
    block(w - 2, ty);
    registers.push({
      id: i,
      pos: tileCenter(w - 2, ty),
      front: tileCenter(w - 3, ty),
      back: tileCenter(w - 1, ty),
      customer: null,
      progress: 0,
      busy: false,
    });
  }

  return {
    layout: {
      w: total,
      h,
      salonW: w,
      desk: tileCenter(w + 2, OFFICE_DOOR[1]),
      manager: tileCenter(w + 3, OFFICE_DOOR[1]),
      solid,
      spawn: tileCenter(w - 1, 0),
      queue: Array.from({ length: QUEUE_SPOTS }, (_, i) =>
        tileCenter(DOOR_X - 1 - i, 0),
      ),
      delivery: tileCenter(DOOR_X + 4, 0),
      pass,
      kitchenY: PASS_Y,
      doorX: DOOR_X,
    },
    tables,
    stations,
    registers,
  };
}

// Onde senta cada pessoa de uma mesa: os dois lados primeiro, depois frente
// e fundo (mesa de 4). `facing` olha para a mesa.
export function seatSpots(table: Table): { pos: Vec2; facing: number }[] {
  const { x, y } = table.pos;
  return [
    { pos: { x: x - SEAT_OFFSET, y }, facing: 0 },
    { pos: { x: x + SEAT_OFFSET, y }, facing: Math.PI },
    { pos: { x, y: y - SEAT_OFFSET }, facing: Math.PI / 2 },
    { pos: { x, y: y + SEAT_OFFSET }, facing: -Math.PI / 2 },
  ].slice(0, table.seats);
}

// Anda um circulo pela planta, um eixo de cada vez: encostado na parede em x,
// ainda desliza em y.
export function moveCircle(
  layout: Layout,
  pos: Vec2,
  dx: number,
  dy: number,
  radius: number,
): void {
  const free = (x: number, y: number) =>
    !isSolid(layout, Math.floor(x - radius), Math.floor(y - radius)) &&
    !isSolid(layout, Math.floor(x + radius), Math.floor(y - radius)) &&
    !isSolid(layout, Math.floor(x - radius), Math.floor(y + radius)) &&
    !isSolid(layout, Math.floor(x + radius), Math.floor(y + radius));
  if (free(pos.x + dx, pos.y)) pos.x += dx;
  if (free(pos.x, pos.y + dy)) pos.y += dy;
}

// Anda pelo `path` na velocidade dada. Devolve true quando nao ha mais
// caminho a percorrer (chegou).
export function followPath(mover: Mover, speed: number, dt: number): boolean {
  let left = speed * dt;
  mover.moving = 0;
  while (mover.path.length > 0 && left > 0) {
    const next = mover.path[0];
    const dx = next.x - mover.pos.x;
    const dy = next.y - mover.pos.y;
    const gap = Math.hypot(dx, dy);
    if (gap > 1e-6) mover.facing = Math.atan2(dy, dx);
    mover.moving = 1;
    if (gap <= left) {
      mover.pos.x = next.x;
      mover.pos.y = next.y;
      mover.path.shift();
      left -= gap;
    } else {
      mover.pos.x += (dx / gap) * left;
      mover.pos.y += (dy / gap) * left;
      left = 0;
    }
  }
  return mover.path.length === 0;
}
