import { createEngine } from 'three-hex-engine/core';
import { rafClock } from 'three-hex-engine/clock';
import {
  MOVE,
  combineInputs,
  createGamepadInput,
  createKeyboardInput,
} from 'three-hex-engine/input';
import { createThreeRenderer } from 'three-hex-engine/three';
import * as THREE from 'three';

import { COLORS } from '@/shared/colors';

import { createWorldRenderer } from '@/app/engine/renderers/world.renderer';
import {
  BOOST_IDS,
  FIXED_DT,
} from '@/app/modules/world/constants/world.constants';
import type { InputState } from '@/app/modules/world/types/world.types';
import {
  getWorld,
  joystickInput,
  useGameStore,
} from '@/app/store/game-store/game.store';

// Contrato em docs/contracts.md (secao Engine).

const CAMERA_HEIGHT = 9.5;
const CAMERA_BACK = 9;
const CAMERA_FOV = 45;
// quanto a camera se afasta com a tela em pe (celular)
const PORTRAIT_REACH = 1.45;
const CAMERA_FOLLOW_RATE = 8;
const CAMERA_SNAP_DISTANCE = 6;

export type GameEngine = { dispose: () => void };

export function createGameEngine(canvas: HTMLCanvasElement): GameEngine {
  // Graficos das configuracoes, lidos uma vez: quantos pixels desenhar, o
  // que mais pesa em celular
  const { graphics } = useGameStore.getState();
  const gfx = createThreeRenderer(canvas, {
    quality: graphics.quality,
    fov: CAMERA_FOV,
  });
  const { scene, camera } = gfx;
  const controls = combineInputs(createKeyboardInput(), createGamepadInput());

  scene.background = new THREE.Color(COLORS.scene.ground);
  scene.add(
    new THREE.HemisphereLight(COLORS.scene.sky, COLORS.scene.shade, 2.1),
  );
  const sun = new THREE.DirectionalLight(COLORS.scene.sun, 1.5);
  sun.position.set(3, 10, 6);
  scene.add(sun);

  const view = createWorldRenderer(scene);

  const input: InputState = { moveX: 0, moveY: 0 };
  // atalhos de uma vez e preventDefault; direcao segurada vem de `controls`
  const onKeyDown = (event: KeyboardEvent) => {
    // as setas movem e o espaco corre: evita a rolagem do navegador
    if (
      (event.code.startsWith('Arrow') || event.code === 'Space') &&
      getWorld()?.status === 'playing'
    ) {
      event.preventDefault();
    }
    if (event.repeat) return;
    const store = useGameStore.getState();
    if (event.code === 'KeyP' || event.code === 'Escape') store.togglePause();
    if (event.code === 'Enter') store.begin();
    // F ou E: falar com a gerente, na mesa dela
    if (event.code === 'KeyF' || event.code === 'KeyE') store.visitManager();
    // espaco ou shift: correr
    if (event.code === 'Space' || event.code.startsWith('Shift')) {
      store.sprint();
    }
    // 1 a 4: boosts, na ordem do HUD
    const boost = BOOST_IDS[Number(event.code.replace('Digit', '')) - 1];
    if (event.code.startsWith('Digit') && boost) store.boost(boost);
  };

  window.addEventListener('keydown', onKeyDown);

  const focus = { x: 0, y: 0 };

  // laco de passo fixo da engine: a simulacao nao depende do fps
  const engine = createEngine({
    fixedDt: FIXED_DT,
    clock: rafClock,
    ports: { renderer: gfx, input: controls },
    update() {
      input.moveX = controls.axis(MOVE.right, MOVE.left) + joystickInput.moveX;
      input.moveY = controls.axis(MOVE.up, MOVE.down) + joystickInput.moveY;
    },
    step(dt) {
      useGameStore.getState().tick(input, dt);
    },
    render: ({ frameTime }) => draw(frameTime),
  });

  const draw = (frameTime: number) => {
    const world = getWorld();
    if (!world) return;
    // pausado, o mundo para: as animacoes tambem
    view.sync(world, world.clock, world.status === 'paused' ? 0 : frameTime);

    // camera segue o player, suavizada
    const { x, y } = world.player.pos;
    const far = Math.hypot(x - focus.x, y - focus.y) > CAMERA_SNAP_DISTANCE;
    const follow = far ? 1 : Math.min(1, frameTime * CAMERA_FOLLOW_RATE);
    focus.x += (x - focus.x) * follow;
    focus.y += (y - focus.y) * follow;
    // tela em pe ve pouco para os lados: a camera recua
    const reach = camera.aspect < 1 ? PORTRAIT_REACH : 1;
    camera.position.set(
      focus.x,
      CAMERA_HEIGHT * reach,
      -focus.y + CAMERA_BACK * reach,
    );
    camera.lookAt(focus.x, 0, -focus.y - 1);
    gfx.render();
  };
  engine.start();

  return {
    dispose() {
      engine.stop();
      window.removeEventListener('keydown', onKeyDown);
      view.dispose();
      // controles e renderer
      engine.dispose();
    },
  };
}
