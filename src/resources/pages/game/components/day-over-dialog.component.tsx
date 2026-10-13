import type { StaffMember } from '@/app/modules/world/types/world.types';
import type { DaySummary } from '@/app/store/game-store/game.store';
import {
  Currency,
  Stars,
} from '@/resources/components/base/badges/badges.component';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/resources/components/ui/dialog';
import { jobLabel } from '@/resources/pages/manage/use-manage.page';
import { useTexts } from '@/shared/i18n';
import { CHUNKY } from '@/shared/styles/classes';

type DayOverDialogProps = {
  summary: DaySummary | null;
  staff: StaffMember[];
  onNext: () => void;
  onManage: () => void;
};

// Fim do dia: o que rendeu, e para onde ir.
export function DayOverDialog({
  summary,
  staff,
  onNext,
  onManage,
}: DayOverDialogProps) {
  const t = useTexts();
  if (!summary) return null;
  const met = summary.goalBonus > 0;
  const rows: [string, React.ReactNode][] = [
    [t.dayover.served, summary.served],
    [t.dayover.lost, summary.lost],
    [t.dayover.bestCombo, `x${summary.bestCombo}`],
    [
      t.dayover.coins,
      <Currency
        key='coins'
        kind='coins'
        amount={summary.coins}
      />,
    ],
    [
      t.dayover.tips,
      <Currency
        key='tips'
        kind='tips'
        amount={summary.tips}
      />,
    ],
  ];
  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        className='max-h-[94dvh] grid-rows-[minmax(0,1fr)_auto] gap-3 border-0 bg-transparent p-0 shadow-none sm:max-w-md'
      >
        <div className='font-display flex min-h-0 flex-col gap-3 overflow-y-auto rounded-3xl border-4 border-[var(--game-frame)] bg-[var(--game-background)] p-5 shadow-[0_8px_0_var(--game-ink)]'>
          <DialogHeader className='items-center text-center'>
            <DialogTitle className='text-outline text-4xl leading-none tracking-wide text-white uppercase'>
              {t.dayover.title(summary.day)}
            </DialogTitle>
            <DialogDescription
              className={`text-outline text-lg ${met ? 'text-[var(--game-tip)]' : 'text-[var(--game-mutedText)]'}`}
            >
              {met
                ? t.dayover.goalMet(summary.goalBonus)
                : t.dayover.goalMissed(summary.goal)}
            </DialogDescription>
          </DialogHeader>
          <Stars
            count={summary.starsAfter}
            className='justify-center text-3xl'
          />
          {summary.starsAfter !== summary.starsBefore && (
            <p className='text-center text-sm text-[var(--game-highlight)]'>
              {summary.starsAfter > summary.starsBefore
                ? t.dayover.starsUp
                : t.dayover.starsDown}
            </p>
          )}
          <dl className='grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 rounded-2xl bg-black/25 px-4 py-3 text-lg'>
            {rows.map(([label, value]) => (
              <div
                key={label}
                className='contents'
              >
                <dt className='text-white/75'>{label}</dt>
                <dd className='text-right font-black text-white tabular-nums'>
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          {summary.record && (
            <p className='text-outline text-center text-lg text-[var(--game-highlight)]'>
              🏆 {t.dayover.record}
            </p>
          )}
          {summary.finished.length > 0 && (
            <div className='rounded-2xl bg-black/25 px-4 py-2 text-sm text-white/85'>
              <p className='font-black text-[var(--game-highlight)] uppercase'>
                {t.dayover.finished}
              </p>
              <ul>
                {summary.finished.map((job, index) => (
                  <li key={index}>✅ {jobLabel(job, staff)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <DialogFooter className='font-display flex-row flex-wrap items-center justify-center gap-3 pb-2 sm:justify-center'>
          <button
            type='button'
            className={`${CHUNKY} bg-[var(--game-secondary)] px-5 py-2 text-xl`}
            onClick={onManage}
          >
            {t.dayover.manage}
          </button>
          <button
            type='button'
            className={`${CHUNKY} bg-[var(--game-success)] px-5 py-2 text-xl`}
            onClick={onNext}
          >
            {t.dayover.next}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
