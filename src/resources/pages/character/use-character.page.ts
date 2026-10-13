import { useEffect, useRef, useState } from 'react';

import {
  type CharacterPreview,
  createCharacterPreview,
} from '@/app/engine/character-preview';
import { SKIN_IDS } from '@/app/modules/management/constants/management.constants';
import { offerOf } from '@/app/modules/management/systems/management.system';
import type { SkinId } from '@/app/modules/world/types/world.types';
import { useGameStore } from '@/app/store/game-store/game.store';
import { useTexts } from '@/shared/i18n';

export function useCharacterPage() {
  const t = useTexts();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<CharacterPreview | null>(null);
  const restaurant = useGameStore((state) => state.restaurant);
  const manage = useGameStore((state) => state.manage);
  const backToMenu = useGameStore((state) => state.backToMenu);
  // a skin no preview: a vestida, ate o jogador tocar em outra
  const [shown, setShown] = useState<SkinId>(restaurant.skin);

  useEffect(() => {
    if (!canvasRef.current) return;
    const preview = createCharacterPreview(canvasRef.current);
    previewRef.current = preview;
    return () => {
      previewRef.current = null;
      preview.dispose();
    };
  }, []);

  useEffect(() => {
    previewRef.current?.setSkin(shown);
  }, [shown]);

  return {
    t,
    canvasRef,
    restaurant,
    shown,
    skins: SKIN_IDS.map((skin) => ({
      skin,
      owned: restaurant.skins.includes(skin),
      wearing: restaurant.skin === skin,
      offer: offerOf(restaurant, { type: 'skin', skin }),
    })),
    show: setShown,
    buy: (skin: SkinId) => {
      setShown(skin);
      // comprou: ja sai vestindo
      if (manage({ type: 'skin', skin })) manage({ type: 'wear', skin });
    },
    wear: (skin: SkinId) => {
      setShown(skin);
      manage({ type: 'wear', skin });
    },
    backToMenu,
  };
}
