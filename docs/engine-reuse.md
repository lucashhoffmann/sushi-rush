# Reuso em outros jogos

O que deste projeto serve para o proximo jogo, o que e so do Sushi Rush,
e como comecar um jogo novo a partir daqui. Regras de camada e nome continuam
em `docs/pattern.md`.

Estado atual, sem enfeite: **ainda nao existe uma engine separada**. Quase todo
arquivo de `src/app` importa `modules/world` (o `World` deste jogo). O que
existe e uma arquitetura que se repete bem e um punhado de pecas que ja sao
neutras. Este documento marca a fronteira para ela nao piorar e da a ordem de
extracao para quando houver um segundo jogo.

## Jogos que saem daqui

| Jogo            | Pasta                              | O que mudou                                                        |
| --------------- | ---------------------------------- | ------------------------------------------------------------------ |
| Shadow Contract | `workspace/games/shadow-contract`  | o original: ninja e terno, personagens de pecas, cenario de caixas |
| Blade & Bounty  | `workspace/games/blade-and-bounty` | medieval: arco, besta, modelos e masmorra do KayKit, outras fontes |
| Sushi Rush      | `workspace/games/sushi-rush`       | restaurante: simulacao nova, kit Sushi Restaurant, sem combate     |

Blade & Bounty e Sushi Rush foram feitos pelo caminho de "Comecar um jogo
novo hoje" (copia), nao por pacote. Por isso o codigo comum existe **tres
vezes**.

**Regra enquanto nao ha pacote:** correcao ou melhoria em codigo comum feita
num jogo e copiada para os outros no mesmo dia. No Sushi Rush vale para:

- `src/app/engine/characters/`: `character-view.types.ts`,
  `clip-driver.util.ts`, `gltf-character.view.ts`,
  `character-model.loader.ts` e os testes deles
- `src/app/engine/scenery/model-kit.ts` e o teste dele

O que este jogo **nao** tem dos outros: `kaykit.rig.ts` e
`scripts/pack-kaykit*.mjs` (o esqueleto e o empacotador daqui sao
`sushi.rig.ts` e `scripts/pack-sushi.mjs`), lobby e `session.store`. O
joystick de toque e copia sem os botoes de salto, agachar e ataque.

`diff -r` entre as pastas dos jogos mostra o que divergiu.

Com tres jogos, o passo "Quando virar pacote" deixou de ser hipotetico: o
primeiro candidato e exatamente essa lista.

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

A plataforma e onde o reuso rende mais (todo jogo precisa igual) e onde ainda
nao ha codigo. O kit rende medio e esta hoje misturado com o jogo.

## Mapa do que existe

### Ja neutro: copia direto

Nao importa nada de `app/modules` nem de `app/store`.

| Arquivo                                         | O que e                                                    |
| ----------------------------------------------- | ---------------------------------------------------------- |
| `shared/utils/rng.util.ts`                      | rng com seed, estado em `{ rngState }`                     |
| `shared/utils/math.util.ts`                     | distancia, angulo, clamp                                   |
| `shared/lib/utils.ts`                           | `cn` de classes                                            |
| `shared/styles/classes.ts`                      | botao e placa de jogo                                      |
| `app/net/protocol.ts`, `session.client.ts`      | contrato e conexao do servidor de salas                    |
| `resources/components/base/virtual-joystick/*`  | joystick de toque (aqui, so o disco)                       |
| `resources/components/ui/*`                     | botao e dialogo                                            |
| `resources/pages/home/components/install-app/*` | convite de instalar o PWA                                  |
| `app/engine/characters/*` (os quatro comuns)    | personagem de modelo glTF atras de `CharacterView`         |
| `app/engine/scenery/model-kit.ts`               | kit de cenario: um GLB com varias pecas, pedidas pelo nome |
| `app/engine/renderers/label.renderer.ts`        | balao de canvas na cena: texto, barra, numero que sobe     |
| `app/modules/level/utils/pathfinding.util.ts`   | BFS em grade; so precisa de `isSolid`                      |

O servidor de salas (`sushi-rush-server`) tambem e neutro.

### Neutro na ideia, preso no jogo: precisa separar

