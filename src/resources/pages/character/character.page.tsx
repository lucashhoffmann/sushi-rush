import { ArrowLeft } from 'lucide-react';

import { Currency } from '@/resources/components/base/badges/badges.component';
import { PriceButton } from '@/resources/pages/manage/components/offer-card.component';
import { useCharacterPage } from '@/resources/pages/character/use-character.page';
import { cn } from '@/shared/lib/utils';
import { CHUNKY, PANEL } from '@/shared/styles/classes';

// Loja de skins: compra com gorjeta e escolhe a que o player veste.
export function CharacterPage() {
  const {
    t,
    canvasRef,
    restaurant,
    shown,
    skins,
    show,
    buy,
    wear,
    backToMenu,
  } = useCharacterPage();

  return (
    <main className='game-menu-background font-display flex h-full touch-pan-y flex-col overflow-hidden'>
      <header className='flex items-center gap-4 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2'>
        <button
          type='button'
          aria-label={t.common.back}
          onClick={backToMenu}
          className={`${CHUNKY} size-11 bg-[var(--game-secondary)]`}
        >
          <ArrowLeft
            aria-hidden
            className='size-6'
            strokeWidth={3}
          />
        </button>
        <h1 className='text-outline text-3xl tracking-wide text-white uppercase'>
          {t.character.title}
        </h1>
        <Currency
          kind='tips'
          amount={restaurant.tips}
          className='text-outline ml-auto text-xl'
        />
      </header>
      <div className='flex min-h-0 flex-1 flex-col gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row'>
        <div className='relative h-[36%] shrink-0 sm:h-auto sm:flex-1'>
          <canvas
            ref={canvasRef}
            aria-label={t.character.preview}
            className='block h-full w-full cursor-grab touch-none active:cursor-grabbing'
          />
          <p className='pointer-events-none absolute inset-x-0 bottom-1 text-center text-sm text-white/60'>
            {t.character.drag}
          </p>
        </div>
        <div className='flex min-h-0 flex-1 flex-col gap-2 sm:max-w-sm'>
          <ul className='flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1 pb-1'>
            {skins.map(({ skin, owned, wearing, offer }) => (
              <li
                key={skin}
                className={cn(
                  PANEL,
                  'flex items-center gap-3 p-2 pl-4',
                  shown === skin && 'border-[var(--game-highlight)]',
                )}
              >
                <button
                  type='button'
                  onClick={() => show(skin)}
                  className='min-w-0 flex-1 cursor-pointer text-left text-lg font-black text-white'
                >
                  {t.skins[skin]}
                </button>
                {wearing ? (
                  <span className='rounded-xl bg-black/35 px-3 py-1.5 text-sm font-bold text-[var(--game-highlight)]'>
                    {t.character.wearing}
                  </span>
                ) : owned ? (
                  <button
                    type='button'
                    aria-label={`${t.character.wear}: ${t.skins[skin]}`}
                    onClick={() => wear(skin)}
                    className={`${CHUNKY} bg-[var(--game-secondary)] px-3 py-1 text-base`}
                  >
                    {t.character.wear}
                  </button>
                ) : (
                  <PriceButton
                    offer={offer}
                    balance={restaurant.tips}
                    label={t.skins[skin]}
                    onBuy={() => buy(skin)}
                  />
                )}
              </li>
            ))}
          </ul>
          <p className='text-sm text-[var(--game-mutedText)]'>
            {t.character.note}
          </p>
        </div>
      </div>
    </main>
  );
}
