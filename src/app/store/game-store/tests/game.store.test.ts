import {
  BOOSTS,
  DAY_LENGTH,
  FIXED_DT,
} from '@/app/modules/world/constants/world.constants';
import { getWorld, useGameStore } from '@/app/store/game-store/game.store';
import { creditTips, readSave } from '@/app/store/game-store/save';
import { crew, STILL } from '@/test/world.fixture';

const store = () => useGameStore.getState();

describe('store do jogo', () => {
  beforeEach(() => store().resetGame());

  it('primeiro dia abre no como-jogar; os seguintes ja comecam', () => {
    store().startDay();
    expect(store().screen).toBe('intro');
    store().begin();
    expect(store().screen).toBe('playing');
    store().backToMenu();
    store().startDay();
    expect(store().screen).toBe('playing');
  });

  it('boost cobra gorjeta do save e so com saldo', () => {
    store().startDay();
    store().begin();
    store().boost('freeze');
    expect(getWorld()!.boosts.freeze).toBe(0);
    creditTips(BOOSTS.freeze.tips + 1);
    store().boost('freeze');
    expect(getWorld()!.boosts.freeze).toBeGreaterThan(0);
    expect(readSave().tips).toBe(1);
    // ligado: nao cobra de novo
    store().boost('freeze');
    expect(readSave().tips).toBe(1);
  });

  it('fim do dia credita caixa e gorjeta, avanca o dia e mostra o resumo', () => {
    creditTips(0);
    store().manage({ type: 'table' });
    store().startDay();
    store().begin();
    const world = getWorld()!;
    // equipe direto no mundo: o dia roda sem input
    const staffed = crew(3).map((member) => ({
      ...member,
      pos: { ...world.player.pos },
      facing: 0,
      moving: 0,
      path: [],
      carrying: [],
      task: null,
      action: 'none' as const,
    }));
    world.staff.push(...staffed);
    const coins = readSave().coins;
    for (
      let t = 0;
      t < DAY_LENGTH + 60 && store().screen !== 'dayover';
      t += FIXED_DT
    ) {
      store().tick(STILL, FIXED_DT);
    }
    const { summary, restaurant } = store();
    expect(store().screen).toBe('dayover');
    expect(summary!.served).toBeGreaterThan(0);
    expect(restaurant.day).toBe(2);
    expect(restaurant.coins).toBe(coins + summary!.coins);
    expect(restaurant.tips).toBe(summary!.tips);
    expect(restaurant).toEqual(readSave());
  });
});

describe('sala da gerente', () => {
  beforeEach(() => store().resetGame());

  it('na mesa, so a acao abre a gerencia; sair volta para o mesmo dia', () => {
    store().startDay();
    store().begin();
    const world = getWorld()!;
    // longe da mesa a acao nao faz nada
    store().visitManager();
    expect(store().screen).toBe('playing');
    world.player.pos = { x: world.layout.desk.x - 1, y: world.layout.desk.y };
    store().tick(STILL, FIXED_DT);
    // chegar perto so mostra o botao
    expect(store().screen).toBe('playing');
    expect(store().hud.atManager).toBe(true);
    store().visitManager();
    expect(store().screen).toBe('manage');
    expect(store().visiting).toBe(true);
    expect(world.status).toBe('paused');
    store().leaveManager();
    expect(store().screen).toBe('playing');
    expect(getWorld()).toBe(world);
    expect(world.status).toBe('playing');
  });
});
