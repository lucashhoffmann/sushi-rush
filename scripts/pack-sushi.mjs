// Monta os arquivos de public/models/sushi a partir do kit "Sushi Restaurant"
// (pasta com Characters, Environment, Food e Decoration, cada uma com glTF).
// Roda uma vez, quando muda o kit:
//
//   node scripts/pack-sushi.mjs <pasta sushi-restaurant>
//
// No kit cada peca e um .gltf com o binario em base64 e a mesma textura
// (atlas de 512 px) repetida dentro: seriam mais de cem downloads. Aqui saem
//
//   <personagem>.glb  um por personagem; os clipes vao no panda e num
//                     coelho so, que serve a todos os coelhos
//   kit.glb           todas as pecas de cenario, comida e decoracao, cada
//                     uma num no `piece_<nome>` (engine/scenery/model-kit.ts),
//                     com a textura uma vez
//
// Sem dependencia: GLB e um JSON e um bloco binario.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const OUT = 'public/models/sushi';

// clipes que o jogo usa (engine/characters/sushi.rig.ts); o resto do kit
// (pulo, soco, espada...) fica de fora: sao metade do arquivo
const CLIPS = [
  'Idle',
  'Walk',
  'Run',
  'Idle_Holding',
  'Walk_Holding',
  'Sitting_Idle',
  'Sitting_Eating',
  'Chop_Loop',
  'Pan_Loop',
  'Assembly_Loop',
  'Wave',
  'Yes',
  'No',
  'Death',
];

// o coelho cujo arquivo leva os clipes de todos os coelhos
const CLIPS_FROM = 'rabbit-grey';

// pecas que entram em kit.glb: o nome do .gltf e o nome que o jogo usa para
// pedir a peca (engine/scenery/scenery.config.ts)
const PIECES = [
  'Floor_Wood',
  'Floor_Kitchen1',
  'Floor_Tiles',
  'Wall_Normal',
  'Wall_Shoji',
  'Wall_Shelves',
  'Environment_Counter_Straight',
  'Environment_Counter_Drawers',
  'Environment_Counter_Doors',
  'Environment_Counter_Sink',
  'Environment_CuttingTable',
  'Environment_ChukamanSteamer',
  'Environment_Pot_1_Filled',
  'Environment_Pan',
  'Environment_KitchenKnives',
  'Environment_Table',
  'Environment_Stool',
  'Environment_Bottles',
  'Environment_ToriiGate',
  'Truck',
  'FoodIngredient_Rice',
  'FoodIngredient_Salmon',
  'Food_Onigiri',
  'Food_SalmonNigiri',
  'Food_TamagoNigiri',
  'Food_MaguroNigiri',
  'Food_Roll',
  'Food_SalmonRoll',
  'Food_SeaUrchinRoll',
  'Food_Gyoza',
  'Food_Ramen',
  'Food_Udon',
  'Food_Chukaman',
  'Food_Dango',
  'Decoration_Carpet',
  'Decoration_SakuraTree',
  'Decoration_Bamboo',
  'Decoration_Light',
  'Decoration_Painting',
  'Decoration_Plant1',
  'Decoration_Plant2',
  'Decoration_Fish',
  'Decoration_Sign',
  'Decoration_WallLight',
];

const [pack] = process.argv.slice(2);
if (!pack) {
  console.error('uso: node scripts/pack-sushi.mjs <pasta sushi-restaurant>');
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

const read = (file) => {
  const json = JSON.parse(readFileSync(file, 'utf8'));
  const bin = Buffer.from(json.buffers[0].uri.split(',')[1], 'base64');
  return { json, bin };
};

// cada bloco comeca em multiplo de 4, como o formato pede
const pad = (data, fill = 0) =>
  Buffer.concat([data, Buffer.alloc((4 - (data.length % 4)) % 4, fill)]);

function writeGlb(file, json, bin) {
  const body = pad(bin);
  json.buffers = [{ byteLength: body.length }];
  const text = pad(Buffer.from(JSON.stringify(json)), 0x20);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + text.length + 8 + body.length, 8);
  const chunk = (type, data) => {
    const head = Buffer.alloc(8);
    head.writeUInt32LE(data.length, 0);
    head.writeUInt32LE(type, 4);
    return Buffer.concat([head, data]);
  };
  writeFileSync(
    file,
    Buffer.concat([header, chunk(0x4e4f534a, text), chunk(0x004e4942, body)]),
  );
  return 12 + 16 + text.length + body.length;
}

