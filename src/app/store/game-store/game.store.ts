import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  type ManageAction,
  starsOf,
} from '@/app/modules/management/systems/management.system';
import { startSprint } from '@/app/modules/player/systems/player.system';
import { takeTips } from '@/app/modules/vault/systems/vault.system';
import {
  BOOST_IDS,
  BOOSTS,
  DAY_LENGTH,
  SPRINT_MAX,
  SPRINT_RESET,
} from '@/app/modules/world/constants/world.constants';
import {
  begin as beginWorld,
  createWorld,
  isClosing,
  stepWorld,
  syncPurchases,
  togglePause as toggleWorldPause,
  startBoost,
} from '@/app/modules/world/systems/world.system';
import type {
  BoostId,
  InputState,
  Job,
  Restaurant,
  World,
} from '@/app/modules/world/types/world.types';
import { type Hint, hintOf } from '@/app/modules/world/utils/hint.util';
import {
  closeDay,
  creditTips,
  manageSave,
  readSave,
  resetSave,
  restoreSave,
  saveGame,
  spendTips,
} from '@/app/store/game-store/save';

// Contrato em docs/contracts.md (secao Store).

export type Screen =
  'menu' | 'manage' | 'character' | 'intro' | 'playing' | 'paused' | 'dayover';

export const GRAPHICS_QUALITIES = ['high', 'medium', 'low'] as const;
export type Graphics = { quality: (typeof GRAPHICS_QUALITIES)[number] };

// resumo do dia para a tela: so o que ela mostra, em valores que mudam pouco
export type Hud = {
  day: number;
  // fracao do dia que falta (1 a 0), em passos de 2%
  timeLeft: number;
  // salao fechado: so falta o ultimo cliente sair
  closing: boolean;
  // caixa e gorjeta do dia
  coins: number;
  tips: number;
  stars: number;
  served: number;
  goal: number;
  lost: number;
  combo: number;
  carrying: number;
  capacity: number;
  hint: Hint | null;
  // fracao (0 a 1) que falta de cada boost, em passos de 5%; 0 = desligado
  boosts: Record<BoostId, number>;
  rush: boolean;
  // segundos que faltam da entrega na calcada; 0 = sem entrega
  delivery: number;
  fresh: boolean;
  // o player esta na mesa da gerente: o botao de acao aparece
  atManager: boolean;
  // corridas guardadas, se esta correndo agora, e a fracao (1 a 0, em passos
  // de 5%) que falta para voltarem todas; 0 = nenhuma gasta
  sprints: number;
  sprinting: boolean;
  sprintReset: number;
};

// o que o dia rendeu, para a tela de fim de dia
export type DaySummary = {
  day: number;
  served: number;
  goal: number;
  goalBonus: number;
  lost: number;
  coins: number;
  tips: number;
  bestCombo: number;
  starsBefore: number;
  starsAfter: number;
  // foi o maior caixa ate hoje
  record: boolean;
  // obras e treinos que ficaram prontos nesta noite
  finished: Job[];
};

type GameStore = {
  screen: Screen;
  // copia do save, para a tela (a verdade mora em save.ts)
  restaurant: Restaurant;
  hud: Hud;
  summary: DaySummary | null;
  // a gerencia foi aberta na sala da gerente, com o dia pausado
  visiting: boolean;
  graphics: Graphics;
  // ja viu o "como jogar" uma vez
  introSeen: boolean;
  startDay: () => void;
  begin: () => void;
  togglePause: () => void;
  backToMenu: () => void;
  openManage: () => void;
  // abre a gerencia, se o player esta na mesa da gerente (botao ou tecla)
  visitManager: () => void;
  // volta da sala da gerente para o dia
  leaveManager: () => void;
  openCharacter: () => void;
  manage: (action: ManageAction) => boolean;
  boost: (id: BoostId) => void;
  // gasta uma corrida do player (botao ou tecla)
  sprint: () => void;
  setGraphics: (graphics: Graphics) => void;
  resetGame: () => void;
  tick: (input: InputState, dt: number) => void;
};

