import { setJoystickInput } from '@/app/store/game-store/game.store';
import { VirtualJoystick } from '@/resources/components/base/virtual-joystick/virtual-joystick.component';
import { DayOverDialog } from '@/resources/pages/game/components/day-over-dialog.component';
import { Hud } from '@/resources/pages/game/components/hud.component';
import { IntroDialog } from '@/resources/pages/game/components/intro-dialog.component';
import { useGamePage } from '@/resources/pages/game/use-game.page';

export function GamePage() {
  const {
    canvasRef,
    loading,
    loadingLabel,
    screen,
    hud,
    summary,
    tips,
    staff,
    begin,
    pause,
    backToMenu,
    openManage,
    startDay,
    boost,
    visitManager,
  } = useGamePage();

  return (
    <div className='relative h-full w-full'>
      <canvas
        ref={canvasRef}
        className='block h-full w-full'
      />
      <Hud
        hud={hud}
        tips={tips}
        onBoost={boost}
        onManager={visitManager}
        onPause={screen === 'playing' ? pause : undefined}
      />
      {screen === 'playing' && <VirtualJoystick onMove={setJoystickInput} />}
      <IntroDialog
        open={screen === 'intro' || screen === 'paused'}
        paused={screen === 'paused'}
        onAction={screen === 'paused' ? pause : begin}
        onMenu={backToMenu}
      />
      {screen === 'dayover' && (
        <DayOverDialog
          summary={summary}
          staff={staff}
          onNext={startDay}
          onManage={openManage}
        />
      )}
      {loading && (
        <div
          role='status'
          className='font-display absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[var(--game-homeDeep)] text-[var(--game-foreground)]'
        >
          <div className='size-10 animate-spin rounded-full border-4 border-[var(--game-frame)] border-t-transparent' />
          <p className='text-lg tracking-wide uppercase'>{loadingLabel}</p>
        </div>
      )}
    </div>
  );
}
