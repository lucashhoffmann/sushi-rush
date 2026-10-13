import type { CharacterModel } from '@/app/engine/characters/character-model.loader';
import { SUSHI_RIG } from '@/app/engine/characters/sushi.rig';
import { SKIN_IDS } from '@/app/modules/management/constants/management.constants';
import type { SkinId } from '@/app/modules/world/types/world.types';

// O unico arquivo desta pasta que sabe que jogo e este: que modelo cada skin
// usa. Player, equipe e clientes saem todos daqui.

// os coelhos tem o mesmo esqueleto: os clipes de todos vem no arquivo do
// cinza (scripts/pack-sushi.mjs)
const RABBIT_CLIPS = '/models/sushi/rabbit-grey.glb';

// rabbitGrey -> rabbit-grey
const file = (skin: SkinId) =>
  skin.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

export const SKIN_MODELS = Object.fromEntries(
  SKIN_IDS.map((skin) => {
    const url = `/models/sushi/${file(skin)}.glb`;
    return [
      skin,
      {
        url,
        clipsUrl: skin === 'panda' ? url : RABBIT_CLIPS,
        rig: SUSHI_RIG,
      },
    ];
  }),
) as Record<SkinId, CharacterModel>;
