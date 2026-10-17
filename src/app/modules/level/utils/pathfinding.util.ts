import { searchGrid, tileCenterOf } from 'three-hex-engine/kit';

import { isSolid } from '@/app/modules/level/utils/layout.util';
import type { Layout, Vec2 } from '@/app/modules/world/types/world.types';

// Caminho em 4 direcoes pela grade (BFS do kit da engine): mais curto, e sem
// diagonal nao corta quina de mesa.
// Devolve os centros dos tiles depois do inicial, terminando no primeiro tile
// que `isGoal` aceita. Vazio quando ja esta nele; null quando nao ha caminho.
function search(
  layout: Layout,
  from: Vec2,
  isGoal: (tx: number, ty: number) => boolean,
): Vec2[] | null {
  const tiles = searchGrid(from, isGoal, (x, y) => isSolid(layout, x, y));
  return tiles?.map(tileCenterOf) ?? null;
}

// caminho ate o tile de `to`
export function pathTo(layout: Layout, from: Vec2, to: Vec2): Vec2[] | null {
  const goalX = Math.floor(to.x);
  const goalY = Math.floor(to.y);
  return search(layout, from, (x, y) => x === goalX && y === goalY);
}

// caminho ate o tile livre mais perto que encosta no tile de `target`
// (mesa, balcao): e de onde se atende
export function pathBeside(
  layout: Layout,
  from: Vec2,
  target: Vec2,
): Vec2[] | null {
  const tx = Math.floor(target.x);
  const ty = Math.floor(target.y);
  return search(
    layout,
    from,
    (x, y) => Math.abs(x - tx) + Math.abs(y - ty) === 1,
  );
}
