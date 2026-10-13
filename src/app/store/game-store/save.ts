import { DEFAULT_SKIN } from '@/app/modules/management/constants/management.constants';
import {
  applyManage,
  endDay,
  type ManageAction,
  newRestaurant,
} from '@/app/modules/management/systems/management.system';
import type { Restaurant } from '@/app/modules/world/types/world.types';

// O restaurante salvo: moedas, gorjeta e tudo que foi comprado. E a fonte da
// verdade: o store so guarda uma copia para a tela mostrar.
//
// Travas contra edicao pelo inspetor do navegador:
// - o restaurante mora numa variavel deste modulo, nao no estado do store.
//   Mudar o numero que a tela mostra (`setState`) nao muda o que a compra
//   confere
// - o que vai para o armazenamento local leva um selo (`seal`) calculado do
//   conteudo. Saldo ou compra editados a mao nao batem com o selo, e o
//   restaurante volta ao comeco
// - a gorjeta so cresce por `creditTips`, que o store chama com o que o
//   cofre do dia pagou (vault.system)
//
// Limite honesto: tudo roda no navegador, e o selo usa um segredo que esta no
// proprio codigo. Segura edicao de valor; nao segura quem reescrever o
// codigo. Trava de verdade so com servidor.

export type SavedGame = { data: string; seal: string };

let restaurant: Restaurant = newRestaurant();

const SALT = 'sushi-rush:save:4c1d7e';
// FNV-1a de 32 bits: basta para notar edicao, nao e criptografia
function seal(data: string): string {
  const text = `${SALT}|${data}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}

// copia: quem le nao alcanca o original
export function readSave(): Restaurant {
  return structuredClone(restaurant);
}

// o que vai para o armazenamento local
export function saveGame(): SavedGame {
  const data = JSON.stringify(restaurant);
  return { data, seal: seal(data) };
}

// Jogo salvo: so vale com o selo certo. Qualquer coisa fora disso (editado,
// corrompido) volta ao comeco. Campo que o save antigo nao tem pega o valor
// inicial.
export function restoreSave(saved: unknown): Restaurant {
  const candidate = saved as Partial<SavedGame> | null | undefined;
  restaurant = newRestaurant();
  if (
    candidate &&
    typeof candidate.data === 'string' &&
    candidate.seal === seal(candidate.data)
  ) {
    try {
      restaurant = {
        ...restaurant,
        ...(JSON.parse(candidate.data) as Restaurant),
      };
    } catch {
      // selo certo com JSON quebrado nao acontece; se acontecer, comeca de novo
    }
  }
  // save de antes de o panda ser a skin do dono: ganha o panda e ja o veste
  if (!restaurant.skins.includes(DEFAULT_SKIN)) {
    restaurant.skins.unshift(DEFAULT_SKIN);
    restaurant.skin = DEFAULT_SKIN;
  }
  return readSave();
}

// compra da gerencia; devolve se fez
export function manageSave(action: ManageAction): boolean {
  return applyManage(restaurant, action);
}

// gorjeta que o cofre do dia pagou
export function creditTips(tips: number): void {
  if (Number.isInteger(tips) && tips > 0) restaurant.tips += tips;
}

// gasta gorjeta (boost); devolve se o saldo cobria
export function spendTips(tips: number): boolean {
  if (!Number.isInteger(tips) || tips < 0 || restaurant.tips < tips) {
    return false;
  }
  restaurant.tips -= tips;
  return true;
}

export function closeDay(result: { coins: number; reputation: number }): void {
  endDay(restaurant, result);
}

export function resetSave(): void {
  restaurant = newRestaurant();
}
