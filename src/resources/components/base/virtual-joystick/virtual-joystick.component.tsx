import { cn } from '@/shared/lib/utils';
import { useTexts } from '@/shared/i18n';
import { useVirtualJoystick } from '@/resources/components/base/virtual-joystick/use-virtual-joystick.component';

type VirtualJoystickProps = {
  onMove: (moveX: number, moveY: number) => void;
};

// Controle para telas de toque. A faixa de baixo da tela inteira e a area de
// toque: o disco nasce onde o dedo encosta e some de la ao soltar, voltando
// para o repouso, no canto esquerdo embaixo. Meio transparente, para nao
// tampar o jogo. Ate o primeiro toque o botao passeia em forma de infinito,
// mostrando que e para arrastar.
// Copia do joystick dos outros jogos sem os botoes de salto, agachar e
// ataque: aqui se atende por proximidade.
export function VirtualJoystick({ onMove }: VirtualJoystickProps) {
  const t = useTexts();
  const { knob, hint, at, handlers } = useVirtualJoystick(onMove);

  return (
    <div
      aria-label={t.common.joystick}
      className='virtual-joystick pointer-events-auto absolute inset-x-0 bottom-0 z-10 hidden h-[45%] touch-none select-none'
      {...handlers}
    >
      <div
        data-active={at !== null}
        className='pointer-events-none absolute size-24 rounded-full border-4 border-white/35 bg-white/5'
        style={
          at
            ? { left: at.x, top: at.y, transform: 'translate(-50%, -50%)' }
            : {
                left: 'max(1.25rem, env(safe-area-inset-left))',
                bottom: 'max(1.25rem, env(safe-area-inset-bottom))',
              }
        }
      >
        <div
          data-hint={hint}
          className={cn(
            'absolute top-1/2 left-1/2 size-10 rounded-full bg-white/80',
            hint && 'joystick-hint',
          )}
          // na dica quem move e a animacao (index.css)
          style={
            hint
              ? undefined
              : {
                  transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`,
                }
          }
        />
      </div>
    </div>
  );
}
