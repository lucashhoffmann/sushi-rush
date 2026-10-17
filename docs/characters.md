# Personagens

Player, equipe e clientes sao o mesmo tipo de corpo: um modelo glTF com
esqueleto e clipes, atras da interface `CharacterView`
(`src/adapters/three/character-view.types.ts` do `three-hex-engine`, importada de
`three-hex-engine/three`). Quem desenha o mundo entrega a
pose do quadro e nao sabe o que ha por tras.

## Arquivos

| Arquivo                      | O que e                                             | De quem |
| ---------------------------- | --------------------------------------------------- | ------- |
| `character-view.types.ts`    | `CharacterPose` e `CharacterView`                   | engine  |
| `clip-driver.util.ts`        | pose -> que clipes tocam, com que peso (conta pura) | engine  |
| `gltf-character.view.ts`     | a view: esqueleto, materiais, mixer                 | engine  |
| `character-model.loader.ts`  | baixa e guarda os arquivos                          | engine  |
| `sushi.rig.ts`               | `RigSpec` do esqueleto do kit Sushi                 | jogo    |
| `character-models.config.ts` | que arquivo cada skin usa                           | jogo    |

"Engine" mora em `src/adapters/three/` do repositorio `three-hex-engine` e sai
de `three-hex-engine/three`;
serve aos tres jogos. Correcao ali e feita no repositorio da engine, nao copiada
(`docs/engine-reuse.md`). "Jogo" mora em `src/app/engine/characters/`.

## Como a pose vira animacao

A `CharacterPose` foi desenhada para um jogo de combate. Aqui so se usa:

| Campo       | Uso neste jogo                                                    |
| ----------- | ----------------------------------------------------------------- |
| `moving`    | 0 parado, 0.5 andando (cliente, equipe), 1 correndo (player)      |
| `crouching` | **levando prato**: troca para `Idle_Holding` / `Walk_Holding`     |
| `emote`     | o que faz parado: `sit`, `eat`, `chop`, `pan`, `assemble`, `wave` |
| `variant`   | id do personagem                                                  |

Os emotes sao ciclos. A view toca o ponto do clipe que recebe em `phase`,
entao quem desenha manda a fase girando: `(tempo / EMOTE_SECONDS[nome]) % 1`.

O arquivo de cada personagem traz a faca e a frigideira (nos `Knife` e
`Pan`). O renderer so mostra a faca no emote `chop` e a frigideira no `pan`.

## Arquivos de modelo

`public/models/sushi/<skin>.glb`, gerados por `scripts/pack-sushi.mjs`:

- o panda leva os proprios clipes
- os coelhos tem todos o mesmo esqueleto: os clipes saem so em
  `rabbit-grey.glb` e os outros usam os dele (`clipsUrl`)
- so entram os clipes da lista `CLIPS` do script

`engine/tests/sushi.assets.test.ts` confere arquivos, ossos e clipes contra
a configuracao.

## Skin nova

1. por o `.gltf` no kit e rodar o script
2. id novo em `SkinId` (`world.types.ts`) e preco em `SKINS`
   (`management.constants.ts`)
3. nome nos dois idiomas em `shared/i18n.ts`

`character-models.config.ts` monta a url pelo id (`rabbitGrey` ->
`rabbit-grey.glb`).

## Animacao nova

1. nome do clipe em `CLIPS` no script; rodar
2. entrada em `emotes` e `EMOTE_SECONDS` em `sushi.rig.ts`
3. usar no `world.renderer.ts` (`ACTION_EMOTES` ou a pose do cliente)
