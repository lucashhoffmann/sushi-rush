// Shared game palette (sushi bar: indigo, vermelhao, creme e madeira). CSS variables and canvas/Three.js read these values.
export const COLORS = {
  ui: {
    accent: '#3a3352',
    background: '#1f1b2e',
    border: '#4a4266',
    brand: '#e8452c',
    // dinheiro dos pratos e gorjeta, no HUD e na gerencia
    coin: '#ffcf40',
    tip: '#6fe3a1',
    destructive: '#c0392b',
    // moldura de paineis e botoes
    frame: '#f3d9a4',
    foreground: '#fff3dc',
    homeDeep: '#120f1c',
    homeGlow: '#8a2f2a',
    highlight: '#ffd66b',
    info: '#4a78c2',
    ink: '#1a1016',
    muted: '#2c2740',
    mutedText: '#bdb3cf',
    panel: '#2a2440',
    primary: '#e8452c',
    primaryText: '#fff8ec',
    secondary: '#3d5a80',
    success: '#3f9d5a',
    white: '#ffffff',
  },
  // cena 3D
  scene: {
    // chao em volta do restaurante
    ground: 0x2a2536,
    sky: 0xfff1dc,
    shade: 0x554466,
    sun: 0xffffff,
    shadow: 0x000000,
    crate: 0xb07a3c,
    registerBody: 0x2b2b33,
    registerScreen: 0x7cf0a0,
  },
  // baloes e numeros que sobem (canvas)
  label: {
    bubble: '#fffdf6',
    outline: '#1a1016',
    barBack: '#3a3352',
    good: '#4fd06f',
    warn: '#ffc93c',
    bad: '#ff4d3d',
    coins: '#ffcf40',
    tips: '#6fe3a1',
    angry: '#ff6b5b',
    fresh: '#8fd3ff',
  },
};
