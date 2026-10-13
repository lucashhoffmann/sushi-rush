import { TIP_CAP } from '@/app/modules/world/constants/world.constants';
import type { World } from '@/app/modules/world/types/world.types';

// Cofre da gorjeta. Ela vale fora do dia (compra skin e decoracao), entao o
// que entra no saldo nao pode depender de nada que se edita pelo inspetor do
// navegador: nem `run.tips`, nem a lista de clientes.
//
// Como trava:
// - o livro de cada dia mora aqui, numa variavel do modulo, fora do `World`.
//   Do console nao ha referencia para ele
// - cada cliente paga uma vez so, e no maximo TIP_CAP
// - o saldo so cresce por `takeTips`, chamado pelo store a cada passo
//
// Limite honesto: e um jogo que roda inteiro no navegador. Isto segura edicao
// de valor pelo inspetor e pelo armazenamento local; quem reescrever o
// codigo carregado passa. Trava de verdade so com servidor.

type Ledger = {
  // quem ja pagou: id do cliente, ou 'goal' para o bonus da meta
  paid: Set<number | 'goal'>;
  // pago e ainda nao levado para o saldo
  pending: number;
};

// um por dia: a chave e o `run`, que nasce com o mundo e nao e trocado
const ledgers = new WeakMap<object, Ledger>();

// Registra a gorjeta de `payer`. Devolve quanto foi pago de fato (0 se ele ja
// tinha pago).
export function claimTip(
  world: World,
  payer: number | 'goal',
  amount: number,
): number {
  let ledger = ledgers.get(world.run);
  if (!ledger) {
    ledger = { paid: new Set(), pending: 0 };
    ledgers.set(world.run, ledger);
  }
  if (ledger.paid.has(payer) || !(amount > 0)) return 0;
  const paid = Math.min(TIP_CAP, Math.floor(amount));
  ledger.paid.add(payer);
  ledger.pending += paid;
  return paid;
}

// Leva para o saldo o que o cofre pagou desde a ultima chamada, e zera.
export function takeTips(world: World): number {
  const ledger = ledgers.get(world.run);
  if (!ledger) return 0;
  const { pending } = ledger;
  ledger.pending = 0;
  return pending;
}
