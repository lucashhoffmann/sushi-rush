import { Star } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import { useTexts } from '@/shared/i18n';

// Numeros que aparecem em toda tela: saldo de moedas e de gorjeta, e as
// estrelas de reputacao.

const CURRENCY = {
  coins: { icon: '🟡', color: 'text-[var(--game-coin)]' },
  tips: { icon: '💵', color: 'text-[var(--game-tip)]' },
};

export function Currency({
  kind,
  amount,
  className,
}: {
  kind: 'coins' | 'tips';
  amount: number;
  className?: string;
}) {
  const t = useTexts();
  return (
    <span
      aria-label={`${t.common[kind]}: ${amount}`}
      className={cn(
        'inline-flex items-center gap-1 font-black tabular-nums',
        CURRENCY[kind].color,
        className,
      )}
    >
      {/* emoji nao leva o contorno do texto em volta */}
      <span
        aria-hidden
        className='[-webkit-text-stroke:0] [text-shadow:none]'
      >
        {CURRENCY[kind].icon}
      </span>
      {amount}
    </span>
  );
}

export function Stars({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  const t = useTexts();
  return (
    <span
      role='img'
      aria-label={t.common.stars(count)}
      className={cn('inline-flex items-center gap-0.5', className)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          aria-hidden
          className={cn(
            'size-[1em]',
            star <= count
              ? 'fill-[var(--game-highlight)] text-[var(--game-highlight)]'
              : 'fill-black/40 text-white/30',
          )}
          strokeWidth={2.5}
        />
      ))}
    </span>
  );
}
