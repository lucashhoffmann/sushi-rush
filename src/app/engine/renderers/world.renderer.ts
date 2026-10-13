import { COLORS } from '@/shared/colors';
import * as THREE from 'three';

import { loadCharacterView } from '@/app/engine/characters/character-model.loader';
import { SKIN_MODELS } from '@/app/engine/characters/character-models.config';
import type {
  CharacterPose,
  CharacterView,
} from '@/app/engine/characters/character-view.types';
import {
  clearFidget,
  EMOTE_SECONDS,
  fidgetArms,
  fidgetLook,
  KNIFE_NODE,
  PAN_NODE,
  type SushiEmote,
} from '@/app/engine/characters/sushi.rig';
import {
  createLabel,
  type Label,
  type LabelContent,
} from '@/app/engine/renderers/label.renderer';
import { loadModelKit, type ModelKit } from '@/app/engine/scenery/model-kit';
import {
  DECOR_PIECES,
  DISH_PIECES,
  DISH_SCALE,
  KIT_SCALE,
  KIT_URL,
  SCENERY,
} from '@/app/engine/scenery/scenery.config';
import {
  isSeated,
  memberSpots,
} from '@/app/modules/customer/systems/customer.system';
import {
  isSolid,
  OFFICE_DOOR,
  OFFICE_ROWS,
  seatSpots,
} from '@/app/modules/level/utils/layout.util';
import { MANAGER_SKIN } from '@/app/modules/management/constants/management.constants';
import { DISHES } from '@/app/modules/menu/constants/menu.constants';
import { FLOATER_TIME } from '@/app/modules/world/constants/world.constants';
import type {
  Action,
  Customer,
  DecorId,
  DishId,
  Layout,
  SkinId,
  Vec2,
  World,
} from '@/app/modules/world/types/world.types';
import { getTexts } from '@/shared/i18n';
import { angleDiff, distance } from '@/shared/utils/math.util';

// Desenha o `World`: cenario do kit, personagens, pratos e baloes. So le o
// mundo; nada aqui muda a simulacao. Coordenadas: a simulacao e (x, y) com y
// para o fundo; a cena e (x, altura, -y).