// Tira do arquivo o que ninguem mais cita (as curvas dos clipes cortados) e
// devolve o binario so com o que ficou.
function prune(json, bin) {
  const used = new Set();
  for (const mesh of json.meshes) {
    for (const primitive of mesh.primitives) {
      for (const index of Object.values(primitive.attributes)) used.add(index);
      used.add(primitive.indices);
    }
  }
  for (const skin of json.skins ?? []) used.add(skin.inverseBindMatrices);
  for (const clip of json.animations) {
    for (const sampler of clip.samplers)
      used.add(sampler.input).add(sampler.output);
  }
  const accessorMap = new Map(
    [...used].sort((a, b) => a - b).map((old, i) => [old, i]),
  );
  const viewsUsed = new Set([
    ...[...used].map((index) => json.accessors[index].bufferView),
    ...json.images.map((image) => image.bufferView),
  ]);
  const viewMap = new Map();
  const parts = [];
  let at = 0;
  const views = [];
  json.bufferViews.forEach((view, index) => {
    if (!viewsUsed.has(index)) return;
    const from = view.byteOffset ?? 0;
    const data = pad(bin.subarray(from, from + view.byteLength));
    viewMap.set(index, views.length);
    views.push({ ...view, buffer: 0, byteOffset: at });
    parts.push(data);
    at += data.length;
  });
  json.accessors = [...accessorMap.keys()].map((old) => ({
    ...json.accessors[old],
    bufferView: viewMap.get(json.accessors[old].bufferView),
  }));
  json.bufferViews = views;
  for (const image of json.images)
    image.bufferView = viewMap.get(image.bufferView);
  for (const mesh of json.meshes) {
    for (const primitive of mesh.primitives) {
      for (const key of Object.keys(primitive.attributes)) {
        primitive.attributes[key] = accessorMap.get(primitive.attributes[key]);
      }
      primitive.indices = accessorMap.get(primitive.indices);
    }
  }
  for (const skin of json.skins ?? []) {
    skin.inverseBindMatrices = accessorMap.get(skin.inverseBindMatrices);
  }
  for (const clip of json.animations) {
    for (const sampler of clip.samplers) {
      sampler.input = accessorMap.get(sampler.input);
      sampler.output = accessorMap.get(sampler.output);
    }
  }
  return Buffer.concat(parts);
}

// --- personagens: o arquivo "With Knife and Pan" tem tudo que o "Normal"
// tem mais a faca e a frigideira (nos `Knife` e `Pan`), que o jogo esconde
// em quem nao e cozinheiro. Um arquivo por personagem serve aos dois.
const characters = join(pack, 'Characters/With Knife and Pan/glTF');
for (const file of readdirSync(characters).filter((f) => f.endsWith('.gltf'))) {
  const { json, bin } = read(join(characters, file));
  // Rabbit_Blond -> rabbit-blond
  const name = basename(file, '.gltf').toLowerCase().replace('_', '-');
  // Os coelhos tem todos o mesmo esqueleto: os clipes saem so no cinza
  // (CLIPS_FROM) e os outros usam os dele. No kit, o verde e o rosa desta
  // pasta nem trazem os clipes.
  json.animations =
    name.startsWith('rabbit') && name !== CLIPS_FROM
      ? []
      : json.animations.filter((clip) => CLIPS.includes(clip.name));
  if (name === CLIPS_FROM || name === 'panda') {
    const lacking = CLIPS.filter(
      (clip) => !json.animations.some((a) => a.name === clip),
    );
    if (lacking.length > 0) {
      console.error(`${name}: faltam os clipes ${lacking.join(', ')}`);
      process.exit(1);
    }
  }
  const size = writeGlb(join(OUT, `${name}.glb`), json, prune(json, bin));
  console.log(`${name}.glb ${(size / 1024).toFixed(0)} KB`);
}

// --- cenario, comida e decoracao num arquivo so
const out = {
  asset: { version: '2.0', generator: 'scripts/pack-sushi.mjs' },
  scene: 0,
  scenes: [{ nodes: [] }],
  nodes: [],
  meshes: [],
  accessors: [],
  bufferViews: [],
  materials: [],
  textures: [{ sampler: 0, source: 0 }],
  samplers: [{ magFilter: 9728, minFilter: 9728 }],
  images: [],
};
const chunks = [];
let offset = 0;
const append = (data) => {
  const padded = pad(data);
  const at = offset;
  chunks.push(padded);
  offset += padded.length;
  return at;
};
// material igual entra uma vez; o do atlas aponta para a textura unica
const materialIndex = new Map();
let atlas = null;
const sizes = [];

