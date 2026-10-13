import { starsOf } from '@/app/modules/management/systems/management.system';
import { takeTips } from '@/app/modules/vault/systems/vault.system';
import {
  BOOSTS,
  DAY_LENGTH,
} from '@/app/modules/world/constants/world.constants';
import { startBoost } from '@/app/modules/world/systems/world.system';
import { hintOf } from '@/app/modules/world/utils/hint.util';
import { crew, openWorld, run } from '@/test/world.fixture';

describe('um dia inteiro', () => {
  it('com a equipe completa o dia roda sozinho ate fechar, e rende', () => {
    const world = openWorld({ staff: crew() });
    run(world, DAY_LENGTH + 60, (w) => w.status === 'dayover');
    expect(world.status).toBe('dayover');
    expect(world.customers).toHaveLength(0);
    expect(world.run.served).toBeGreaterThan(3);
    expect(world.run.coins).toBeGreaterThan(0);
    // a gorjeta mostrada e a que o cofre paga
    expect(takeTips(world)).toBe(world.run.tips);
    expect(world.reputation).toBeGreaterThan(10);
  });

  it('mesma seed, mesmo dia', () => {
    const a = openWorld({ staff: crew(), day: 4 }, 7);
    const b = openWorld({ staff: crew(), day: 4 }, 7);
    run(a, 60);
    run(b, 60);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('sem ninguem atendendo, os clientes desistem e a reputacao cai', () => {
    const world = openWorld({ reputation: 50 });
    run(world, 120);
    expect(world.run.lost).toBeGreaterThan(0);
    expect(world.run.served).toBe(0);
    expect(world.reputation).toBeLessThan(50);
    expect(starsOf(world.reputation)).toBeLessThanOrEqual(3);
  });

  it('bater a meta paga o bonus de gorjeta uma vez', () => {
    const world = openWorld({ staff: crew(5) });
    world.run.goal = 1;
    run(world, DAY_LENGTH + 60, (w) => w.status === 'dayover');
    const served = world.run.tips;
    expect(served).toBeGreaterThanOrEqual(world.run.goalBonus);
    expect(takeTips(world)).toBe(served);
    expect(takeTips(world)).toBe(0);
  });
});

describe('boosts', () => {
  it('liga pelo tempo do boost e nao empilha', () => {
    const world = openWorld();
    expect(startBoost(world, 'freeze')).toBe(true);
    expect(startBoost(world, 'freeze')).toBe(false);
    expect(world.boosts.freeze).toBe(BOOSTS.freeze.time);
    run(world, BOOSTS.freeze.time + 0.1);
    expect(world.boosts.freeze).toBe(0);
  });

  it('paciencia congelada nao cai', () => {
    const world = openWorld();
    run(world, 5, (w) => w.customers.length > 0);
    const [customer] = world.customers;
    run(world, 12, (w) => w.customers[0]?.state === 'wantOrder');
    startBoost(world, 'freeze');
    const before = customer.patience;
    run(world, 5);
    expect(customer.patience).toBe(before);
  });
});

describe('dica do que fazer', () => {
  it('sozinho: anotar, cozinhar, buscar, entregar e cobrar, nessa ordem', () => {
    const world = openWorld();
    const { player } = world;
    const seen: (string | null)[] = [];
    const note = () => {
      const hint = hintOf(world);
      if (hint !== seen.at(-1)) seen.push(hint);
    };
    run(world, 20, (w) => w.customers.length > 0);
    // um cliente so, para a ordem das dicas ser a do atendimento dele
    world.spawnIn = Infinity;
    run(world, 20, (w) => w.customers[0]?.state === 'wantOrder');
    note();
    // ao lado da mesa: anota
    const table = world.tables[0];
    player.pos = { x: table.pos.x, y: table.pos.y + 1 };
    run(world, 0.1);
    note();
    expect(world.tickets.length).toBeGreaterThan(0);
    // na frente da tabua: prepara tudo
    player.pos = { ...world.stations[0].front };
    run(world, 30, (w) => w.tickets.every((t) => t.state === 'ready'));
    note();
    expect(player.action).toBe('board');
    // no passa-pratos: pega
    const ready = world.tickets[0];
    player.pos = {
      x: world.layout.pass[ready.slot!].x,
      y: world.layout.kitchenY - 0.5,
    };
    run(world, 0.1);
    note();
    expect(player.carrying.length).toBeGreaterThan(0);
    // de volta a mesa: entrega; o cliente come e vai pagar
    while (world.tickets.length > 0) {
      const slot = world.tickets.find((t) => t.slot !== null)?.slot;
      if (slot !== undefined && slot !== null) {
        player.pos = {
          x: world.layout.pass[slot].x,
          y: world.layout.kitchenY - 0.5,
        };
        run(world, 0.1);
      }
      player.pos = { x: table.pos.x, y: table.pos.y + 1 };
      run(world, 0.1);
    }
    expect(world.customers[0].state).toBe('eating');
    run(world, 30, (w) => w.customers[0]?.state === 'paying');
    note();
    player.pos = { ...world.registers[0].back };
    run(world, 10, (w) => w.run.served > 0);
    expect(player.action).toBe('register');
    expect(world.run.coins).toBeGreaterThan(0);
    expect(seen).toEqual(['order', 'cook', 'pickup', 'deliver', 'checkout']);
  });
});
