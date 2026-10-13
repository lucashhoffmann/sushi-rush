import { ChefHat, Play, Settings, Shirt, Trophy } from 'lucide-react';
import { useState } from 'react';

import { starsOf } from '@/app/modules/management/systems/management.system';
import {
  GRAPHICS_QUALITIES,
  useGameStore,
} from '@/app/store/game-store/game.store';
import {
  Currency,
  Stars,
} from '@/resources/components/base/badges/badges.component';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/resources/components/ui/dialog';
import { InstallApp } from '@/resources/pages/home/components/install-app/install-app.component';
import { useLanguage, useTexts } from '@/shared/i18n';
import { CHUNKY } from '@/shared/styles/classes';

const SECONDARY = `${CHUNKY} w-full bg-[var(--game-secondary)] px-5 py-2 text-lg`;

export function HomePage() {
  const t = useTexts();
  const language = useLanguage((state) => state.language);
  const setLanguage = useLanguage((state) => state.setLanguage);
  const restaurant = useGameStore((state) => state.restaurant);
  const startDay = useGameStore((state) => state.startDay);
  const openManage = useGameStore((state) => state.openManage);
  const openCharacter = useGameStore((state) => state.openCharacter);
  const graphics = useGameStore((state) => state.graphics);
  const setGraphics = useGameStore((state) => state.setGraphics);
  const resetGame = useGameStore((state) => state.resetGame);
  // recomecar apaga tudo: pede um segundo toque
  const [confirming, setConfirming] = useState(false);

  // Rola quando o conteudo nao cabe (celular deitado). O centro vem das
  // margens automaticas do titulo e do rodape. touch-pan-y: o body bloqueia
  // gestos de toque por causa do jogo.
  return (
    <main className='game-menu-background font-display relative flex h-full touch-pan-y flex-col items-center gap-6 overflow-x-hidden overflow-y-auto p-6 text-center'>
      {/* noren: a cortina da porta do sushi bar, com o sol no meio */}
      <div
        aria-hidden
        className='pointer-events-none absolute inset-x-0 top-0 flex justify-center gap-1.5'
      >
        {[4.3, 5.9, 3.7, 6.7, 5.1].map((duration, flap) => (
          <div
            key={flap}
            className='noren-flap h-16 w-[min(18vw,7rem)] rounded-b-xl bg-[var(--game-brand)] shadow-[0_4px_0_var(--game-ink)] sm:h-20'
            style={{
              animationDuration: `${duration}s`,
              animationDelay: `${flap * -1.9}s`,
            }}
          />
        ))}
      </div>
      <h1 className='text-outline relative mt-auto flex -rotate-3 flex-col pt-20 font-[family-name:var(--font-title)] text-6xl leading-[0.95] tracking-wide uppercase sm:text-7xl'>
        <span className='text-white'>Sushi</span>
        <span className='text-[1.2em] text-[var(--game-brand)]'>Rush</span>
      </h1>
      <p className='text-outline relative -mt-2 text-lg text-[var(--game-frame)]'>
        {t.home.subtitle}
      </p>
      <div className='text-outline relative flex flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-full bg-black/35 px-5 py-1.5 text-xl'>
        <Stars count={starsOf(restaurant.reputation)} />
        <Currency
          kind='coins'
          amount={restaurant.coins}
        />
        <Currency
          kind='tips'
          amount={restaurant.tips}
        />
      </div>
      <button
        type='button'
        className={`${CHUNKY} relative bg-[var(--game-success)] px-10 py-4 text-3xl sm:text-4xl`}
        onClick={startDay}
      >
        <Play
          aria-hidden
          className='size-8 fill-white'
          strokeWidth={3}
        />
        {t.home.play(restaurant.day)}
      </button>
      <div className='relative flex w-full max-w-xs flex-col gap-3'>
        <button
          type='button'
          className={SECONDARY}
          onClick={openManage}
        >
          <ChefHat
            aria-hidden
            className='size-5'
            strokeWidth={3}
          />
          {t.home.manage}
        </button>
        <button
          type='button'
          className={SECONDARY}
          onClick={openCharacter}
        >
          <Shirt
            aria-hidden
            className='size-5'
            strokeWidth={3}
          />
          {t.home.skins}
        </button>
        <Dialog onOpenChange={() => setConfirming(false)}>
          <DialogTrigger asChild>
            <button
              type='button'
              className={SECONDARY}
            >
              <Settings
                aria-hidden
                className='size-5'
                strokeWidth={3}
              />
              {t.home.settings}
            </button>
          </DialogTrigger>
          <DialogContent className='font-sans'>
            <DialogHeader>
              <DialogTitle>{t.home.settings}</DialogTitle>
              <DialogDescription>
                {t.home.settingsDescription}
              </DialogDescription>
            </DialogHeader>
            <fieldset className='flex flex-col gap-2'>
              <legend className='font-semibold'>{t.home.graphics}</legend>
              <div
                role='radiogroup'
                aria-label={t.home.graphics}
                className='grid grid-cols-3 gap-2'
              >
                {GRAPHICS_QUALITIES.map((quality) => (
                  <button
                    key={quality}
                    type='button'
                    role='radio'
                    aria-checked={graphics.quality === quality}
                    onClick={() => setGraphics({ quality })}
                    className='cursor-pointer rounded-md border px-3 py-2 text-sm aria-checked:border-transparent aria-checked:bg-[var(--game-secondary)] aria-checked:text-white'
                  >
                    {t.home.graphicsQuality[quality]}
                  </button>
                ))}
              </div>
              <p className='text-muted-foreground text-xs'>
                {t.home.graphicsHint} {t.home.graphicsNote}
              </p>
            </fieldset>
            <button
              type='button'
              className='cursor-pointer rounded-md border px-3 py-2 text-left text-sm'
              aria-label={t.home.changeLanguage}
              onClick={() => setLanguage(language === 'pt-BR' ? 'en' : 'pt-BR')}
            >
              <span aria-hidden>{language === 'pt-BR' ? '🇧🇷' : '🇺🇸'}</span>{' '}
              {t.home.language}: {t.home.languageName}
            </button>
            <button
              type='button'
              className='cursor-pointer rounded-md border border-[var(--game-destructive)] px-3 py-2 text-left text-sm text-[var(--game-destructive)]'
              onClick={() => {
                if (confirming) resetGame();
                setConfirming(!confirming);
              }}
            >
              {confirming ? t.home.resetConfirm : t.home.reset}
            </button>
          </DialogContent>
        </Dialog>
      </div>
      <InstallApp />
      {restaurant.bestDay > 0 && (
        <p className='text-outline relative flex items-center gap-2 text-base text-[var(--game-highlight)]'>
          <Trophy
            aria-hidden
            className='size-5'
            strokeWidth={3}
          />
          {t.home.bestDay(restaurant.bestDay)}
        </p>
      )}
      <p className='relative mb-auto max-w-xs font-sans text-sm text-white/70'>
        {t.home.instructions}
      </p>
    </main>
  );
}