for (const folder of ['Environment', 'Food', 'Decoration']) {
  const dir = join(pack, folder, 'glTF');
  const files = readdirSync(dir)
    .filter((f) => PIECES.includes(basename(f, '.gltf')))
    .sort();
  for (const file of files) {
    const { json, bin } = read(join(dir, file));
    const slice = (index) => {
      const view = json.bufferViews[index];
      const from = view.byteOffset ?? 0;
      return bin.subarray(from, from + view.byteLength);
    };
    const imageViews = new Set((json.images ?? []).map((i) => i.bufferView));
    atlas ??= slice(json.images[0].bufferView);

    const views = json.bufferViews.map((view, index) => {
      if (imageViews.has(index)) return -1;
      const { byteOffset: _, buffer: __, ...rest } = view;
      out.bufferViews.push({
        ...rest,
        buffer: 0,
        byteOffset: append(slice(index)),
      });
      return out.bufferViews.length - 1;
    });
    const accessors = json.accessors.map((accessor) => {
      out.accessors.push({
        ...accessor,
        bufferView: views[accessor.bufferView],
      });
      return out.accessors.length - 1;
    });
    const materials = (json.materials ?? []).map((material) => {
      const key = JSON.stringify(material);
      if (!materialIndex.has(key)) {
        materialIndex.set(key, out.materials.length);
        out.materials.push(material);
      }
      return materialIndex.get(key);
    });
    const meshes = json.meshes.map((mesh) => {
      out.meshes.push({
        ...mesh,
        primitives: mesh.primitives.map((primitive) => ({
          ...primitive,
          attributes: Object.fromEntries(
            Object.entries(primitive.attributes).map(([k, v]) => [
              k,
              accessors[v],
            ]),
          ),
          indices: accessors[primitive.indices],
          material: materials[primitive.material],
        })),
      });
      return out.meshes.length - 1;
    });
    const base = out.nodes.length;
    for (const node of json.nodes) {
      out.nodes.push({
        ...node,
        ...(node.mesh !== undefined && { mesh: meshes[node.mesh] }),
        ...(node.children && { children: node.children.map((c) => c + base) }),
      });
    }
    // a peca e um no sem transformacao com as raizes do arquivo dentro
    const piece = basename(file, '.gltf');
    out.nodes.push({
      name: `piece_${piece}`,
      children: json.scenes[json.scene ?? 0].nodes.map((n) => n + base),
    });
    out.scenes[0].nodes.push(out.nodes.length - 1);

    // tamanho da peca (sem contar transformacao de no), para a tabela abaixo
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (const mesh of json.meshes) {
      for (const primitive of mesh.primitives) {
        const position = json.accessors[primitive.attributes.POSITION];
        for (let i = 0; i < 3; i++) {
          min[i] = Math.min(min[i], position.min[i]);
          max[i] = Math.max(max[i], position.max[i]);
        }
      }
    }
    const moved = json.nodes.some(
      (n) => n.translation || n.rotation || n.scale,
    );
    sizes.push(
      `${piece.padEnd(34)} x ${min[0].toFixed(2)}..${max[0].toFixed(2)}  y ${min[1].toFixed(2)}..${max[1].toFixed(2)}  z ${min[2].toFixed(2)}..${max[2].toFixed(2)}${moved ? '  (no com transformacao)' : ''}`,
    );
  }
}
out.bufferViews.push({
  buffer: 0,
  byteOffset: append(atlas),
  byteLength: atlas.length,
});
out.images.push({
  mimeType: 'image/png',
  bufferView: out.bufferViews.length - 1,
});

const missing = PIECES.filter(
  (piece) => !out.nodes.some((node) => node.name === `piece_${piece}`),
);
if (missing.length > 0) {
  console.error(`pecas que nao estao no kit: ${missing.join(', ')}`);
  process.exit(1);
}
const size = writeGlb(join(OUT, 'kit.glb'), out, Buffer.concat(chunks));
console.log(
  `kit.glb ${(size / 1024).toFixed(0)} KB, ${out.scenes[0].nodes.length} pecas`,
);
// medidas no tamanho do kit (o jogo usa metade: scenery.config.ts)
writeFileSync(join(OUT, 'kit.sizes.txt'), sizes.join('\n') + '\n');
