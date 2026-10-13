import { claimTip, takeTips } from '@/app/modules/vault/systems/vault.system';
import { TIP_CAP } from '@/app/modules/world/constants/world.constants';
import { openWorld } from '@/test/world.fixture';

describe('cofre da gorjeta', () => {
  it('cada cliente paga uma vez, ate o teto', () => {
    const world = openWorld();
    expect(claimTip(world, 1, 7.9)).toBe(7);
    expect(claimTip(world, 1, 50)).toBe(0);
    expect(claimTip(world, 2, 9999)).toBe(TIP_CAP);
    expect(claimTip(world, 3, -5)).toBe(0);
    expect(takeTips(world)).toBe(7 + TIP_CAP);
    expect(takeTips(world)).toBe(0);
  });

  it('gorjeta escrita direto no mundo nao entra no saldo', () => {
    const world = openWorld();
    world.run.tips = 5000;
    expect(takeTips(world)).toBe(0);
  });
});
