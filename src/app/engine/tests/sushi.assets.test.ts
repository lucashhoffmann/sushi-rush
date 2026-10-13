/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs';

import { SKIN_MODELS } from '@/app/engine/characters/character-models.config';
import { clipNames } from '@/app/engine/characters/clip-driver.util';
import {
  KNIFE_NODE,
  PAN_NODE,
  SUSHI_RIG,
} from '@/app/engine/characters/sushi.rig';
import { KIT_URL, sceneryPieces } from '@/app/engine/scenery/scenery.config';

// Os arquivos publicados (scripts/pack-sushi.mjs) tem o que a configuracao
// pede: sem isto, peca ou clipe que falta so apareceria no navegador.

type Gltf = {
  nodes: { name?: string }[];
  animations?: { name: string }[];
};

// GLB: cabecalho de 12 bytes, depois o bloco JSON (tamanho, tipo, conteudo)
function readGlb(url: string): Gltf {
  const file = readFileSync(`public${url}`);
  const length = file.readUInt32LE(12);
  return JSON.parse(file.subarray(20, 20 + length).toString('utf8')) as Gltf;
}

describe('arquivos do kit sushi', () => {
  it('toda peca de cenario, prato e decoracao esta no kit', () => {
    const names = new Set(readGlb(KIT_URL).nodes.map((node) => node.name));
    const missing = sceneryPieces().filter(
      (piece) => !names.has(`piece_${piece}`),
    );
    expect(missing).toEqual([]);
  });

  it('toda skin tem modelo, com a faca e a frigideira do cozinheiro', () => {
    for (const model of Object.values(SKIN_MODELS)) {
      expect(existsSync(`public${model.url}`)).toBe(true);
      const names = readGlb(model.url).nodes.map((node) => node.name);
      expect(names).toEqual(expect.arrayContaining([KNIFE_NODE, PAN_NODE]));
      for (const bone of Object.values(model.rig.slots)) {
        expect(names).toContain(bone);
      }
    }
  });

  it('os arquivos de clipes tem todos os clipes do esqueleto', () => {
    const wanted = clipNames(SUSHI_RIG.clips);
    const sources = new Set(
      Object.values(SKIN_MODELS).map((model) => model.clipsUrl),
    );
    expect(sources.size).toBe(2);
    for (const url of sources) {
      const clips = (readGlb(url).animations ?? []).map((clip) => clip.name);
      expect(clips).toEqual(expect.arrayContaining(wanted));
    }
  });
});
