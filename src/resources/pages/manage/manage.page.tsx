import { ArrowLeft, Play } from 'lucide-react';

import {
  Currency,
  Stars,
} from '@/resources/components/base/badges/badges.component';
import {
  OfferCard,
  PriceButton,
} from '@/resources/pages/manage/components/offer-card.component';
import { TABS, useManagePage } from '@/resources/pages/manage/use-manage.page';
import { cn } from '@/shared/lib/utils';
import { CHUNKY, PANEL } from '@/shared/styles/classes';

// A gerencia: o que se compra entre um dia e outro.
export function ManagePage() {
  const {
    t,
    tab,
    setTab,
    restaurant,
    stars,
    cards,
    pending,
    staff,
    manage,
    visiting,
    leave,
    proceed,
  } = useManagePage();

  return (
    <main className='game-menu-background font-display flex h-full touch-pan-y flex-col overflow-hidden'>
      <header className='flex flex-wrap items-center gap-x-4 gap-y-2 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2'>
        <button
          type='button'
          aria-label={t.common.back}
          onClick={leave}
          className={`${CHUNKY} size-11 bg-[var(--game-secondary)]`}
        >
          <ArrowLeft
            aria-hidden
            className='size-6'
            strokeWidth={3}
          />
        </button>
        <h1 className='text-outline text-3xl tracking-wide text-white uppercase'>
          {t.manage.title}
        </h1>
        <div className='text-outline ml-auto flex items-center gap-4 text-xl'>
          <Stars count={stars} />
          <Currency
            kind='coins'
            amount={restaurant.coins}
          />
          <Currency
            kind='tips'
            amount={restaurant.tips}
          />
        </div>
      </header>

      <div
        role='tablist'
        className='flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 py-2'
      >
        {TABS.map((id) => (
          <button
            key={id}
            type='button'
            role='tab'
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className='shrink-0 cursor-pointer rounded-full border-[3px] border-[var(--game-frame)] bg-[var(--game-muted)] px-4 py-1 text-lg font-black text-white/80 uppercase aria-selected:bg-[var(--game-brand)] aria-selected:text-white'
          >
            {t.manage.tabs[id]}
          </button>
        ))}
      </div>

      <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4'>
        {visiting && (
          <p className='text-sm text-[var(--game-highlight)]'>
            {t.manage.visitNote}
          </p>
        )}
        {pending.length > 0 && (
          <section className={cn(PANEL, 'p-3')}>
            <h2 className='mb-2 text-sm font-black tracking-wide text-[var(--game-highlight)] uppercase'>
              {t.manage.pending}
            </h2>
            <ul className='flex flex-col gap-2'>
              {pending.map((item) => (
                <li
                  key={item.key}
                  className='flex items-center gap-3'
                >
                  <span aria-hidden>🚧</span>
                  <span className='min-w-0 flex-1 font-bold text-white'>
                    {item.label}{' '}
                    <span className='font-normal text-[var(--game-mutedText)]'>
                      · {t.manage.days(item.days)}
                    </span>
                  </span>
                  <span className='text-sm text-white/70'>{t.manage.skip}</span>
                  <PriceButton
                    offer={item.offer}
                    balance={restaurant.tips}
                    label={`${t.manage.skip} ${item.label}`}
                    onBuy={() => manage(item.action)}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        <ul className='grid gap-3 sm:grid-cols-2'>
          {cards.map((card) => (
            <OfferCard
              key={card.key}
              icon={card.icon}
              title={card.title}
              detail={card.detail}
              offer={card.offer}
              balance={restaurant[card.offer.currency]}
              onBuy={() => manage(card.action)}
            />
          ))}
        </ul>

        {tab === 'team' && (
          <section>
            <p className='mb-2 text-sm text-[var(--game-mutedText)]'>
              {staff.length === 0 ? t.manage.noStaff : t.manage.trainInfo}
            </p>
            <ul className='grid gap-3 sm:grid-cols-2'>
              {staff.map(({ member, icon, train, nextSkin }) => (
                <li
                  key={member.id}
                  className={cn(PANEL, 'flex items-center gap-3 p-3')}
                >
                  <span
                    aria-hidden
                    className='flex size-12 shrink-0 items-center justify-center rounded-xl bg-black/30 text-3xl'
                  >
                    {icon}
                  </span>
                  <div className='min-w-0 flex-1 text-left'>
                    <h3 className='text-lg leading-tight font-black text-white capitalize'>
                      {t.roles[member.role]} · {t.manage.level(member.level)}
                    </h3>
                    <button
                      type='button'
                      disabled={nextSkin === member.skin}
                      onClick={() =>
                        manage({
                          type: 'staffSkin',
                          staff: member.id,
                          skin: nextSkin,
                        })
                      }
                      aria-label={`${t.manage.staffSkin}: ${t.roles[member.role]} ${member.id}`}
                      className='cursor-pointer text-sm text-[var(--game-mutedText)] underline-offset-2 hover:underline disabled:cursor-default disabled:no-underline'
                    >
                      👕 {t.skins[member.skin]}
                    </button>
                  </div>
                  <div className='flex shrink-0 flex-col items-center gap-0.5'>
                    <span className='text-xs text-white/70 uppercase'>
                      {t.manage.train}
                    </span>
                    <PriceButton
                      offer={train}
                      balance={restaurant.coins}
                      label={`${t.manage.train} ${t.roles[member.role]} ${member.id}`}
                      onBuy={() => manage({ type: 'train', staff: member.id })}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
        {tab === 'upgrades' && (
          <p className='text-sm text-[var(--game-mutedText)]'>
            {t.manage.boostsNote}
          </p>
        )}
      </div>

      <footer className='flex justify-center px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]'>
        <button
          type='button'
          className={`${CHUNKY} bg-[var(--game-success)] px-8 py-3 text-2xl`}
          onClick={proceed}
        >
          <Play
            aria-hidden
            className='size-6 fill-white'
            strokeWidth={3}
          />
          {visiting ? t.manage.backToDay : t.home.play(restaurant.day)}
        </button>
      </footer>
    </main>
  );
}