| Peca                                   | Onde esta                         | O que prende                          | Como soltar                                |
| -------------------------------------- | --------------------------------- | ------------------------------------- | ------------------------------------------ |
| Laco de passo fixo, acumulador         | `app/engine/game-engine.ts`       | chama `useGameStore` e a camera daqui | receber `tick`, `getWorld` e `render`      |
| Colisao de circulo e andar por caminho | `level/utils/layout.util.ts`      | mora junto da planta do restaurante   | `moveCircle` e `followPath` num arquivo so |
| Save com selo                          | `store/game-store/save.ts`        | tipo `Restaurant`                     | generico em `TSave`                        |
| Cofre de moeda permanente              | `vault/systems/vault.system.ts`   | `World`, `TIP_CAP`                    | receber a chave do dia e o teto            |
| Idioma, `useTexts`                     | `shared/i18n.ts`                  | mecanismo divide o arquivo com textos | mecanismo num arquivo, textos em outro     |
| Preview de personagem                  | `app/engine/character-preview.ts` | `SkinId`, emote `wave`                | receber o modelo e o emote                 |

### So deste jogo: nao tentar reaproveitar

`modules/world/types` e `constants`, `customer`, `service`, `staff`,
`player`, `management`, `menu`, a planta em `layout.util.ts`,
`world.renderer`, `sushi.rig.ts`, as configs de modelo, HUD, gerencia,
`colors.ts`, os textos de `i18n.ts`.

## O formato que se repete

Todo jogo neste molde tem as mesmas sete decisoes. Mantenha-as e o kit encaixa.

1. **Um `World` de dados simples.** Sem classe, sem metodo, sem referencia
   circular: serializa em JSON, o que da snapshot de rede e save de graca.
2. **Sistemas sao funcoes** `fn(world, ...args, dt)` que mutam o `World`.
3. **Passo fixo** (`FIXED_DT`). Nada de relogio dentro da simulacao.
4. **Aleatorio so por `nextRandom(world)`.** Mesma seed, mesma partida: e o
   que deixa testar chance com numero exato.
5. **Numero de balanceamento em `*.constants.ts`**, com comentario dizendo o
   que ele faz no jogo. E onde se ajusta o jogo sem ler codigo.
6. **Simulacao nao sabe de tela.** `modules` nao importa `three`, React nem
   DOM. A engine le o `World` e desenha; a UI le um resumo (`Hud`) no store.
7. **Host simula, servidor repassa.** Multiplayer sem servidor de jogo: o
   navegador do host roda `stepWorld` e manda snapshot.

Mais os habitos que sustentam isso: teste ao lado em `tests/`, e
`docs/contracts.md` atualizado junto com `world.types.ts`.

## Regra daqui para frente

Para a fronteira nao piorar enquanto nao ha segundo jogo:

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

## Comecar um jogo novo hoje

Enquanto nao houver pacote, o caminho e copiar. E barato e nao acopla os jogos.

1. Copie o repositorio inteiro e o `sushi-rush-server`.
2. Mantenha: `shared/utils`, `shared/lib`, `app/net`, `resources/components`,
   a configuracao (vite, tsconfig, eslint, vitest, tailwind, PWA), os `docs/`.
3. Apague o conteudo de `app/modules/*`, os renderers, as paginas de jogo e
   os textos de `i18n.ts`. Guarde `game-engine.ts`, `layout.util.ts`,
   `pathfinding.util.ts`, `save.ts` e `label.renderer.ts` como ponto
   de partida: sao as pecas da segunda tabela.
4. Escreva o `World` novo em `world.types.ts` seguindo o formato acima.
5. Escreva `stepWorld`, depois o renderer, depois o HUD. Nessa ordem: o jogo
   roda em teste antes de ter tela.
6. Ao adaptar cada peca guardada no passo 3, solte a dependencia do jeito que
   a tabela diz. E nessa hora que ela vira kit de verdade.

## Quando virar pacote

So com o segundo jogo andando. Antes disso nao da para saber qual e a
interface certa, e pacote com um unico consumidor so adiciona etapa de build.

Ordem, do que rende mais para o que rende menos:

1. **Plataforma** (`src/platform` vira pacote): conta, pagamento, analytics.
   Todo jogo usa igual, e e o que tem dinheiro e dado de usuario: corrigir num
   lugar so importa.
2. **Rede** (`app/net` + servidor + snapshot generico): ja esta quase solta.
3. **Kit de simulacao**: rng, math, grade, caminho, laco de passo fixo.
4. **Componentes de toque e UI**: joystick, vinheta, instalar, compartilhar.

Forma: monorepo pnpm (`packages/platform`, `packages/net`, `packages/kit`,
`games/blade-and-bounty`, `games/<novo>`). O projeto ja usa pnpm; workspace nao
pede ferramenta nova. Publicar em registro so se os jogos forem para
repositorios separados.

Nao entra em pacote: renderers, modelos, sistemas de combate e inimigo. Cada
jogo tem os seus, e forcar um formato comum ai custa mais do que copiar.
