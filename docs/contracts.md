# Contratos

Tipos e interfaces entre simulacao, store, engine e UI. Os tipos moram em
`src/app/modules/world/types/world.types.ts`; este arquivo diz para que
servem e quem pode mudar o que. Mudou tipo la: atualizar aqui na mesma
mudanca.

## Coordenadas

Simulacao em 2D: `(x, y)`, um tile vale 1, `y` cresce da rua para o fundo.
A engine desenha em `(x, altura, -y)`. `facing` e angulo em radianos
(`atan2(dy, dx)`), 0 = para a direita.

## Restaurant (o que persiste)

Um objeto so, de dados simples. Mora em `store/game-store/save.ts`; o store
guarda uma copia para a tela.

| Campo                    | O que e                                      |
| ------------------------ | -------------------------------------------- |
| `day`                    | proximo dia a jogar                          |
| `coins`, `tips`          | as duas moedas                               |
| `reputation`             | 0 a 100; estrelas por `starsOf`              |
| `expansion`              | 0 a 2: colunas de mesas e largura da planta  |
| `tables`, `bigTables`    | mesas compradas; mesas de 4 lugares          |
| `registers`, `stations`  | caixas e estacoes por tipo                   |
| `menu`                   | pratos liberados                             |
| `staff`, `nextStaffId`   | contratados (`role`, `level`, `skin`)        |
| `tray`, `shoes`          | melhorias do player                          |
| `skins`, `skin`, `decor` | compradas com gorjeta; a skin vestida        |
| `pending`                | obras e treinos em andamento (`job`, `days`) |
| `bestDay`                | maior caixa de um dia                        |

So muda por `management.system`:

- `offerOf(restaurant, action)`: preco e trava (`Blocked`) de uma
  `ManageAction`. Nao olha o saldo
- `applyManage(restaurant, action)`: compra, se nao travada e com saldo
- `endDay(restaurant, { coins, reputation })`: credita o caixa, avanca o dia
  e as obras

## World (um dia)

Criado por `createWorld(restaurant, seed)`; descartado no fim do dia. Mesma
seed, mesmo dia: aleatorio so por `nextRandom(world)`.

| Campo                                 | O que e                                                       |
| ------------------------------------- | ------------------------------------------------------------- |
| `status`                              | `intro`, `playing`, `paused`, `dayover`                       |
| `clock`                               | segundos de salao aberto; passou de `DAY_LENGTH`, fechando    |
| `layout`                              | planta: grade de solidos, fila, passa-pratos, portao          |
| `player`                              | posicao, bandeja (`carrying`: ids de `Ticket`), `action`      |
| `staff`                               | contratados, com `task` e `path`                              |
| `customers`                           | grupos de 1 a 4; `state`, `patience`, `orders`                |
| `tables`, `stations`, `registers`     | pecas da planta com quem as ocupa                             |
| `tickets`                             | pratos pedidos: `queued`, `cooking`, `ready`, `carried`       |
| `boosts`, `rush`, `delivery`, `fresh` | efeitos e eventos em curso (segundos que faltam)              |
| `mods`                                | o que compras e dia mudam (velocidade, bandeja, bonus, folga) |
| `run`                                 | placar do dia: atendidos, perdidos, caixa, gorjeta, combo     |

### Ciclo do cliente

```text
queue -> toTable -> deciding -> wantOrder -> waitFood -> eating
      -> wantPay -> toRegister -> paying -> leaving
```

Quem muda o que:

- `customer.system`: chegada, fila, sentar, decidir, comer, ir ao caixa,
  paciencia. Paciencia zerada chama `leave(world, customer, true)`
- `service.system`: os verbos do atendimento, iguais para player e equipe:
  `takeOrder`, `workStation`, `pickUp`, `deliver`, `workRegister`, `leave`
- `player.system`: anda e chama os verbos por proximidade
- `staff.system`: escolhe tarefa e caminho, e chama os mesmos verbos
- `world.system`: `stepWorld` (relogio, boosts, eventos, chegada de cliente,
  fim do dia), `startBoost`, `begin`, `togglePause`

### Planta

`level/utils/layout.util.ts` monta a planta a partir do `Restaurant`
(`buildLevel`) e explica as fileiras no comentario do topo. Caminhos por
`pathTo` e `pathBeside` (BFS em 4 direcoes).

### Gorjeta e cofre

A gorjeta sai de `checkout` (paciencia, combo, tipo de cliente, decoracao) e
passa por `vault.system`: `claimTip` paga cada cliente uma vez, ate
`TIP_CAP`; `takeTips` entrega ao store o que foi pago. `run.tips` e so o
numero mostrado.

## Store

`store/game-store/game.store.ts`. O `World` fica fora do estado
(`getWorld()`); o estado guarda `screen`, a copia do `restaurant`, o `hud`
(resumo que a tela mostra, em valores que mudam pouco) e o `summary` do dia
que fechou.

| Acao                          | O que faz                                               |
| ----------------------------- | ------------------------------------------------------- |
| `startDay`                    | cria o mundo do dia; na primeira vez abre no como-jogar |
| `begin`, `togglePause`        | abertura e pausa                                        |
| `tick(input, dt)`             | um passo: `stepWorld`, credita gorjeta, fecha o dia     |
| `manage(action)`              | compra da gerencia, pelo save                           |
| `boost(id)`                   | liga o boost e cobra a gorjeta                          |
| `sprint`                      | gasta uma corrida do player (`startSprint`)             |
| `backToMenu`                  | larga o dia (o caixa do dia se perde)                   |
| `openManage`, `openCharacter` | telas                                                   |

Corrida do player: `player.sprints` guarda ate `SPRINT_MAX`; `startSprint`
gasta uma e liga `player.sprint` (segundos que faltam, a `SPRINT_SPEED` vezes
a velocidade). A primeira gasta liga `player.sprintReset`: quando zera,
voltam todas. O HUD le `hud.sprints`, `hud.sprinting` e `hud.sprintReset`.

Com o player na mesa da gerente (`world.atManager`, que vira
`hud.atManager`), `visitManager` (botao do HUD ou tecla F) pausa o mundo,
abre a gerencia e poe `visiting` em true.
`leaveManager` volta para o dia: chama `syncPurchases` (equipe, cardapio,
melhorias e bonus valem na hora; a planta so muda no dia seguinte) e
despausa.

`save.ts` e a fonte da verdade do restaurante: variavel do modulo, salva com
selo. UI e engine nunca escrevem nele direto.

## Engine

- `game-engine.ts`: laco de passo fixo, teclado, camera que segue o player.
  Chama `tick` e depois `view.sync(world, time, dt)`
- `renderers/world.renderer.ts`: so le o `World`. Monta o cenario quando o
  mundo muda e sincroniza personagens, pratos e baloes a cada quadro
- `renderers/label.renderer.ts`: balao de canvas (icone, barra, numero)
- `characters/*`: corpo de modelo atras de `CharacterView`
  (`docs/characters.md`)
- `scenery/*`: kit de pecas (`docs/scenery.md`)

## UI

Paginas leem o store por hook (`use-*.page.ts`) e chamam acoes. Nenhuma
pagina muta `World` nem `Restaurant`. Textos em `shared/i18n.ts`, nos dois
idiomas, com as mesmas chaves dos ids de `world.types`.
