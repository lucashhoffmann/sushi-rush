# Testes

Stack: Vitest + jsdom + Testing Library. Config em `vite.config.ts`, setup em
`src/test/setup.ts`.

## Comandos

```bash
pnpm test          # roda tudo uma vez
pnpm test:watch    # modo watch
pnpm typecheck     # inclui os arquivos de teste (tsconfig.spec.json)
```

## Camadas de teste

| Camada        | O que cobre            | Como                                              |
| ------------- | ---------------------- | ------------------------------------------------- |
| `app/modules` | regras do jogo         | Vitest puro sobre `World`, sem DOM                |
| `app/store`   | ponte simulacao/UI     | Vitest chamando acoes do store                    |
| `resources`   | joystick, instalar app | Testing Library                                   |
| `app/engine`  | render three.js        | cena three sem WebGL (jsdom); visual no navegador |

Personagem de modelo (`app/engine/characters`): `clip-driver` e conta pura;
a view e testada com um modelo e clipes montados no proprio teste, sem
carregar arquivo.

Cenario de modelo (`app/engine/scenery`): `model-kit.test.ts` monta a cena
do kit no proprio teste.

`app/engine/tests/sushi.assets.test.ts` le os GLB de `public/models/sushi` e
confere pecas, ossos e clipes contra `scenery.config.ts`, `sushi.rig.ts` e
`character-models.config.ts`.

jsdom nao tem WebGL: o renderer e as paginas que montam a engine nao tem
teste automatico; o visual se confere no navegador (`pnpm dev`, e
`__sushi.getWorld()` no console para montar situacoes).

## Onde colocar

- sempre dentro de uma pasta `tests/` do modulo, pagina ou componente
- nome: `<arquivo-testado>.test.ts` ou `.test.tsx`

## Mundo de teste

`src/test/world.fixture.ts`:

- `restaurantWith(changes)`: o restaurante inicial com o que o teste trocar
- `crew(level)`: um garcom, um cozinheiro e um caixa
- `openWorld(changes, seed)`: dia ja aberto
- `run(world, seconds, until?)`: avanca a simulacao em passo fixo

## Regras

- regra nova em `modules` entra com teste na mesma mudanca
- teste de simulacao avanca tempo chamando o sistema com `dt` fixo; nunca
  timers reais
- teste que depende de sorteio fixa o `seed`
- componente visual e testado por props; quem le o store e a pagina
- nao testar detalhe de implementacao do three; testar o `World` que ele
  desenha

## O que cada modulo garante

- `world`: o dia roda sozinho com equipe completa e fecha; mesma seed, mesmo
  dia; sem atendimento os clientes desistem e a reputacao cai; meta paga
  bonus uma vez; boost nao empilha; paciencia congelada nao cai; a dica do
  HUD segue a ordem do atendimento (que e o fluxo solo inteiro)
- `level`: em toda expansao, da porta se chega a toda mesa, caixa, estacao e
  lugar do passa-pratos
- `management`: estrelas, compra sem saldo nao muda nada, preco que cresce,
  obra em dias e pulo com gorjeta, fim do dia, travas de prato e de equipe,
  skins
- `vault`: cada cliente paga uma vez, ate o teto; numero escrito no mundo
  nao vira saldo
- `store`: save com selo (editado volta ao comeco), boost cobra do save, fim
  do dia credita e avanca
