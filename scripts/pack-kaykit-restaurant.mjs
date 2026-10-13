// Junta as pecas usadas do KayKit Restaurant Bits (CC0, Kay Lousberg) num
// GLB so, public/models/kaykit/restaurant.glb. Roda quando muda a lista
// PIECES:
//
//   node scripts/pack-kaykit-restaurant.mjs <pasta KayKit_Restaurant_Bits>
//
// No pacote cada peca e um .gltf com o proprio .bin, e todas apontam para a
// mesma textura: seriam dezenas de downloads. Aqui cada peca vira um no
// `piece_<nome>` (engine/scenery/model-kit.ts), a textura entra uma vez, e o
// jogo baixa um arquivo. Copia de pack-kaykit-dungeon.mjs dos outros jogos,
// com outra lista e outro destino.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const OUT = 'public/models/kaykit/restaurant.glb';

// nome do .gltf em Assets/gltf; e o nome que o jogo usa para pedir a peca
// (BITS em engine/scenery/scenery.config.ts)
const PIECES = [
  // cozinha
  'fridge_A',
  'fridge_B',
  'extractorhood',
  'pot_large',
  'jar_A_large',
  'jar_B_medium',
  'jar_C_small',
  'papertowel',
  'dishrack_plates',
  // estoque e entrega
  'crate',
  'crate_tomatoes',
  'crate_cheese',
  'crate_lettuce',
  'crate_carrots',
  // salao
  'menu',
  'plate',
  'plate_dirty',
  'door_A',
];

const [pack] = process.argv.slice(2);
if (!pack) {
  console.error(
    'uso: node scripts/pack-kaykit-restaurant.mjs <KayKit_Restaurant_Bits>',
  );
  process.exit(1);
}
const source = join(pack, 'Assets/gltf');

const chunks = [];
let offset = 0;
// cada bloco comeca em multiplo de 4, como o formato pede
const append = (data) => {
  const padded = Buffer.concat([
    data,
    Buffer.alloc((4 - (data.length % 4)) % 4),
  ]);
  const at = offset;
  chunks.push(padded);
  offset += padded.length;
  return at;
};

const out = {
  asset: { version: '2.0', generator: 'scripts/pack-kaykit-restaurant.mjs' },
  scene: 0,
  scenes: [{ nodes: [] }],
  nodes: [],
  meshes: [],
  accessors: [],
  bufferViews: [],
  materials: [],
  textures: [{ source: 0, sampler: 0 }],
  samplers: [{}],
  images: [],
};
// material igual (todos usam a mesma textura) entra uma vez
const materials = new Map();
let texture = null;

for (const piece of PIECES) {
  const path = join(source, `${piece}.gltf`);
  const gltf = JSON.parse(readFileSync(path, 'utf8'));
  const bins = gltf.buffers.map((b) =>
    readFileSync(join(dirname(path), b.uri)),
  );
  if (gltf.images?.length !== 1)
    throw new Error(`${piece}: esperava 1 textura`);
  texture ??= gltf.images[0].uri;
  if (gltf.images[0].uri !== texture) {
    throw new Error(`${piece}: textura diferente das outras pecas`);
  }

  const viewAt = out.bufferViews.length;
  for (const view of gltf.bufferViews) {
    const start = view.byteOffset ?? 0;
    const data = bins[view.buffer].subarray(start, start + view.byteLength);
    out.bufferViews.push({ ...view, buffer: 0, byteOffset: append(data) });
  }
  const accessorAt = out.accessors.length;
  for (const accessor of gltf.accessors) {
    out.accessors.push({
      ...accessor,
      bufferView: accessor.bufferView + viewAt,
    });
  }
  const material = (index) => {
    const { name, ...look } = gltf.materials[index];
    const key = JSON.stringify(look);
    if (!materials.has(key)) {
      materials.set(key, out.materials.length);
      out.materials.push({ name: 'restaurant', ...look });
    }
    return materials.get(key);
  };
  const meshAt = out.meshes.length;
  for (const mesh of gltf.meshes) {
    out.meshes.push({
      ...mesh,
      primitives: mesh.primitives.map((primitive) => ({
        ...primitive,
        indices: primitive.indices + accessorAt,
        material: material(primitive.material),
        attributes: Object.fromEntries(
          Object.entries(primitive.attributes).map(([k, v]) => [
            k,
            v + accessorAt,
          ]),
        ),
      })),
    });
  }
  const nodeAt = out.nodes.length;
  for (const node of gltf.nodes) {
    out.nodes.push({
      ...node,
      ...(node.mesh !== undefined && { mesh: node.mesh + meshAt }),
      ...(node.children && { children: node.children.map((c) => c + nodeAt) }),
    });
  }
  // a peca: um no `piece_<arquivo>` e, dentro, o que o arquivo tinha. O
  // prefixo evita repetir o nome do no de dentro, que o carregador renomearia
  out.nodes.push({
    name: `piece_${piece}`,
    children: gltf.scenes[gltf.scene ?? 0].nodes.map((n) => n + nodeAt),
  });
  out.scenes[0].nodes.push(out.nodes.length - 1);
}

const image = readFileSync(join(source, texture));
out.bufferViews.push({
  buffer: 0,
  byteOffset: append(image),
  byteLength: image.length,
});
out.images.push({
  bufferView: out.bufferViews.length - 1,
  mimeType: 'image/png',
});
out.buffers = [{ byteLength: offset }];

const jsonRaw = Buffer.from(JSON.stringify(out));
const json = Buffer.concat([
  jsonRaw,
  Buffer.alloc((4 - (jsonRaw.length % 4)) % 4, 0x20),
]);
const bin = Buffer.concat(chunks);
const head = (length, type) => {
  const chunk = Buffer.alloc(8);
  chunk.writeUInt32LE(length, 0);
  chunk.write(type, 4);
  return chunk;
};
const header = Buffer.alloc(12);
header.write('glTF');
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + json.length + 8 + bin.length, 8);
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(
  OUT,
  Buffer.concat([
    header,
    head(json.length, 'JSON'),
    json,
    head(bin.length, 'BIN\0'),
    bin,
  ]),
);
console.log(
  `restaurant.glb ${((header.length + json.length + bin.length + 16) / 1024).toFixed(0)} KB, ${PIECES.length} pecas, ${out.materials.length} material(is)`,
);
