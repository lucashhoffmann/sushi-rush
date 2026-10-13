# Cenario

Tudo que nao e personagem vem de um arquivo so, `public/models/sushi/kit.glb`:
cada peca e um no `piece_<nome>`. `engine/scenery/model-kit.ts` (comum aos
tres jogos) entrega copias pelo nome; `engine/scenery/scenery.config.ts`
(deste jogo) diz que peca faz cada coisa.

## Escala

O kit inteiro entra pela metade (`KIT_SCALE = 0.5`): o piso (4 x 4 no kit)
cobre 2 x 2 tiles, o balcao (4 de comprido) cobre 2, a mesa cabe num tile.
Medidas de cada peca, no tamanho do kit: `public/models/sushi/kit.sizes.txt`.

## Quem poe o que

`renderers/world.renderer.ts`, funcao `build`, a partir do `World`:

| Coisa                 | De onde sai                                         |
| --------------------- | --------------------------------------------------- |
| pisos e paredes       | tamanho da planta (`layout.w`, `layout.h`)          |
| bancada e estacoes    | `world.stations` + `SCENERY.stations`               |
| passa-pratos          | `layout.pass`                                       |
| mesas e bancos        | `world.tables` + `seatSpots`                        |
| caixas                | `world.registers` (a registradora e uma caixa)      |
| cerca, portao, tapete | tiles solidos da fileira 1 e `layout.doorX`         |
| decoracao comprada    | `world.decor` + `DECOR_SPOTS` (no renderer)         |
| caminhao e caixote    | `layout.delivery`, visiveis com `world.delivery`    |
| pratos                | `DISH_PIECES`, no passa-pratos, na bandeja, na mesa |

A parede da frente nao existe: a camera olha da rua para dentro.

## Peca nova

1. nome do `.gltf` em `PIECES` no `scripts/pack-sushi.mjs`; rodar
2. usar o nome em `scenery.config.ts` (e em `sceneryPieces()`, que o teste
   de arquivos confere)

## Trocar de kit

Outro kit com a mesma ideia (pecas soltas, uma textura): novo script de
empacotar, novos nomes em `scenery.config.ts`, `KIT_SCALE` e `counterTop`,
`tableTop` conforme as medidas dele.

## Segundo kit: KayKit Restaurant Bits

`public/models/kaykit/restaurant.glb` (`scripts/pack-kaykit-restaurant.mjs`,
copia do `pack-kaykit-dungeon.mjs` dos outros jogos). So enfeite e detalhe;
se o arquivo nao chegar, o cenario sai sem ele. Tudo em `BITS`
(`scenery.config.ts`), na escala `BITS_SCALE`:

| Coisa                         | Onde                                                 |
| ----------------------------- | ---------------------------------------------------- |
| geladeiras                    | fim da bancada do fundo, no lugar do ultimo balcao   |
| coifa                         | parede, em cima de cada fogao                        |
| panelao, potes, escorredor    | tiles da bancada sem estacao (`BITS.clutter`)        |
| pilhas de caixote             | `crateTiles` (layout.util): tiles solidos            |
| cardapio                      | cada mesa e a mesa da gerente                        |
| prato limpo / sujo            | na frente de quem senta; sujo depois de comer        |
| pote                          | balcao do caixa                                      |
| porta de correr (duas folhas) | vao da gerencia; abre sozinha com o player por perto |
| caixote da entrega            | calcada, durante a entrega                           |

Peca nova deste kit: nome em `PIECES` no script, rodar, usar em `BITS` (e em
`bitsPieces()`, que o teste de arquivos confere).