export type WorldRenderer = {
  sync(world: World, time: number, dt: number): void;
  dispose(): void;
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
// o que o corpo faz em cada trabalho
const ACTION_EMOTES: Record<Exclude<Action, 'none'>, SushiEmote> = {
  board: 'chop',
  stove: 'pan',
  steamer: 'assemble',
  register: 'assemble',
};
// quem anda sem pressa (cliente, contratado) usa o clipe de andar
const WALK = 0.5;
// quao rapido o corpo vira para onde vai (1/s)
const TURN_RATE = 12;
// alturas dos baloes (tiles)
const HEAD_LABEL = 2.35;
const COUNTER_LABEL = 2.05;
// quanto o numero que sobe sobe
const FLOATER_RISE = 1.3;
// prato na bandeja: a frente do corpo, um em cima do outro
const CARRY_FORWARD = 0.42;
const CARRY_HEIGHT = 0.92;
const CARRY_STACK = 0.16;
// prato na mesa: do centro para o lado de quem come
const PLATE_OFFSET = 0.3;
const KIND_BADGES: Partial<Record<Customer['kind'], string>> = {
  rushed: '⚡',
  vip: '👑',
  critic: '📝',
};
// Falas: quanto tempo o balao fica, a que altura, quanto a resposta demora,
// de quanto em quanto tempo um grupo ou a fila puxa conversa, e ate que
// distancia quem atende responde
const SPEECH_TIME = 2.6;
const SPEECH_HEIGHT = 3.05;
const REPLY_DELAY = 0.9;
const CHAT_EVERY = [5, 11];
const REPLY_REACH = 3.5;

// tamanho do caminhao da entrega (o do kit taparia a calcada)
const TRUCK_SCALE = 0.7;

// Onde vai cada decoracao comprada. `h`: altura; `rot`: giro em torno de y
// (0 = de frente para a rua). So pontos onde ninguem anda: parede, cerca e
// calcada.
const WALL = 0.24;
const DECOR_SPOTS: Record<
  DecorId,
  (layout: Layout) => { x: number; y: number; h?: number; rot?: number }[]
> = {
  plant: ({ salonW, kitchenY }) => [
    { x: 0.35, y: kitchenY - 0.4 },
    { x: salonW - 0.35, y: kitchenY + 0.6 },
  ],
  lantern: ({ doorX }) => [
    { x: doorX - 0.5, y: 1.5 },
    { x: doorX + 2.5, y: 1.5 },
  ],
  bamboo: ({ salonW }) => [
    { x: 0.5, y: 1.5 },
    { x: salonW - 0.5, y: 1.5 },
  ],
  painting: () => [{ x: WALL, y: 8.5, h: 1.5, rot: Math.PI / 2 }],
  wallLight: () => [
    { x: WALL, y: 5.5, h: 2.1, rot: Math.PI / 2 },
    { x: WALL, y: 11.5, h: 2.1, rot: Math.PI / 2 },
  ],
  fish: ({ salonW }) => [
    { x: salonW - WALL, y: 11.5, h: 1.6, rot: -Math.PI / 2 },
  ],
  sign: ({ salonW, h }) => [{ x: salonW / 2, y: h - WALL, h: 2.1 }],
  sakura: () => [{ x: -1.4, y: 0.4 }],
};

type Actor = {
  group: THREE.Group;
  view: CharacterView | null;
  knife: THREE.Object3D | null;
  pan: THREE.Object3D | null;
  // direcao desenhada, que persegue a da simulacao
  facing: number | null;
  seen: boolean;
};

export function createWorldRenderer(scene: THREE.Scene): WorldRenderer {
  const root = new THREE.Group();
  scene.add(root);
  let disposed = false;
  // relogio do desenho: anda mesmo antes de o dia comecar
  let lifetime = 0;

  // chao em volta do restaurante, ate onde a camera alcanca
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshLambertMaterial({ color: COLORS.scene.ground }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.03;
  root.add(ground);

  let kit: ModelKit | null = null;
  void loadModelKit(KIT_URL).then(
    (loaded) => {
      if (!disposed) kit = loaded;
    },
    () => {},
  );

  // ---------------------------------------------------------------- cenario
  let scenery = new THREE.Group();
  let builtFor: World | null = null;
  let truck: THREE.Object3D | null = null;
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const crateMaterial = new THREE.MeshLambertMaterial({
    color: COLORS.scene.crate,
  });
  const registerMaterial = new THREE.MeshLambertMaterial({
    color: COLORS.scene.registerBody,
  });
  const screenMaterial = new THREE.MeshBasicMaterial({
    color: COLORS.scene.registerScreen,
  });
  const crate = new THREE.Mesh(boxGeometry, crateMaterial);
  crate.scale.set(0.6, 0.5, 0.6);

  function build(world: World, pieces: ModelKit): void {
    scenery.removeFromParent();
    scenery = new THREE.Group();
    root.add(scenery);
    const { layout } = world;
    // `w` e a largura do salao; a sala da gerencia vem depois
    const { salonW: w, h } = layout;
    const put = (
      name: string,
      x: number,
      y: number,
      options: { h?: number; rot?: number; sx?: number; scale?: number } = {},
    ) => {
      const object = pieces.clone(name);
      if (!object) return null;
      const size = KIT_SCALE * (options.scale ?? 1);
      object.scale.set(size * (options.sx ?? 1), size, size);
      object.position.set(x, options.h ?? 0, -y);
      object.rotation.y = options.rot ?? 0;
      scenery.add(object);
      return object;
    };

    // pisos de 2 x 2: calcada (com sobra para os lados e para a frente),
    // salao e cozinha
    const floor = (kind: keyof typeof SCENERY.floor, x: number, y: number) => {
      const { piece, top } = SCENERY.floor[kind];
      put(piece, x, y, { h: -top * KIT_SCALE });
    };
    for (let bx = -2; bx < layout.w / 2 + 2; bx++) {
      for (let by = -3; by < 1; by++) floor('street', 2 * bx + 1, 2 * by + 1);
    }
    for (let bx = 0; bx < w / 2; bx++) {
      for (let by = 1; by < h / 2; by++) {
        floor(
          2 * by >= layout.kitchenY + 1 ? 'kitchen' : 'salon',
          2 * bx + 1,
          2 * by + 1,
        );
      }
    }

    // paredes: fundo e os dois lados. A da frente nao existe, para a camera
    // ver o salao
    for (let bx = 0; bx < w / 2; bx++) {
      put(SCENERY.kitchenWall, 2 * bx + 1, h - 1);
    }
    for (let by = 1; by < h / 2; by++) {
      const wall =
        2 * by >= layout.kitchenY + 1
          ? SCENERY.walls[0]
          : SCENERY.walls[by % SCENERY.walls.length];
      put(wall, 1, 2 * by + 1, { rot: Math.PI / 2 });
      // a parede da direita tem a porta da gerencia
      if (2 * by !== OFFICE_DOOR[0]) {
        put(wall, w - 0.535, 2 * by + 1, { rot: -Math.PI / 2 });
      }
    }

    // sala da gerencia: piso, parede do fundo e da direita, mesa
    for (let y = OFFICE_ROWS[0] + 1; y <= OFFICE_ROWS[1]; y += 2) {
      for (let x = w + 1; x < layout.w; x += 2) floor('salon', x, y);
      put(SCENERY.walls[1], layout.w - 1, y, { rot: -Math.PI / 2 });
    }
    for (let x = w + 1; x < layout.w; x += 2) {
      put(SCENERY.walls[1], x, OFFICE_ROWS[1]);
    }
    put(SCENERY.table, layout.desk.x, layout.desk.y);

    // bancada do fundo, com o que cada estacao tem em cima
    for (let bx = 0; bx < w / 2; bx++) {
      put(SCENERY.counters[bx % SCENERY.counters.length], 2 * bx + 1, h - 0.5);
    }
    for (const station of world.stations) {
      for (const part of SCENERY.stations[station.kind]) {
        const object = put(part.piece, station.pos.x + part.x, station.pos.y, {
          h: SCENERY.counterTop,
        });
        if (object) object.position.z += part.z;
      }
    }

    // passa-pratos: balcoes de 2 tiles e meio balcao no tile que sobra
    const passY = layout.kitchenY + 0.5;
    const first = Math.floor(layout.pass[0].x);
    const tiles = layout.pass.length;
    for (let i = 0; i + 1 < tiles; i += 2) {
      put(SCENERY.pass, first + i + 1, passY);
    }
    if (tiles % 2 === 1) {
      put(SCENERY.pass, first + tiles - 0.5, passY, { sx: 0.5 });
    }

    for (const table of world.tables) {
      put(SCENERY.table, table.pos.x, table.pos.y);
      for (const seat of seatSpots(table)) {
        put(SCENERY.stool, seat.pos.x, seat.pos.y);
      }
    }

    // caixas: meio balcao de frente para o cliente, com a registradora
    for (const register of world.registers) {
      put(SCENERY.pass, register.pos.x, register.pos.y, {
        sx: 0.5,
        rot: -Math.PI / 2,
      });
      const body = new THREE.Mesh(boxGeometry, registerMaterial);
      body.scale.set(0.34, 0.3, 0.42);
      body.position.set(
        register.pos.x + 0.08,
        SCENERY.counterTop + 0.15,
        -register.pos.y,
      );
      const screen = new THREE.Mesh(boxGeometry, screenMaterial);
      screen.scale.set(0.05, 0.14, 0.26);
      screen.position.set(
        register.pos.x + 0.26,
        SCENERY.counterTop + 0.2,
        -register.pos.y,
      );
      scenery.add(body, screen);
    }

    // frente: cerca viva, portao e tapete
    for (let x = 0; x < layout.w; x++) {
      if (isSolid(layout, x, 1)) put(SCENERY.hedge, x + 0.5, 1.5);
    }
    put(SCENERY.gate, layout.doorX + 1, 1.5);
    put(SCENERY.carpet, layout.doorX + 1, 2.6);
    put(SCENERY.bottles, first + tiles - 0.5, passY, {
      h: SCENERY.counterTop,
    });

    for (const id of world.decor) {
      for (const spot of DECOR_SPOTS[id](layout)) {
        put(DECOR_PIECES[id], spot.x, spot.y, { h: spot.h, rot: spot.rot });
      }
    }

    // entrega: caminhao parado na rua e o caixote na calcada
    truck = put(SCENERY.truck, layout.delivery.x + 2.6, -2.2, {
      rot: Math.PI / 2,
      scale: TRUCK_SCALE,
    });
    crate.position.set(layout.delivery.x, 0.25, -layout.delivery.y);
    scenery.add(crate);
  }

  // ------------------------------------------------------------ personagens
  const actors = new Map<string, Actor>();
  const shadowGeometry = new THREE.CircleGeometry(0.34, 20);
  const shadowMaterial = new THREE.MeshBasicMaterial({
    color: COLORS.scene.shadow,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });

  function actorOf(key: string, skin: SkinId): Actor {
    let actor = actors.get(key);
    if (actor) return actor;
    const group = new THREE.Group();
    const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    group.add(shadow);
    root.add(group);
    const created: Actor = {
      group,
      view: null,
      knife: null,
      pan: null,
      facing: null,
      seen: true,
    };
    actor = created;
    actors.set(key, created);
    void loadCharacterView(SKIN_MODELS[skin]).then(
      (view) => {
        // saiu de cena antes de o modelo chegar
        if (disposed || actors.get(key) !== created) return view.dispose();
        created.view = view;
        created.knife = view.object.getObjectByName(KNIFE_NODE) ?? null;
        created.pan = view.object.getObjectByName(PAN_NODE) ?? null;
        group.add(view.object);
      },
      () => {},
    );
    return actor;
  }

  function drawActor(
    key: string,
    skin: SkinId,
    pos: Vec2,
    facing: number,
    pose: Partial<CharacterPose>,
    dt: number,
  ): void {
    const actor = actorOf(key, skin);
    actor.seen = true;
    actor.group.position.set(pos.x, 0, -pos.y);
    actor.facing =
      actor.facing === null
        ? facing
        : actor.facing +
          angleDiff(facing, actor.facing) * Math.min(1, dt * TURN_RATE);
    actor.group.rotation.y = actor.facing;
    // faca so cortando, frigideira so no fogao
    const emote = pose.emote?.name;
    if (actor.knife) actor.knife.visible = emote === 'chop';
    if (actor.pan) actor.pan.visible = emote === 'pan';
    // parado ou sentado sem comer: olha em volta e mexe os bracos
    const seed = pose.variant ?? 0;
    const still = (pose.moving ?? 0) < 0.05 && (!emote || emote === 'sit');
    if (actor.view) clearFidget(actor.view);
    actor.view?.pose(
      { ...REST, ...pose, look: still ? fidgetLook(lifetime, seed) : 0 },
      dt,
    );
    if (still && !emote && actor.view) fidgetArms(actor.view, lifetime, seed);
  }

  // ------------------------------------------------------- pratos e baloes
  const dishes = new Map<string, { object: THREE.Object3D; seen: boolean }>();
  function drawDish(
    key: string,
    dish: DishId,
    x: number,
    height: number,
    y: number,
  ): void {
    let entry = dishes.get(key);
    if (!entry) {
      const object = kit?.clone(DISH_PIECES[dish]);
      if (!object) return;
      object.scale.setScalar(DISH_SCALE);
      root.add(object);
      entry = { object, seen: true };
      dishes.set(key, entry);
    }
    entry.seen = true;
    entry.object.position.set(x, height, -y);
  }

  const labels = new Map<string, { label: Label; seen: boolean }>();

  // --- falas: so desenho, a simulacao nao sabe delas. Quem fala e a chave
  // do personagem (a mesma de `actors`)
  const speeches = new Map<
    string,
    { text: string; from: number; until: number }
  >();
  const any = (lines: string[]) =>
    lines[Math.floor(Math.random() * lines.length)];
  function say(key: string, lines: string[], delay = 0): void {
    speeches.set(key, {
      text: any(lines),
      from: lifetime + delay,
      until: lifetime + delay + SPEECH_TIME,
    });
  }
  // quem atende mais perto de `pos` (player ou contratado) responde
  function reply(world: World, pos: Vec2, lines: string[]): void {
    const servers = [
      { key: `player:${world.player.skin}`, pos: world.player.pos },
      ...world.staff.map((staff) => ({
        key: `staff:${staff.id}:${staff.skin}`,
        pos: staff.pos,
      })),
    ].sort((a, b) => distance(a.pos, pos) - distance(b.pos, pos));
    if (servers[0] && distance(servers[0].pos, pos) < REPLY_REACH) {
      say(servers[0].key, lines, REPLY_DELAY);
    }
  }
  // estado de cada cliente no quadro anterior, e quando ele puxa conversa
  const lastStates = new Map<number, Customer['state']>();
  const nextChat = new Map<number, number>();
  let wasAtManager = false;

  function talk(world: World): void {
    const t = getTexts().game.talk;
    const queued = world.customers.filter((c) => c.state === 'queue').length;
    for (const customer of world.customers) {
      const key = `customer:${customer.id}:0`;
      const before = lastStates.get(customer.id);
      const now = customer.state;
      lastStates.set(customer.id, now);
      if (before && before !== now) {
        if (now === 'wantOrder') say(key, t.call);
        else if (now === 'waitFood') {
          const dish = getTexts().dishes[customer.orders[0]];
          say(
            key,
            t.order.map((line) => line.replace('{dish}', dish)),
          );
          reply(world, customer.pos, t.orderReply);
        } else if (now === 'eating') {
          say(key, t.thanks);
          reply(world, customer.pos, t.enjoy);
        } else if (now === 'leaving' && customer.angry) say(key, t.angry);
        else if (now === 'leaving' && before === 'paying') {
          say(key, t.bye);
          reply(world, customer.pos, t.comeBack);
        }
        continue;
      }
      // conversa: dentro do grupo sentado, ou entre quem espera na fila
      const group = customer.skins.length > 1 && isSeated(customer);
      const waiting = now === 'queue' && queued > 1 && customer.moving === 0;
      if (!group && !waiting) continue;
      const due = nextChat.get(customer.id);
      const [min, max] = CHAT_EVERY;
      if (due === undefined || lifetime >= due) {
        nextChat.set(customer.id, lifetime + min + Math.random() * (max - min));
        if (due === undefined) continue;
        const member = Math.floor(Math.random() * customer.skins.length);
        say(
          `customer:${customer.id}:${member}`,
          waiting ? t.queue : now === 'eating' ? t.eating : t.chat,
        );
      }
    }
    for (const id of lastStates.keys()) {
      if (world.customers.some((customer) => customer.id === id)) continue;
      lastStates.delete(id);
      nextChat.delete(id);
    }
    if (world.atManager && !wasAtManager) say('manager', t.manager);
    wasAtManager = world.atManager;
  }

  function drawLabel(
    key: string,
    content: LabelContent,
    x: number,
    height: number,
    y: number,
    opacity = 1,
  ): void {
    let entry = labels.get(key);
    if (!entry) {
      entry = { label: createLabel(!!content.speech), seen: true };
      labels.set(key, entry);
      root.add(entry.label.sprite);
    }
    entry.seen = true;
    entry.label.set(content);
    entry.label.sprite.position.set(x, height, -y);
    entry.label.sprite.material.opacity = opacity;
  }

  const loop = (name: SushiEmote, time: number) => ({
    name,
    phase: (time / EMOTE_SECONDS[name]) % 1,
  });

  // o que o balao do cliente mostra, pelo estado
  function customerLabel(customer: Customer): LabelContent | null {
    const badge = KIND_BADGES[customer.kind] ?? '';
    const bar = customer.patience;
    switch (customer.state) {
      case 'queue':
      case 'toTable':
        return badge ? { text: badge, bar } : { text: '', bar };
      case 'deciding':
        return { text: `${badge}💭` };
      case 'wantOrder':
        return { text: `${badge}✋`, bar };
      case 'waitFood':
        return {
          text:
            badge +
            customer.orders
              .slice(customer.delivered)
              .map((dish) => DISHES[dish].icon)
              .join(''),
          bar,
        };
      case 'wantPay':
      case 'toRegister':
      case 'paying':
        return { text: `${badge}💰`, bar };
      case 'leaving':
        return customer.angry ? { text: '💢' } : null;
      default:
        return null;
    }
  }

  return {
    sync(world, time, dt) {
      lifetime += dt;
      if (kit && builtFor !== world) {
        build(world, kit);
        builtFor = world;
      }
      for (const actor of actors.values()) actor.seen = false;
      for (const entry of dishes.values()) entry.seen = false;
      for (const entry of labels.values()) entry.seen = false;

      const working = (action: Action, carrying: number) => ({
        crouching: carrying > 0,
        emote: action === 'none' ? null : loop(ACTION_EMOTES[action], time),
      });
      const carry = (
        key: string,
        holder: { pos: Vec2; facing: number; carrying: number[] },
      ) => {
        holder.carrying.forEach((id, i) => {
          const ticket = world.tickets.find((t) => t.id === id);
          if (!ticket) return;
          drawDish(
            `${key}:${id}`,
            ticket.dish,
            holder.pos.x + Math.cos(holder.facing) * CARRY_FORWARD,
            CARRY_HEIGHT + i * CARRY_STACK,
            holder.pos.y + Math.sin(holder.facing) * CARRY_FORWARD,
          );
        });
      };

      const { player } = world;
      drawActor(
        `player:${player.skin}`,
        player.skin,
        player.pos,
        player.facing,
        {
          moving: player.moving,
          ...working(player.action, player.carrying.length),
        },
        dt,
      );
      carry('player', player);

      for (const staff of world.staff) {
        drawActor(
          `staff:${staff.id}:${staff.skin}`,
          staff.skin,
          staff.pos,
          staff.facing,
          {
            moving: staff.moving * (world.boosts.staffTurbo > 0 ? 1 : WALK),
            variant: staff.id,
            ...working(staff.action, staff.carrying.length),
          },
          dt,
        );
        carry(`staff${staff.id}`, staff);
      }

      for (const customer of world.customers) {
        const seated = isSeated(customer);
        const table = world.tables.find((t) => t.id === customer.table);
        memberSpots(world, customer).forEach((spot, i) => {
          drawActor(
            `customer:${customer.id}:${i}`,
            customer.skins[i],
            spot.pos,
            spot.facing,
            {
              moving: seated ? 0 : customer.moving * WALK,
              variant: customer.id + i,
              emote: seated
                ? loop(customer.state === 'eating' ? 'eat' : 'sit', time + i)
                : null,
            },
            dt,
          );
          // prato que ja chegou, na frente de quem pediu
          if (seated && table && i < customer.delivered) {
            drawDish(
              `table:${customer.id}:${i}`,
              customer.orders[i],
              table.pos.x + Math.sign(spot.pos.x - table.pos.x) * PLATE_OFFSET,
              SCENERY.tableTop,
              table.pos.y + Math.sign(spot.pos.y - table.pos.y) * PLATE_OFFSET,
            );
          }
        });
        const content = customerLabel(customer);
        if (content) {
          const at = seated && table ? table.pos : customer.pos;
          drawLabel(`customer:${customer.id}`, content, at.x, HEAD_LABEL, at.y);
        }
      }

      // prato pronto no passa-pratos
      for (const ticket of world.tickets) {
        if (ticket.slot === null) continue;
        const spot = world.layout.pass[ticket.slot];
        drawDish(
          `pass:${ticket.id}`,
          ticket.dish,
          spot.x,
          SCENERY.counterTop,
          spot.y,
        );
      }

      // estacao: o que esta sendo feito, ou comandas esperando alguem
      for (const station of world.stations) {
        const ticket = world.tickets.find((t) => t.id === station.ticket);
        const waiting = world.tickets.filter(
          (t) =>
            t.state === 'queued' && DISHES[t.dish].station === station.kind,
        ).length;
        const content: LabelContent | null = ticket
          ? {
              text: DISHES[ticket.dish].icon,
              bar: ticket.progress,
              barKind: 'progress',
            }
          : waiting > 0
            ? { text: waiting > 1 ? `🧾${waiting}` : '🧾' }
            : null;
        if (content) {
          drawLabel(
            `station:${station.id}`,
            content,
            station.pos.x,
            COUNTER_LABEL,
            station.pos.y,
          );
        }
      }

      for (const register of world.registers) {
        const customer = world.customers.find(
          (c) => c.id === register.customer,
        );
        if (customer?.state !== 'paying') continue;
        drawLabel(
          `register:${register.id}`,
          { text: '🔔', bar: register.progress, barKind: 'progress' },
          register.pos.x,
          COUNTER_LABEL,
          register.pos.y,
        );
      }

      // a gerente, atras da mesa dela, de frente para a porta
      const { manager } = world.layout;
      drawActor('manager', MANAGER_SKIN, manager, Math.PI, { variant: 7 }, dt);
      drawLabel('manager', { text: '💼' }, manager.x, HEAD_LABEL, manager.y);

      // falas, em cima de quem fala
      if (world.status === 'playing') talk(world);
      for (const [key, speech] of speeches) {
        const speaker = actors.get(key);
        if (lifetime >= speech.until || !speaker) {
          speeches.delete(key);
          continue;
        }
        if (lifetime < speech.from) continue;
        drawLabel(
          `say:${key}`,
          { text: speech.text, speech: true },
          speaker.group.position.x,
          SPEECH_HEIGHT,
          -speaker.group.position.z,
        );
      }

      const delivering = world.delivery > 0;
      if (truck) truck.visible = delivering;
      crate.visible = delivering;
      if (delivering) {
        const { x, y } = world.layout.delivery;
        drawLabel(
          'delivery',
          { text: `📦${Math.ceil(world.delivery)}` },
          x,
          1.4,
          y,
        );
      }

      for (const floater of world.floaters) {
        const text =
          floater.kind === 'coins'
            ? `+${floater.amount}🟡`
            : floater.kind === 'tips'
              ? `+${floater.amount}💵`
              : floater.kind === 'fresh'
                ? '🚚 +20%'
                : '💢';
        const life = floater.age / FLOATER_TIME;
        drawLabel(
          `floater:${floater.id}`,
          { text, plain: COLORS.label[floater.kind] },
          floater.pos.x,
          // a gorjeta sobe ao lado das moedas, nao em cima
          1.7 + life * FLOATER_RISE + (floater.kind === 'tips' ? 0.55 : 0),
          floater.pos.y,
          1 - life * life,
        );
      }

      for (const [key, actor] of actors) {
        if (actor.seen) continue;
        actor.view?.dispose();
        actor.group.removeFromParent();
        actors.delete(key);
      }
      for (const [key, entry] of dishes) {
        if (entry.seen) continue;
        entry.object.removeFromParent();
        dishes.delete(key);
      }
      for (const [key, entry] of labels) {
        if (entry.seen) continue;
        entry.label.dispose();
        labels.delete(key);
      }
    },
    dispose() {
      disposed = true;
      for (const actor of actors.values()) actor.view?.dispose();
      for (const entry of labels.values()) entry.label.dispose();
      actors.clear();
      labels.clear();
      dishes.clear();
      root.removeFromParent();
      ground.geometry.dispose();
      ground.material.dispose();
      boxGeometry.dispose();
      crateMaterial.dispose();
      registerMaterial.dispose();
      screenMaterial.dispose();
      shadowGeometry.dispose();
      shadowMaterial.dispose();
    },
  };
}