// O mundo do dia fica fora do estado: muda 60 vezes por segundo e quem
// desenha (engine) le direto daqui.
let world: World | null = null;
export const getWorld = () => world;

// eixo do joystick de toque; a engine soma ao do teclado
export const joystickInput: InputState = { moveX: 0, moveY: 0 };
export function setJoystickInput(moveX: number, moveY: number): void {
  joystickInput.moveX = moveX;
  joystickInput.moveY = moveY;
}

const step = (value: number, size: number) => Math.ceil(value / size) * size;

function hudOf(current: World | null, restaurant: Restaurant): Hud {
  if (!current) {
    return {
      day: restaurant.day,
      timeLeft: 1,
      closing: false,
      coins: 0,
      tips: 0,
      stars: starsOf(restaurant.reputation),
      served: 0,
      goal: 0,
      lost: 0,
      combo: 0,
      carrying: 0,
      capacity: 0,
      hint: null,
      boosts: { staffTurbo: 0, kitchenTurbo: 0, freeze: 0, rushHour: 0 },
      rush: false,
      delivery: 0,
      fresh: false,
      atManager: false,
      sprints: SPRINT_MAX,
      sprinting: false,
      sprintReset: 0,
    };
  }
  const { run } = current;
  return {
    day: current.day,
    timeLeft: step(Math.max(0, 1 - current.clock / DAY_LENGTH), 0.02),
    closing: isClosing(current),
    coins: run.coins,
    tips: run.tips,
    stars: starsOf(current.reputation),
    served: run.served,
    goal: run.goal,
    lost: run.lost,
    combo: run.combo,
    carrying: current.player.carrying.length,
    capacity: current.mods.capacity,
    hint: current.status === 'playing' ? hintOf(current) : null,
    boosts: Object.fromEntries(
      BOOST_IDS.map((id) => [
        id,
        step(current.boosts[id] / BOOSTS[id].time, 0.05),
      ]),
    ) as Record<BoostId, number>,
    rush: current.rush > 0 || current.boosts.rushHour > 0,
    delivery: Math.ceil(current.delivery),
    fresh: current.fresh,
    atManager: current.status === 'playing' && current.atManager,
    sprints: current.player.sprints,
    sprinting: current.player.sprint > 0,
    sprintReset: step(current.player.sprintReset / SPRINT_RESET, 0.05),
  };
}

const sameHud = (a: Hud, b: Hud) =>
  (Object.keys(a) as (keyof Hud)[]).every((key) =>
    key === 'boosts'
      ? BOOST_IDS.every((id) => a.boosts[id] === b.boosts[id])
      : a[key] === b[key],
  );

