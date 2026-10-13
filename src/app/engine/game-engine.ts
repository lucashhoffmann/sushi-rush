import { COLORS } from '@/shared/colors';
import * as THREE from 'three';

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
const MAX_FRAME_TIME = 0.1;
// teto de pixels por ponto da tela, por qualidade dos graficos
const PIXEL_RATIO = { high: 2, medium: 1.5, low: 1 };
// quadro a menos disto de um numero inteiro de passos conta como inteiro
const FRAME_SNAP = 0.15;
const CAMERA_FOLLOW_RATE = 8;
const CAMERA_SNAP_DISTANCE = 6;

export type GameEngine = { dispose: () => void };

function axis(keys: Set<string>, positive: string[], negative: string[]) {
  const has = (codes: string[]) => codes.some((code) => keys.has(code));
  return (has(positive) ? 1 : 0) - (has(negative) ? 1 : 0);
}

export function createGameEngine(canvas: HTMLCanvasElement): GameEngine {
  // Graficos das configuracoes, lidos uma vez: quantos pixels desenhar, o
  // que mais pesa em celular
  const { graphics } = useGameStore.getState();
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: graphics.quality !== 'low',
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, PIXEL_RATIO[graphics.quality]),
  );

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.scene.ground);
  scene.add(
    new THREE.HemisphereLight(COLORS.scene.sky, COLORS.scene.shade, 2.1),
  );
  const sun = new THREE.DirectionalLight(COLORS.scene.sun, 1.5);
  sun.position.set(3, 10, 6);
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100);
  const view = createWorldRenderer(scene);

  const keys = new Set<string>();
  const input: InputState = { moveX: 0, moveY: 0 };
  const onKeyDown = (event: KeyboardEvent) => {
    keys.add(event.code);
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
  const onKeyUp = (event: KeyboardEvent) => keys.delete(event.code);
  const onBlur = () => keys.clear();

  const resize = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  window.addEventListener('resize', resize);
  resize();

  let last = performance.now();
  let accumulator = 0;
  let frameId = 0;
  const focus = { x: 0, y: 0 };

  const frame = (now: number) => {
    frameId = requestAnimationFrame(frame);
    let frameTime = Math.min(MAX_FRAME_TIME, (now - last) / 1000);
    // Tela a 60 Hz entrega quadros de quase um passo, nunca exato: a sobra
    // acumulava ate um quadro rodar dois passos e outro nenhum, e a imagem
    // dava um tranco. Quadro que e quase N passos vale N passos
    const steps = Math.round(frameTime / FIXED_DT);
    if (steps >= 1 && Math.abs(frameTime / FIXED_DT - steps) < FRAME_SNAP) {
      frameTime = steps * FIXED_DT;
    }
    accumulator += frameTime;
    last = now;

    input.moveX =
      axis(keys, ['KeyD', 'ArrowRight'], ['KeyA', 'ArrowLeft']) +
      joystickInput.moveX;
    input.moveY =
      axis(keys, ['KeyW', 'ArrowUp'], ['KeyS', 'ArrowDown']) +
      joystickInput.moveY;

    // passo fixo: a simulacao nao depende do fps
    const tick = useGameStore.getState().tick;
    while (accumulator >= FIXED_DT) {
      tick(input, FIXED_DT);
      accumulator -= FIXED_DT;
    }

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
    renderer.render(scene, camera);
  };
  frameId = requestAnimationFrame(frame);

  return {
    dispose() {
      cancelAnimationFrame(frameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('resize', resize);
      view.dispose();
      renderer.dispose();
    },
  };
}
