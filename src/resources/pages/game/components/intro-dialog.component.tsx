import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/resources/components/ui/dialog';
import { useTexts } from '@/shared/i18n';
import { CHUNKY } from '@/shared/styles/classes';

type IntroDialogProps = {
  open: boolean;
  // pausado no meio do dia; senao, e a abertura do primeiro dia
  paused: boolean;
  onAction: () => void;
  // volta para a tela inicial, largando o dia
  onMenu: () => void;
};

// "Como jogar" antes do primeiro dia, e a mesma tela na pausa.
export function IntroDialog({
  open,
  paused,
  onAction,
  onMenu,
}: IntroDialogProps) {
  const t = useTexts();
  const touch =
    typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !next && onAction()}
    >
      <DialogContent
        showCloseButton={false}
        // So a lista rola. Os botoes ficam fora do painel, flutuando embaixo:
        // sempre a vista, sem precisar rolar ate o fim para comecar.
        className='max-h-[94dvh] grid-rows-[minmax(0,1fr)_auto] gap-3 border-0 bg-transparent p-0 shadow-none sm:max-w-xl'
      >
        <div className='font-display flex min-h-0 flex-col gap-3 overflow-y-auto rounded-3xl border-4 border-[var(--game-frame)] bg-[var(--game-background)] p-5 shadow-[0_8px_0_var(--game-ink)]'>
          <DialogHeader className='items-center text-center'>
            <DialogTitle className='text-outline text-4xl leading-none tracking-wide text-white uppercase'>
              {paused ? t.game.paused : t.game.howToPlay}
            </DialogTitle>
            <DialogDescription className='text-outline text-lg text-[var(--game-brand)]'>
              {t.game.subtitle}
            </DialogDescription>
          </DialogHeader>
          <ol className='flex flex-col gap-1.5'>
            {t.game.steps.map(([icon, text]) => (
              <li
                key={icon}
                className='flex items-center gap-3 rounded-xl bg-black/25 px-3 py-1.5 text-left text-sm text-white/85 sm:text-base'
              >
                <span
                  aria-hidden
                  className='text-2xl'
                >
                  {icon}
                </span>
                {text}
              </li>
            ))}
          </ol>
          <p className='text-center text-sm text-[var(--game-mutedText)]'>
            {touch ? t.game.controls.touch : t.game.controls.keyboard}
          </p>
          {paused && (
            <p className='text-center text-sm text-[var(--game-highlight)]'>
              {t.game.quitNote}
            </p>
          )}
        </div>
        <DialogFooter className='font-display flex-row flex-wrap items-center justify-center gap-3 pb-2 sm:justify-center'>
          <button
            type='button'
            className={`${CHUNKY} bg-[var(--game-muted)] px-4 py-1.5 text-base`}
            onClick={onMenu}
          >
            {paused ? t.game.quit : t.common.menu}
          </button>
          <button
            type='button'
            className={`${CHUNKY} bg-[var(--game-success)] px-6 py-2 text-xl`}
            onClick={onAction}
          >
            {paused ? t.common.continue : t.common.start}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