const validGraphics = (saved: unknown, fallback: Graphics): Graphics => {
  const quality = (saved as Partial<Graphics> | undefined)?.quality;
  return quality && GRAPHICS_QUALITIES.includes(quality)
    ? { quality }
    : fallback;
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => {
      // fecha o dia: credita o caixa, anda as obras e monta o resumo
      const finishDay = (current: World) => {
        const before = readSave();
        closeDay({ coins: current.run.coins, reputation: current.reputation });
        const after = readSave();
        const { run } = current;
        set({
          screen: 'dayover',
          restaurant: after,
          summary: {
            day: current.day,
            served: run.served,
            goal: run.goal,
            goalBonus: run.served >= run.goal ? run.goalBonus : 0,
            lost: run.lost,
            coins: run.coins,
            tips: run.tips,
            bestCombo: run.bestCombo,
            starsBefore: starsOf(before.reputation),
            starsAfter: starsOf(after.reputation),
            record: run.coins > before.bestDay,
            finished: before.pending
              .filter((pending) => pending.days <= 1)
              .map((pending) => pending.job),
          },
        });
      };

      return {
        screen: 'menu',
        restaurant: readSave(),
        hud: hudOf(null, readSave()),
        summary: null,
        visiting: false,
        graphics: { quality: 'high' },
        introSeen: false,

        startDay: () => {
          const restaurant = readSave();
          world = createWorld(restaurant, Date.now());
          // o "como jogar" abre sozinho so na primeira vez
          const intro = !get().introSeen;
          if (!intro) beginWorld(world);
          set({
            screen: intro ? 'intro' : 'playing',
            introSeen: true,
            summary: null,
            restaurant,
            hud: hudOf(world, restaurant),
          });
        },

        begin: () => {
          if (!world || get().screen !== 'intro') return;
          beginWorld(world);
          set({ screen: 'playing' });
        },

        togglePause: () => {
          const { screen } = get();
          if (!world || (screen !== 'playing' && screen !== 'paused')) return;
          toggleWorldPause(world);
          set({ screen: world.status === 'paused' ? 'paused' : 'playing' });
        },

        // sair no meio do dia joga o caixa do dia fora (a gorjeta ja entrou)
        backToMenu: () => {
          world = null;
          const restaurant = readSave();
          set({
            screen: 'menu',
            visiting: false,
            restaurant,
            hud: hudOf(null, restaurant),
          });
        },

        openManage: () => {
          world = null;
          set({ screen: 'manage', visiting: false, restaurant: readSave() });
        },

        // pausa o dia e abre a gerencia
        visitManager: () => {
          if (!world || world.status !== 'playing' || !world.atManager) return;
          toggleWorldPause(world);
          set({ screen: 'manage', visiting: true, restaurant: readSave() });
        },

        leaveManager: () => {
          if (!world || !get().visiting) return;
          const restaurant = readSave();
          syncPurchases(world, restaurant);
          toggleWorldPause(world);
          set({ screen: 'playing', visiting: false, restaurant });
        },

        openCharacter: () => {
          world = null;
          set({ screen: 'character', restaurant: readSave() });
        },

        manage: (action) => {
          const done = manageSave(action);
          if (done) set({ restaurant: readSave() });
          return done;
        },

        // boost: liga no mundo e so entao cobra a gorjeta
        boost: (id) => {
          if (!world || readSave().tips < BOOSTS[id].tips) return;
          if (!startBoost(world, id)) return;
          spendTips(BOOSTS[id].tips);
          set({ restaurant: readSave() });
        },

        sprint: () => {
          if (world) startSprint(world);
        },

        setGraphics: (graphics) =>
          set({ graphics: validGraphics(graphics, get().graphics) }),

        resetGame: () => {
          world = null;
          resetSave();
          const restaurant = readSave();
          set({
            screen: 'menu',
            restaurant,
            summary: null,
            visiting: false,
            introSeen: false,
            hud: hudOf(null, restaurant),
          });
        },

        tick: (input, dt) => {
          if (!world) return;
          stepWorld(world, input, dt);
          const tips = takeTips(world);
          if (tips > 0) {
            creditTips(tips);
            set({ restaurant: readSave() });
          }
          if (world.status === 'dayover' && get().screen !== 'dayover') {
            finishDay(world);
          }
          const hud = hudOf(world, get().restaurant);
          if (!sameHud(hud, get().hud)) set({ hud });
        },
      };
    },
    {
      name: 'sushi-rush',
      partialize: (state) => ({
        // o restaurante vai com o selo dele, nao a copia do estado
        save: saveGame(),
        graphics: state.graphics,
        introSeen: state.introSeen,
      }),
      merge: (saved, current) => {
        const { save, graphics, introSeen } = (saved ?? {}) as {
          save?: unknown;
          graphics?: unknown;
          introSeen?: unknown;
        };
        const restaurant = restoreSave(save);
        return {
          ...current,
          restaurant,
          hud: hudOf(null, restaurant),
          graphics: validGraphics(graphics, current.graphics),
          introSeen: introSeen === true,
        };
      },
    },
  ),
);

// So em desenvolvimento: mundo e store no console (`__sushi`), para testar
// situacoes que dariam trabalho de alcancar jogando.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  Object.assign(window, { __sushi: { getWorld, store: useGameStore } });
}
