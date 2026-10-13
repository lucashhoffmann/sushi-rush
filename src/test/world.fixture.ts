import { newRestaurant } from '@/app/modules/management/systems/management.system';
import {
  begin,
  createWorld,
  stepWorld,
} from '@/app/modules/world/systems/world.system';
import { FIXED_DT } from '@/app/modules/world/constants/world.constants';
import type {
  InputState,
  Restaurant,
  World,
} from '@/app/modules/world/types/world.types';

export const STILL: InputState = { moveX: 0, moveY: 0 };

// restaurante de teste: o inicial, com o que o teste trocar
export function restaurantWith(changes: Partial<Restaurant> = {}): Restaurant {
  return { ...newRestaurant(), ...changes };
}

// um de cada funcao, no nivel dado
export function crew(level = 1): Restaurant['staff'] {
  return (['waiter', 'cook', 'cashier'] as const).map((role, i) => ({
    id: i + 1,
    role,
    level,
    skin: 'rabbitGrey',
  }));
}

// dia ja aberto
export function openWorld(changes: Partial<Restaurant> = {}, seed = 1): World {
  const world = createWorld(restaurantWith(changes), seed);
  begin(world);
  return world;
}

// roda `seconds` de jogo, ou ate `until` valer
export function run(
  world: World,
  seconds: number,
  until: (world: World) => boolean = () => false,
  input: InputState = STILL,
): void {
  for (let t = 0; t < seconds && !until(world); t += FIXED_DT) {
    stepWorld(world, input, FIXED_DT);
  }
}
