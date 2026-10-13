import { Pause } from 'lucide-react';

import {
  BOOST_IDS,
  BOOSTS,
  SPRINT_MAX,
} from '@/app/modules/world/constants/world.constants';
import type { BoostId } from '@/app/modules/world/types/world.types';
import type { Hud as HudData } from '@/app/store/game-store/game.store';
import {
  Currency,
  Stars,
} from '@/resources/components/base/badges/badges.component';
import { useTexts } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import { CHUNKY, PANEL } from '@/shared/styles/classes';

const BOOST_ICONS: Record<BoostId, string> = {
  staffTurbo: '🏃',
  kitchenTurbo: '🔥',
  freeze: '🧘',
  rushHour: '📣',
};
// combo a partir do qual o selo aparece
const COMBO_FROM = 3;

type HudProps = {
  hud: HudData;
  // saldo de gorjeta: e dele que saem os boosts
  tips: number;
  onBoost: (id: BoostId) => void;
  // falar com a gerente (o botao so aparece na mesa dela)
  onManager: () => void;
  // correr (no teclado, Espaco)
  onSprint: () => void;
  onPause?: () => void;
};

// O que o jogador acompanha durante o dia. Nao pega toque (o jogo esta por
// baixo), fora os botoes.
export function Hud({
  hud,
  tips,
  onBoost,
  onManager,
  onSprint,
  onPause,
}: HudProps) {
  const t = useTexts();
  const banner = hud.closing
    ? t.game.closing
    : hud.rush
      ? t.game.rush
      : hud.delivery > 0
        ? t.game.delivery(hud.delivery)
        : hud.fresh
          ? t.game.fresh
          : null;

  return (
    <div className='font-display pointer-events-none absolute inset-0 z-20 flex flex-col p-[max(0.6rem,env(safe-area-inset-top))_max(0.6rem,env(safe-area-inset-right))_0_max(0.6rem,env(safe-area-inset-left))] text-white'>
      <div className='animate-hud-in flex items-start gap-2'>
        {/* dia e relogio */}
        <div className={cn(PANEL, 'flex min-w-28 flex-col gap-1 px-3 py-1.5')}>
          <div className='flex items-center justify-between gap-3 text-sm font-black uppercase'>
            <span>{t.common.day(hud.day)}</span>
            <Stars count={hud.stars} />
          </div>
          <div
            role='progressbar'
            aria-label={t.common.day(hud.day)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(hud.timeLeft * 100)}
            className='h-2.5 overflow-hidden rounded-full bg-black/50'
          >
            <div
              className={cn(
                'h-full rounded-full transition-[width] duration-500 ease-linear',
                hud.timeLeft > 0.25
                  ? 'bg-[var(--game-highlight)]'
                  : 'bg-[var(--game-brand)]',
              )}
              style={{ width: `${hud.timeLeft * 100}%` }}
            />
          </div>
        </div>
        {/* meta do dia */}
        <div
          className={cn(
            PANEL,
            'flex flex-col items-center px-3 py-1 leading-tight',
            hud.served >= hud.goal && 'border-[var(--game-tip)]',
          )}
        >
          <span className='text-[0.65rem] font-black tracking-wide text-[var(--game-mutedText)] uppercase'>
            {t.game.goal}
          </span>
          <span
            key={hud.served}
            aria-label={`${t.game.served}: ${hud.served} / ${hud.goal}`}
            className='animate-hud-pop text-lg font-black tabular-nums'
          >
            {hud.served}/{hud.goal}
          </span>
        </div>
        {/* caixa do dia e gorjeta */}
        <div
          className={cn(
            PANEL,
            'ml-auto flex flex-col items-end px-3 py-1 text-lg leading-tight',
          )}
        >
          <Currency
            key={`coins:${hud.coins}`}
            kind='coins'
            amount={hud.coins}
            className='animate-hud-pop'
          />
          <Currency
            key={`tips:${tips}`}
            kind='tips'
            amount={tips}
            className='animate-hud-pop'
          />
        </div>
        {onPause && (
          <button
            type='button'
            aria-label={t.common.pause}
            onClick={onPause}
            className='pointer-events-auto flex size-11 cursor-pointer items-center justify-center rounded-xl border-4 border-[var(--game-frame)] bg-[var(--game-secondary)] shadow-[0_4px_0_var(--game-ink)] active:translate-y-1 active:shadow-none'
          >
            <Pause
              aria-hidden
              className='size-5 fill-white'
              strokeWidth={3}
            />
          </button>
        )}
      </div>

      <div className='mt-2 flex flex-col items-center gap-1.5'>
        {banner && (
          <p
            key={banner}
            role='status'
            className='text-outline animate-hud-pop rounded-full bg-[var(--game-brand)] px-4 py-0.5 text-lg font-black uppercase'
          >
            {banner}
          </p>
        )}
        {/* dica do que fazer: em cima, onde o dedo nao tampa */}
        {hud.hint && !hud.atManager && (
          <p
            key={hud.hint}
            role='status'
            className='text-outline animate-hud-pop max-w-[92%] rounded-2xl bg-black/45 px-4 py-1 text-center text-base font-bold sm:text-lg'
          >
            {t.game.hints[hud.hint]}
          </p>
        )}
        {hud.combo >= COMBO_FROM && (
          <p
            key={hud.combo}
            className='text-outline animate-hud-pop text-xl font-black text-[var(--game-highlight)] uppercase'
          >
            {t.game.combo(hud.combo)}
          </p>
        )}
      </div>

      {/* boosts: na direita, acima da area do joystick */}
      <div className='absolute top-[26%] right-[max(0.6rem,env(safe-area-inset-right))] flex flex-col gap-2'>
        {BOOST_IDS.map((id, index) => {
          const active = hud.boosts[id] > 0;
          const [name, detail] = t.game.boosts[id];
          return (
            <button
              key={id}
              type='button'
              aria-label={`${name}: ${detail}`}
              title={`${name}: ${detail}`}
              aria-pressed={active}
              disabled={!onPause || active || tips < BOOSTS[id].tips}
              // o toque e do botao: nao comeca o joystick por baixo
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onBoost(id)}
              className='pointer-events-auto relative flex size-14 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-[3px] border-[var(--game-frame)] bg-[var(--game-panel)] shadow-[0_4px_0_var(--game-ink)] transition-transform active:translate-y-1 active:shadow-none disabled:cursor-default disabled:opacity-55 aria-pressed:border-[var(--game-tip)] aria-pressed:opacity-100'
            >
              {/* tempo que falta: esvazia de cima para baixo */}
              <span
                aria-hidden
                className='absolute inset-x-0 bottom-0 bg-[var(--game-tip)]/45'
                style={{ height: `${hud.boosts[id] * 100}%` }}
              />
              <span
                aria-hidden
                className='relative text-2xl leading-none'
              >
                {BOOST_ICONS[id]}
              </span>
              <span className='relative text-xs leading-none font-black text-[var(--game-tip)] tabular-nums'>
                {BOOSTS[id].tips}
              </span>
              <span
                aria-hidden
                className='absolute top-0.5 left-1 hidden text-[0.6rem] font-black text-white/50 pointer-fine:block'
              >
                {index + 1}
              </span>
            </button>
          );
        })}
      </div>

      {/* correr: no canto direito embaixo, no polegar. Os tracos sao as
          corridas guardadas; o fundo esvazia ate elas voltarem todas */}
      {onPause && (
        <button
          type='button'
          aria-label={t.game.sprint(hud.sprints, SPRINT_MAX)}
          title={t.game.sprint(hud.sprints, SPRINT_MAX)}
          aria-pressed={hud.sprinting}
          disabled={hud.sprinting || hud.sprints === 0}
          // o toque e do botao: nao comeca o joystick por baixo
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onSprint}
          className='pointer-events-auto absolute right-[max(0.6rem,env(safe-area-inset-right))] bottom-[max(1.25rem,env(safe-area-inset-bottom))] flex size-[4.5rem] cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-full border-4 border-[var(--game-frame)] bg-[var(--game-panel)] shadow-[0_4px_0_var(--game-ink)] transition-transform active:translate-y-1 active:shadow-none disabled:cursor-default disabled:opacity-55 aria-pressed:border-[var(--game-tip)] aria-pressed:opacity-100'
        >
          <span
            aria-hidden
            className='absolute inset-x-0 bottom-0 bg-white/20'
            style={{ height: `${hud.sprintReset * 100}%` }}
          />
          <span
            aria-hidden
            className='relative text-2xl leading-none'
          >
            💨
          </span>
          <span
            aria-hidden
            className='relative flex gap-0.5'
          >
            {Array.from({ length: SPRINT_MAX }, (_, i) => (
              <span
                key={i}
                data-state={i < hud.sprints ? 'full' : 'empty'}
                className={cn(
                  'h-2 w-2.5 -skew-x-12 rounded-xs border border-[var(--game-ink)]',
                  i < hud.sprints ? 'bg-[var(--game-tip)]' : 'bg-white/20',
                )}
              />
            ))}
          </span>
          <kbd className='absolute top-1 hidden text-[0.55rem] leading-none font-black text-white/50 pointer-fine:block'>
            SPACE
          </kbd>
        </button>
      )}

      {/* dica do que fazer e bandeja, embaixo no centro */}
      <div className='mt-auto mb-[max(0.8rem,env(safe-area-inset-bottom))] flex flex-col items-center gap-1.5'>
        {/* na mesa da gerente: botao de acao (no teclado, F) */}
        {hud.atManager && (
          <button
            type='button'
            // o toque e do botao: nao comeca o joystick por baixo
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onManager}
            className={cn(
              CHUNKY,
              'animate-hud-pop pointer-events-auto bg-[var(--game-brand)] px-6 py-3 text-2xl',
            )}
          >
            <span
              aria-hidden
              className='[-webkit-text-stroke:0] [text-shadow:none]'
            >
              💼
            </span>
            {t.game.manager}
            <kbd className='hidden rounded-md bg-black/35 px-2 text-base pointer-fine:block'>
              F
            </kbd>
          </button>
        )}
        {hud.capacity > 0 && (
          <p
            aria-label={`${t.game.tray}: ${hud.carrying} / ${hud.capacity}`}
            className='flex items-center gap-1 rounded-full bg-black/45 px-3 py-0.5 text-lg'
          >
            {Array.from({ length: hud.capacity }, (_, slot) => (
              <span
                key={slot}
                aria-hidden
                className={slot < hud.carrying ? '' : 'opacity-25 grayscale'}
              >
                🍽️
              </span>
            ))}
          </p>
        )}
      </div>
    </div>
  );
}
