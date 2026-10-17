import { preloadCharacterModel } from 'three-hex-engine/three';
import { SKIN_MODELS } from '@/app/engine/characters/character-models.config';
import { preloadModelKit } from 'three-hex-engine/three';
import { BITS_URL, KIT_URL } from '@/app/engine/scenery/scenery.config';

// espera maxima pela rede antes de deixar o dia comecar mesmo assim
export const PRELOAD_TIMEOUT = 12000;

// Baixa o que o dia desenha: o cenario e todos os personagens (qualquer um
// pode entrar como cliente). Resolve quando tudo chegou, ou falhou, ou o
// tempo acabou: nunca rejeita. Chamar de novo e barato: os carregadores
// guardam o que ja baixaram.
export function preloadGameAssets(): Promise<void> {
  const loads = [
    preloadModelKit(KIT_URL),
    preloadModelKit(BITS_URL),
    ...Object.values(SKIN_MODELS).map(preloadCharacterModel),
  ];
  return Promise.race([
    Promise.allSettled(loads).then(() => {}),
    new Promise<void>((resolve) => setTimeout(resolve, PRELOAD_TIMEOUT)),
  ]);
}
