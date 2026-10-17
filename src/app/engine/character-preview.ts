import { COLORS } from '@/shared/colors';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { loadCharacterView } from 'three-hex-engine/three';
import { SKIN_MODELS } from '@/app/engine/characters/character-models.config';
import type { CharacterPose, CharacterView } from 'three-hex-engine/three';
import {
  clearFidget,
  EMOTE_SECONDS,
  fidgetArms,
  fidgetLook,
  KNIFE_NODE,
  PAN_NODE,
} from '@/app/engine/characters/sushi.rig';
import type { SkinId } from '@/app/modules/world/types/world.types';

// Preview de uma skin na loja: o mesmo modelo do jogo, parado e respirando.
// Arrastar gira, roda do mouse aproxima.

export type CharacterPreview = {
  setSkin: (skin: SkinId) => void;
  dispose: () => void;
};

const REST: CharacterPose = {
  moving: 0,
  crouching: false,
  attack: null,
  dash: null,
  shot: null,
  swing: 0,
  spinning: false,
  dead: false,
};

export function createCharacterPreview(
  canvas: HTMLCanvasElement,
): CharacterPreview {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // mesma luz do jogo, para a cor do preview ser a cor do salao
  const scene = new THREE.Scene();
  scene.add(
    new THREE.HemisphereLight(COLORS.scene.sky, COLORS.scene.shade, 2.1),
  );
  const sun = new THREE.DirectionalLight(COLORS.scene.sun, 1.5);
  sun.position.set(3, 10, 6);
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(1.2, 48),
    new THREE.MeshLambertMaterial({ color: COLORS.ui.border }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // personagem olha para +x: a camera comeca de frente, um pouco de lado
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.set(3.6, 2, 1.8);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.85, 0);
  controls.enablePan = false;
  controls.minDistance = 2.4;
  controls.maxDistance = 7;
  controls.maxPolarAngle = Math.PI / 2;
  controls.update();

  const resize = () => {
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    camera.aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  let skin: SkinId | null = null;
  let body: CharacterView | null = null;
  let disposed = false;
  // trocou de skin: o personagem acena uma vez
  let wave = 0;

  let last = performance.now();
  let frame = requestAnimationFrame(function loop(now) {
    frame = requestAnimationFrame(loop);
    const dt = (now - last) / 1000;
    last = now;
    wave = Math.max(0, wave - dt);
    if (body) clearFidget(body);
    body?.pose(
      {
        ...REST,
        look: wave > 0 ? 0 : fidgetLook(now / 1000, 0),
        emote:
          wave > 0
            ? { name: 'wave', phase: 1 - wave / EMOTE_SECONDS.wave }
            : null,
      },
      dt,
    );
    if (body && wave <= 0) fidgetArms(body, now / 1000, 0);
    renderer.render(scene, camera);
  });

  return {
    setSkin(next) {
      if (next === skin) return;
      skin = next;
      void loadCharacterView(SKIN_MODELS[next]).then(
        (view) => {
          // trocou de novo, ou saiu da tela, antes deste chegar
          if (disposed || skin !== next) return view.dispose();
          // nao na primeira vez: so quando ele troca de visual
          if (body) wave = EMOTE_SECONDS.wave;
          body?.dispose();
          body = view;
          for (const tool of [KNIFE_NODE, PAN_NODE]) {
            const node = view.object.getObjectByName(tool);
            if (node) node.visible = false;
          }
          scene.add(view.object);
        },
        () => {},
      );
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      body?.dispose();
      ground.geometry.dispose();
      ground.material.dispose();
      renderer.dispose();
    },
  };
}
