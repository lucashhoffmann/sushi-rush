# Reuso em outros jogos

O que este projeto pega da engine compartilhada, o que e so do Sushi Rush, e
onde vai codigo novo que serve a mais de um jogo. Regras de camada e nome
continuam em `docs/pattern.md`.

Estado atual: **a engine existe** e e uma biblioteca separada,
`three-hex-engine`, publicada no npm (`^0.1.1` em `dependencies`).
Repositorio: https://github.com/lucashhoffmann/three-hex-engine
(local em `../../three-hex-engine`). Arquitetura hexagonal (portas e
adaptadores) com plugins: ver o
[README](https://github.com/lucashhoffmann/three-hex-engine/blob/main/README.md) e
[architecture.md](https://github.com/lucashhoffmann/three-hex-engine/blob/main/docs/architecture.md).
Como cada jogo usa a engine e como comecar um jogo novo:
[AGENTS.md](https://github.com/lucashhoffmann/three-hex-engine/blob/main/AGENTS.md).
Os mesmos docs vem dentro do pacote: `node_modules/three-hex-engine/README.md`
e `node_modules/three-hex-engine/docs/`.

Este projeto e independente: lockfile proprio, deploy proprio, `pnpm install`
aqui dentro.

Codigo comum nao e mais copiado entre jogos. Correcao em peca que ja esta na
engine e feita no repositorio dela, sai numa versao nova e chega a cada jogo
quando ele sobe a versao.

## Jogos que usam a engine

| Jogo            | Pasta                              | O que mudou                                                        |
| --------------- | ---------------------------------- | ------------------------------------------------------------------ |
| Shadow Contract | `workspace/games/shadow-contract`  | o original: ninja e terno, personagens de pecas, cenario de caixas |
| Blade & Bounty  | `workspace/games/blade-and-bounty` | medieval: arco, besta, modelos e masmorra do KayKit, outras fontes |
| Sushi Rush      | `workspace/games/sushi-rush`       | restaurante: simulacao nova, kit Sushi Restaurant, sem combate     |

## O que este jogo pega da engine

| Import                 | O que usa                                                                      | Onde no jogo                                          |
| ---------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------- |
| `three-hex-engine/core`   | `createEngine`: laco de passo fixo, teto de frame, frame snap                  | `app/engine/game-engine.ts`                           |
| `three-hex-engine/clock`  | `rafClock`                                                                     | `game-engine.ts`                                      |
| `three-hex-engine/input`  | `createKeyboardInput`, `createGamepadInput`, `combineInputs`, `MOVE`           | `game-engine.ts` (andar)                              |
| `three-hex-engine/three`  | `createThreeRenderer`, view de personagem glTF, clipes, carregador, `ModelKit` | `game-engine.ts`, renderers, preload, `characters`    |
| `three-hex-engine/kit`    | `nextRandom`, `clamp`, `distance`, `angleDiff`, `searchGrid`, `tileCenterOf`   | `app/modules` (TS puro)                               |
| `three-hex-engine/net`    | conexao socket.io                                                              | `app/net/session.client.ts` (so le `VITE_SERVER_URL`) |
| `three-hex-engine/server` | servidor de salas inteiro                                                      | `sushi-rush-server/src/main.ts`                       |

`three-hex-engine/kit` e TS puro: `app/modules` pode importar. `three` continua
so em `src/app/engine` (a engine importa `three` nos adaptadores dela).

`pathfinding.util.ts` continua no jogo (`pathTo`, `pathBeside`): sabe da
planta e passa a busca para `searchGrid`.

## O que fica no jogo

`modules/world/types` e `constants`, `customer`, `service`, `staff`,
`player`, `management`, `menu`, `vault`, a planta em `layout.util.ts`,
`world.renderer`, `label.renderer`, `character-preview.ts`,
`assets.preload.ts`, `sushi.rig.ts`, `character-models.config.ts`,
`scenery.config.ts`, HUD, gerencia, `save.ts`, `colors.ts`, `i18n.ts`, os
atalhos de um toque (P, Esc, Enter, F/E, espaco, 1 a 4) e o `preventDefault`
no `keydown` de `game-engine.ts`.

O que este jogo **nao** tem dos outros: `kaykit.rig.ts`, lobby e
`session.store`. O joystick de toque e so o disco, sem os botoes de salto,
agachar e ataque.

## As tres camadas de reuso

```text
plataforma   conta, pagamento, analytics, anuncio, compartilhar, instalar
             nao sabe que jogo esta rodando
kit          laco de passo fixo, input, rng, colisao em grade, caminho,
             rede host/convidado, joystick, i18n
             sabe que e um jogo, nao sabe qual
jogo         World, sistemas, constantes, templates, renderers, HUD, textos
             so serve para o Sushi Rush
```

O kit esta em boa parte na engine (laco, input, rng, grade, rede). A
plataforma ainda nao tem codigo.

## Ainda no jogo, candidato a ir para a engine

### Ja neutro

Nao importa nada de `app/modules` nem de `app/store`. Precisou num segundo
jogo: mover para a engine, nao copiar.

| Arquivo                                         | O que e                                                    |
| ----------------------------------------------- | ---------------------------------------------------------- |
| `shared/lib/utils.ts`                           | `cn` de classes                                            |
| `shared/styles/classes.ts`                      | botao e placa de jogo                                      |
| `resources/components/base/virtual-joystick/*`  | joystick de toque (aqui, so o disco)                       |
| `resources/components/ui/*`                     | botao e dialogo                                            |
| `resources/pages/home/components/install-app/*` | convite de instalar o PWA                                  |
| `app/engine/renderers/label.renderer.ts`        | balao de canvas na cena: texto, barra, numero que sobe     |
| `scripts/pack-kaykit-restaurant.mjs`            | copia do `pack-kaykit-dungeon.mjs` dos outros, outra lista |

### Neutro na ideia, preso no jogo: precisa separar

| Peca                                   | Onde esta                         | O que prende                          | Como soltar                                                |
| -------------------------------------- | --------------------------------- | ------------------------------------- | ---------------------------------------------------------- |
| Colisao de circulo e andar por caminho | `level/utils/layout.util.ts`      | mora junto da planta do restaurante   | `moveCircle` do kit com `isSolid`; `followPath` para o kit |
| Save com selo                          | `store/game-store/save.ts`        | tipo `Restaurant`                     | generico em `TSave`                                        |
| Cofre de moeda permanente              | `vault/systems/vault.system.ts`   | `World`, `TIP_CAP`                    | receber a chave do dia e o teto                            |
| Idioma, `useTexts`                     | `shared/i18n.ts`                  | mecanismo divide o arquivo com textos | mecanismo num arquivo, textos em outro                     |
| Preview de personagem                  | `app/engine/character-preview.ts` | `SkinId`, emote `wave`                | receber o modelo e o emote                                 |

## O formato que se repete

Todo jogo neste molde tem as mesmas sete decisoes. Mantenha-as e o kit encaixa.

1. **Um `World` de dados simples.** Sem classe, sem metodo, sem referencia
   circular: serializa em JSON, o que da snapshot de rede e save de graca.
2. **Sistemas sao funcoes** `fn(world, ...args, dt)` que mutam o `World`.
3. **Passo fixo** (`FIXED_DT`). Nada de relogio dentro da simulacao.
4. **Aleatorio so por `nextRandom(world)`** (`three-hex-engine/kit`). Mesma seed,
   mesma partida: e o que deixa testar chance com numero exato.
5. **Numero de balanceamento em `*.constants.ts`**, com comentario dizendo o
   que ele faz no jogo. E onde se ajusta o jogo sem ler codigo.
6. **Simulacao nao sabe de tela.** `modules` nao importa `three`, React nem
   DOM. A engine le o `World` e desenha; a UI le um resumo (`Hud`) no store.
7. **Host simula, servidor repassa.** Multiplayer sem servidor de jogo: o
   navegador do host roda `stepWorld` e manda snapshot.

Mais os habitos que sustentam isso: teste ao lado em `tests/`, e
`docs/contracts.md` atualizado junto com `world.types.ts`.

## Regra daqui para frente

- **Codigo que serve a qualquer jogo vai para o repositorio `three-hex-engine`**,
  com teste, e e importado. Nao e copiado de um jogo para outro. O jogo recebe
  subindo a versao (`pnpm up three-hex-engine`). Onde e como:
  [AGENTS.md](https://github.com/lucashhoffmann/three-hex-engine/blob/main/AGENTS.md).
- **Nunca editar `node_modules/three-hex-engine`.** Corrigir no repositorio,
  publicar versao nova, subir a versao no jogo.
- **Engine e jogo juntos:** na engine `pnpm build --watch` (tsup); no jogo
  `pnpm link ../../three-hex-engine`. Antes de commitar o jogo,
  `pnpm unlink three-hex-engine && pnpm install`, para `package.json` e o
  lockfile voltarem a versao do npm. Link commitado quebra o deploy.
- **Mudou a engine:** `pnpm test` no `three-hex-engine` e `pnpm test` em cada
  jogo com a versao nova.
- **Codigo de plataforma nasce em `src/platform/`** e nao importa `app/modules`,
  `app/store` nem `app/engine`. Conta, pagamento, posse de item, analytics e
  anuncio entram ai. Fala com o jogo por funcoes e eventos de nome generico
  (`track('match_end', { score })`, `owns('skin:x')`), nunca pelo `World`.
- **Peca nova que serve a qualquer jogo** (um utilitario de grade, um
  componente de toque) nao importa `modules/world`. Recebe por parametro o
  que precisa.
- **Mecanismo e conteudo em arquivos separados.** O que mais prende codigo
  aqui e o arquivo que tem os dois: `layout.util.ts` com colisao e a planta
  do restaurante, `i18n.ts` com o hook e os textos.

O teste da fronteira e mecanico: um arquivo e reusavel se a lista de imports
dele nao tem `@/app/modules`, `@/app/store` nem `@/app/engine`.

## Comecar um jogo novo

Seguir o [AGENTS.md](https://github.com/lucashhoffmann/three-hex-engine/blob/main/AGENTS.md) da engine: comeca
pelo `examples/coin-rush` (jogo minimo com teste), escreve o `World`, os
sistemas e o renderer nessa ordem. O que serve a qualquer jogo ja vem da
engine.
