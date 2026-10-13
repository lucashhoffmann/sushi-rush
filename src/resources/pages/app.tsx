import { useEffect } from 'react';

import { preloadGameAssets } from '@/app/engine/assets.preload';
import { useGameStore } from '@/app/store/game-store/game.store';
import { CharacterPage } from '@/resources/pages/character/character.page';
import { GamePage } from '@/resources/pages/game/game.page';
import { HomePage } from '@/resources/pages/home/home.page';
import { ManagePage } from '@/resources/pages/manage/manage.page';

// telas escolhidas pelo store; sem router ate existir URL para navegar
export default function App() {
  const screen = useGameStore((state) => state.screen);
  // ja no menu os modelos comecam a baixar: ao abrir o restaurante, quase
  // sempre nao ha espera
  useEffect(() => {
    void preloadGameAssets();
  }, []);
  if (screen === 'menu') return <HomePage />;
  if (screen === 'manage') return <ManagePage />;
  if (screen === 'character') return <CharacterPage />;
  return <GamePage />;
}
