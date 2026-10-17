import type { CharacterView } from 'three-hex-engine/three';
import type { RigSpec } from 'three-hex-engine/three';

// Esqueleto dos personagens do kit "Sushi Restaurant" (panda e coelhos).
// Todos tem os mesmos ossos; os clipes do panda vem no arquivo dele e os dos
// coelhos num arquivo so (character-models.config.ts). Os clipes daqui tem
// que existir nesses arquivos (scripts/pack-sushi.mjs);
// tests/sushi.assets.test.ts confere.

export const SUSHI_RIG: RigSpec = {
  // o modelo tem ~3.3 de altura; no jogo, ~1.65 (o kit inteiro entra pela
  // metade: scenery.config.ts)
  scale: 0.5,
  // glTF olha para +z; o jogo usa +x como frente
  turn: Math.PI / 2,
  slots: {
    head: 'Head',
    rightHand: 'LowerArm.R',
    leftHand: 'LowerArm.L',
    rightArm: 'UpperArm.R',
    leftArm: 'UpperArm.L',
  },
  clips: {
    idle: { name: 'Idle' },
    walk: { name: 'Walk' },
    move: { name: 'Run' },
    // `crouching` neste jogo e "levando prato": o par parado/andando com as
    // maos para a frente
    crouch: { name: 'Idle_Holding' },
    sneak: { name: 'Walk_Holding' },
    // ninguem golpeia aqui
    attacks: [],
    // O que o personagem faz parado no lugar. Sao ciclos: quem desenha manda
    // a fase girando no tempo de EMOTE_SECONDS
    emotes: {
      sit: { name: 'Sitting_Idle' },
      eat: { name: 'Sitting_Eating' },
      chop: { name: 'Chop_Loop' },
      pan: { name: 'Pan_Loop' },
      assemble: { name: 'Assembly_Loop' },
      wave: { name: 'Wave' },
      yes: { name: 'Yes' },
      no: { name: 'No' },
    },
    death: { name: 'Death' },
  },
};

export type SushiEmote =
  'sit' | 'eat' | 'chop' | 'pan' | 'assemble' | 'wave' | 'yes' | 'no';

// duracao de uma volta de cada ciclo (a do clipe no arquivo)
export const EMOTE_SECONDS: Record<SushiEmote, number> = {
  sit: 3.33,
  eat: 0.67,
  chop: 0.67,
  pan: 0.67,
  assemble: 1,
  wave: 1.67,
  yes: 1.67,
  no: 1.67,
};

// nos da faca e da frigideira, que so aparecem em quem esta cozinhando
export const KNIFE_NODE = 'Knife';
export const PAN_NODE = 'Pan';

// Parado, o corpo nao fica duro: a cabeca olha para os lados e os bracos
// balancam. Cada personagem tem o seu ritmo (`seed`), e a soma de ondas de
// periodos diferentes nao se repete a olho: parece ao acaso.
// quanto a cabeca vira (rad) e quanto cada braco balanca (rad)
const FIDGET_LOOK = 0.75;
const FIDGET_ARM = 0.1;

// giro da cabeca em `time`, para `pose.look`
export function fidgetLook(time: number, seed: number): number {
  const wave =
    Math.sin(time * 0.9 + seed * 1.7) + Math.sin(time * 0.37 + seed * 4.1);
  // fica um tempo de um lado, vira rapido para o outro
  return FIDGET_LOOK * Math.tanh(wave * 1.6);
}

const ARMS = ['rightArm', 'leftArm'];

// Tira o balanco que `fidgetArms` pos no quadro anterior. Chamar antes de
// `view.pose`, sempre: o mixer so reescreve o osso quando o valor do clipe
// muda, e num clipe quase parado o giro somaria em cima do anterior.
export function clearFidget(view: CharacterView): void {
  for (const name of ARMS) {
    const arm = view.slot(name);
    const added = arm?.userData.fidget as { x: number; z: number } | undefined;
    if (!arm || !added) continue;
    arm.rotation.x -= added.x;
    arm.rotation.z -= added.z;
    arm.userData.fidget = undefined;
  }
}

// Balanca os bracos por cima do clipe. Chamar depois de `view.pose`.
export function fidgetArms(
  view: CharacterView,
  time: number,
  seed: number,
): void {
  ARMS.forEach((name, side) => {
    const arm = view.slot(name);
    if (!arm) return;
    const phase = seed * 2.3 + side * 1.9;
    const x =
      FIDGET_ARM *
      (Math.sin(time * 0.7 + phase) + 0.6 * Math.sin(time * 0.3 + phase * 2));
    const z = FIDGET_ARM * 0.5 * Math.sin(time * 0.45 + phase * 3);
    arm.rotation.x += x;
    arm.rotation.z += z;
    arm.userData.fidget = { x, z };
  });
}
