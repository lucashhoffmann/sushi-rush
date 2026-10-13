import { startSprint } from '@/app/modules/player/systems/player.system';
import {
  SPRINT_MAX,
  SPRINT_RESET,
  SPRINT_TIME,
} from '@/app/modules/world/constants/world.constants';
import { openWorld, run } from '@/test/world.fixture';

const RIGHT = { moveX: 1, moveY: 0 };

describe('corrida do player', () => {
  it('correndo anda mais que andando no mesmo tempo', () => {
    const walked = openWorld();
    const sprinted = openWorld();
    const from = walked.player.pos.x;
    expect(startSprint(sprinted)).toBe(true);
    run(walked, 0.5, undefined, RIGHT);
    run(sprinted, 0.5, undefined, RIGHT);
    expect(sprinted.player.pos.x - from).toBeGreaterThan(
      walked.player.pos.x - from,
    );
  });

  it('nao gasta outra enquanto corre, e para em SPRINT_MAX usos', () => {
    const world = openWorld();
    expect(startSprint(world)).toBe(true);
    expect(startSprint(world)).toBe(false);
    expect(world.player.sprints).toBe(SPRINT_MAX - 1);
    for (let i = 1; i < SPRINT_MAX; i++) {
      run(world, SPRINT_TIME + 0.1);
      expect(startSprint(world)).toBe(true);
    }
    run(world, SPRINT_TIME + 0.1);
    expect(world.player.sprints).toBe(0);
    expect(startSprint(world)).toBe(false);
  });

  it('SPRINT_RESET depois da primeira, voltam todas', () => {
    const world = openWorld();
    startSprint(world);
    run(world, SPRINT_RESET - 1);
    expect(world.player.sprints).toBe(SPRINT_MAX - 1);
    run(world, 1.1);
    expect(world.player.sprints).toBe(SPRINT_MAX);
    expect(world.player.sprintReset).toBe(0);
  });

  it('com o dia parado nao corre', () => {
    const world = openWorld();
    world.status = 'paused';
    expect(startSprint(world)).toBe(false);
    expect(world.player.sprints).toBe(SPRINT_MAX);
  });
});
