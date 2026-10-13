import type {
  Blocked,
  Offer,
} from '@/app/modules/management/systems/management.system';
import { Currency } from '@/resources/components/base/badges/badges.component';
import { useTexts } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import { CHUNKY, PANEL } from '@/shared/styles/classes';

// por que nao da para comprar, em texto
export function blockedText(
  offer: Offer,
  t: ReturnType<typeof useTexts>,
): string | null {
  const { blocked } = offer;
  if (!blocked) return null;
  if (blocked === 'stars') return t.manage.blocked.stars(offer.stars ?? 0);
  return t.manage.blocked[blocked as Exclude<Blocked, 'stars'>];
}

// botao de preco: compra se o saldo cobre; travado, mostra o motivo
export function PriceButton({
  offer,
  balance,
  label,
  onBuy,
  className,
}: {
  offer: Offer;
  // saldo da moeda desta oferta
  balance: number;
  // nome da acao, para leitor de tela
  label: string;
  onBuy: () => void;
  className?: string;
}) {
  const t = useTexts();
  const reason = blockedText(offer, t);
  if (reason) {
    return (
      <span
        className={cn(
          'rounded-xl bg-black/35 px-3 py-1.5 text-center text-sm font-bold text-white/70',
          className,
        )}
      >
        {reason}
      </span>
    );
  }
  return (
    <button
      type='button'
      aria-label={`${t.manage.buy}: ${label}`}
      disabled={balance < offer.cost}
      onClick={onBuy}
      className={cn(
        CHUNKY,
        'bg-[var(--game-success)] px-3 py-1 text-lg normal-case',
        className,
      )}
    >
      <Currency
        kind={offer.currency}
        amount={offer.cost}
        className='text-white'
      />
    </button>
  );
}

type OfferCardProps = {
  icon: string;
  title: string;
  detail: string;
  offer: Offer;
  balance: number;
  onBuy: () => void;
};

// um item a venda na gerencia
export function OfferCard({
  icon,
  title,
  detail,
  offer,
  balance,
  onBuy,
}: OfferCardProps) {
  return (
    <li
      className={cn(
        PANEL,
        'flex items-center gap-3 p-3 text-left',
        offer.blocked === 'owned' && 'opacity-60',
      )}
    >
      <span
        aria-hidden
        className='flex size-12 shrink-0 items-center justify-center rounded-xl bg-black/30 text-3xl'
      >
        {icon}
      </span>
      <div className='min-w-0 flex-1'>
        <h3 className='text-lg leading-tight font-black text-white'>{title}</h3>
        <p className='text-sm leading-snug text-[var(--game-mutedText)]'>
          {detail}
        </p>
      </div>
      <PriceButton
        offer={offer}
        balance={balance}
        label={title}
        onBuy={onBuy}
        className='shrink-0'
      />
    </li>
  );
}
