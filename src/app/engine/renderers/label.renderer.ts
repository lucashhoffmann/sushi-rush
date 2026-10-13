import { COLORS } from '@/shared/colors';
import * as THREE from 'three';

// Balao de texto que flutua na cena, sempre virado para a camera: icone do
// pedido, barra de paciencia ou de progresso, numero que sobe. Um canvas por
// balao, redesenhado so quando o conteudo muda.

export type LabelContent = {
  // texto (em geral emoji); vazio = so a barra
  text: string;
  // barra embaixo do texto, de 0 a 1; null = sem barra
  bar?: number | null;
  // 'patience': verde, amarelo, vermelho conforme esvazia; 'progress': verde
  barKind?: 'patience' | 'progress';
  // sem fundo, texto colorido com contorno (numero que sobe)
  plain?: string;
  // frase dita por um personagem: letra menor, ate duas linhas (so em
  // balao criado largo)
  speech?: boolean;
};

export type Label = {
  sprite: THREE.Sprite;
  set(content: LabelContent): void;
  dispose(): void;
};

const NARROW_WIDTH = 256;
// balao de fala: o dobro de largura, para caber uma frase
const SPEECH_WIDTH = 512;
const HEIGHT = 160;
// altura do balao na cena, em tiles
const SIZE = 0.95;
// a barra muda de desenho a cada 1/BAR_STEPS
const BAR_STEPS = 16;
const SPEECH_FONT = '800 40px system-ui, "Apple Color Emoji", sans-serif';
const SPEECH_LINE = 46;
const FONT =
  '800 76px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';

function round(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// `wide`: balao de fala
export function createLabel(wide = false): Label {
  const WIDTH = wide ? SPEECH_WIDTH : NARROW_WIDTH;
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    // por cima de parede e personagem: o balao e interface
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set((SIZE * WIDTH) / HEIGHT, SIZE, 1);
  sprite.renderOrder = 10;
  let drawn = '';

  return {
    sprite,
    set({ text, bar = null, barKind = 'patience', plain, speech }) {
      const level = bar === null ? -1 : Math.round(bar * BAR_STEPS);
      const key = `${text}|${level}|${barKind}|${plain ?? ''}`;
      if (key === drawn || !ctx) return;
      drawn = key;
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (speech) {
        // quebra em ate duas linhas
        ctx.font = SPEECH_FONT;
        const limit = WIDTH - 60;
        const lines = [''];
        for (const word of text.split(' ')) {
          const last = lines.length - 1;
          const joined = lines[last] ? `${lines[last]} ${word}` : word;
          if (ctx.measureText(joined).width <= limit || lines.length === 2) {
            lines[last] = joined;
          } else {
            lines.push(word);
          }
        }
        const width = Math.min(
          WIDTH - 8,
          Math.max(...lines.map((line) => ctx.measureText(line).width)) + 48,
        );
        const height = lines.length * SPEECH_LINE + 30;
        const top = HEIGHT - height - 6;
        round(ctx, (WIDTH - width) / 2, top, width, height, 26);
        ctx.fillStyle = COLORS.label.bubble;
        ctx.fill();
        ctx.lineWidth = 6;
        ctx.strokeStyle = COLORS.label.outline;
        ctx.stroke();
        ctx.fillStyle = COLORS.label.outline;
        lines.forEach((line, i) =>
          ctx.fillText(
            line,
            WIDTH / 2,
            top + 15 + SPEECH_LINE * (i + 0.5),
            width - 30,
          ),
        );
        texture.needsUpdate = true;
        return;
      }
      ctx.font = FONT;
      if (plain) {
        ctx.lineWidth = 14;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = COLORS.label.outline;
        ctx.strokeText(text, WIDTH / 2, HEIGHT / 2, WIDTH - 16);
        ctx.fillStyle = plain;
        ctx.fillText(text, WIDTH / 2, HEIGHT / 2, WIDTH - 16);
        texture.needsUpdate = true;
        return;
      }
      if (text) {
        const width = Math.min(
          WIDTH - 8,
          Math.max(110, ctx.measureText(text).width + 36),
        );
        round(ctx, (WIDTH - width) / 2, 4, width, 104, 30);
        ctx.fillStyle = COLORS.label.bubble;
        ctx.fill();
        ctx.lineWidth = 7;
        ctx.strokeStyle = COLORS.label.outline;
        ctx.stroke();
        ctx.fillStyle = COLORS.label.outline;
        ctx.fillText(text, WIDTH / 2, 60, width - 24);
      }
      if (bar !== null) {
        const value = level / BAR_STEPS;
        round(ctx, 38, 120, 180, 30, 15);
        ctx.fillStyle = COLORS.label.barBack;
        ctx.fill();
        ctx.lineWidth = 6;
        ctx.strokeStyle = COLORS.label.outline;
        ctx.stroke();
        if (value > 0) {
          round(ctx, 43, 125, Math.max(20, 170 * value), 20, 10);
          ctx.fillStyle =
            barKind === 'progress' || value > 0.55
              ? COLORS.label.good
              : value > 0.28
                ? COLORS.label.warn
                : COLORS.label.bad;
          ctx.fill();
        }
      }
      texture.needsUpdate = true;
    },
    dispose() {
      sprite.removeFromParent();
      texture.dispose();
      material.dispose();
    },
  };
}
