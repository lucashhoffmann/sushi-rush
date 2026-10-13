import { isSolid } from '@/app/modules/level/utils/layout.util';
import type { Layout, Vec2 } from '@/app/modules/world/types/world.types';

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

// BFS em 4 direcoes: no grid de custo uniforme ja devolve o caminho mais
// curto, e sem diagonal nao corta quina de mesa.
// Devolve os centros dos tiles depois do inicial, terminando no primeiro tile
// que `isGoal` aceita. Vazio quando ja esta nele; null quando nao ha caminho.
function search(
  layout: Layout,
  from: Vec2,
  isGoal: (tx: number, ty: number) => boolean,
): Vec2[] | null {
  const queue: [number, number][] = [[Math.floor(from.x), Math.floor(from.y)]];
  const parents = [-1];
  const seen = new Set([queue[0][1] * layout.w + queue[0][0]]);

  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i];
    if (isGoal(x, y)) {
      const path: Vec2[] = [];
      for (let n = i; n > 0; n = parents[n]) {
        path.unshift({ x: queue[n][0] + 0.5, y: queue[n][1] + 0.5 });
      }
      return path;
    }
    for (const [dx, dy] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      const key = ny * layout.w + nx;
      if (seen.has(key) || isSolid(layout, nx, ny)) continue;
      seen.add(key);
      parents.push(i);
      queue.push([nx, ny]);
    }
  }
  return null;
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
