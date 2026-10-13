import { useEffect, useRef, useState } from 'react';

import { preloadGameAssets } from '@/app/engine/assets.preload';
import { createGameEngine } from '@/app/engine/game-engine';
import { useGameStore } from '@/app/store/game-store/game.store';
import { useTexts } from '@/shared/i18n';

export function useGamePage() {
  const t = useTexts();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const screen = useGameStore((state) => state.screen);
  const hud = useGameStore((state) => state.hud);
  const summary = useGameStore((state) => state.summary);
  const restaurant = useGameStore((state) => state.restaurant);
  const begin = useGameStore((state) => state.begin);
  const togglePause = useGameStore((state) => state.togglePause);
  const backToMenu = useGameStore((state) => state.backToMenu);
  const openManage = useGameStore((state) => state.openManage);
  const startDay = useGameStore((state) => state.startDay);
  const boost = useGameStore((state) => state.boost);
  const visitManager = useGameStore((state) => state.visitManager);
  const sprint = useGameStore((state) => state.sprint);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = createGameEngine(canvasRef.current);
    return () => engine.dispose();
  }, []);

  // Modelos e cenario chegam pela rede: ate la a tela fica coberta, para
  // ninguem ver o salao se montar aos pedacos. Nunca trava: a espera tem teto.
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    void preloadGameAssets().then(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return {
    canvasRef,
    loading,
    loadingLabel: t.game.loading,
    screen,
    hud,
    summary,
    tips: restaurant.tips,
    staff: restaurant.staff,
    begin,
    pause: togglePause,
    backToMenu,
    openManage,
    startDay,
    boost,
    visitManager,
    sprint,
  };
}
