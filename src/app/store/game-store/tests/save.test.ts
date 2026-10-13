import {
  creditTips,
  manageSave,
  readSave,
  resetSave,
  restoreSave,
  saveGame,
  spendTips,
} from '@/app/store/game-store/save';

describe('save do restaurante', () => {
  beforeEach(resetSave);

  it('salva e volta igual', () => {
    creditTips(120);
    manageSave({ type: 'skin', skin: 'rabbitBald' });
    const saved = saveGame();
    const before = readSave();
    resetSave();
    expect(restoreSave(saved)).toEqual(before);
    expect(readSave().skins).toContain('rabbitBald');
  });

  it('save editado a mao nao bate com o selo e volta ao comeco', () => {
    creditTips(10);
    const saved = saveGame();
    const edited = {
      ...saved,
      data: saved.data.replace('"tips":10', '"tips":99999'),
    };
    expect(edited.data).not.toBe(saved.data);
    expect(restoreSave(edited).tips).toBe(0);
    expect(restoreSave({ data: 'lixo', seal: 'x' }).day).toBe(1);
    expect(restoreSave(null).coins).toBe(readSave().coins);
  });

  it('quem le recebe copia: mexer nela nao muda o saldo', () => {
    readSave().tips = 5000;
    expect(readSave().tips).toBe(0);
    expect(spendTips(1)).toBe(false);
    creditTips(3);
    expect(spendTips(3)).toBe(true);
    creditTips(-50);
    creditTips(1.5);
    expect(readSave().tips).toBe(0);
  });
});
