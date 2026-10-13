// Classes repetidas pela interface inteira.

// botao brute de jogo: moldura clara, sombra dura embaixo, afunda ao clicar
export const CHUNKY =
  'text-outline flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-4 border-[var(--game-frame)] text-white uppercase shadow-[0_5px_0_var(--game-ink)] transition-transform hover:scale-105 active:translate-y-1 active:shadow-none disabled:pointer-events-none disabled:opacity-45';

// placa do HUD e dos cartoes: fundo escuro, moldura clara, sombra dura
export const PANEL =
  'rounded-2xl border-[3px] border-[var(--game-frame)] bg-[var(--game-panel)]/95 shadow-[0_4px_0_var(--game-ink)]';
