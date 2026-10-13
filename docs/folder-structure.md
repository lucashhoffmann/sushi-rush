# Estrutura de Pastas

Estrutura alvo do `sushi-rush`. Regras de nome e dependencia estao em
`docs/pattern.md`.

## `src`

```text
src
├── app
│   ├── engine
│   │   ├── game-engine.ts               laco, teclado, camera
│   │   ├── character-preview.ts         preview 3D da loja de skins
│   │   ├── assets.preload.ts
│   │   ├── characters                   personagens de modelo (docs/characters.md)
│   │   │   ├── character-view.types.ts
│   │   │   ├── clip-driver.util.ts
│   │   │   ├── gltf-character.view.ts
│   │   │   ├── character-model.loader.ts
│   │   │   ├── sushi.rig.ts
│   │   │   ├── character-models.config.ts
│   │   │   └── tests
│   │   ├── scenery                      cenario de modelo (docs/scenery.md)
│   │   │   ├── model-kit.ts
│   │   │   ├── scenery.config.ts
│   │   │   └── tests
│   │   ├── renderers
│   │   │   ├── world.renderer.ts        cenario, personagens, pratos, baloes
│   │   │   └── label.renderer.ts        balao de canvas
│   │   └── tests                        arquivos publicados x configuracao
│   ├── modules
│   ├── net                              servidor de salas (ainda sem uso)
│   └── store
│       └── game-store
│           ├── game.store.ts            telas, HUD, acoes
│           ├── save.ts                  restaurante salvo, com selo
│           └── tests
├── resources
│   ├── components
│   │   ├── base
│   │   │   ├── badges                   moedas, gorjeta, estrelas
│   │   │   └── virtual-joystick
│   │   └── ui
│   ├── pages
│   │   ├── app.tsx                      escolhe tela pelo store
│   │   ├── home
│   │   ├── manage                       gerencia: o que se compra entre dias
│   │   ├── character                    loja de skins
│   │   └── game                         canvas, HUD, como-jogar, fim de dia
│   └── main.tsx
├── shared
│   ├── colors.ts
│   ├── i18n.ts
│   ├── lib
│   ├── styles
│   └── utils
└── test
    ├── setup.ts
    └── world.fixture.ts
```

## Modulos

```text
src/app/modules
├── world
│   ├── constants/world.constants.ts     balanceamento do dia
│   ├── types/world.types.ts             tipos compartilhados
│   ├── systems/world.system.ts          createWorld, stepWorld, startBoost
│   ├── utils/hint.util.ts               dica do que fazer agora
│   └── tests
├── level
│   ├── utils/layout.util.ts             planta, colisao, andar por caminho
│   ├── utils/pathfinding.util.ts        pathTo, pathBeside
│   └── tests
├── menu
│   └── constants/menu.constants.ts      os pratos
├── customer
│   └── systems/customer.system.ts       chegada, fila, mesa, paciencia
├── service
│   └── systems/service.system.ts        anotar, preparar, pegar, entregar, cobrar
├── player
│   └── systems/player.system.ts         anda e atende por proximidade
├── staff
│   └── systems/staff.system.ts          garcom, cozinheiro, caixa
├── management
│   ├── constants/management.constants.ts precos e limites
│   ├── systems/management.system.ts     ofertas, compras, fim do dia
│   └── tests
└── vault
    ├── systems/vault.system.ts          cofre da gorjeta
    └── tests
```

## Onde cada coisa mora

| Preciso de                       | Vai em                                          |
| -------------------------------- | ----------------------------------------------- |
| nova regra do dia                | `app/modules/<feature>/systems`                 |
| novo numero de balanceamento     | `app/modules/<feature>/constants`               |
| novo prato                       | `menu.constants.ts` + `DISH_PIECES` + `i18n.ts` |
| nova compra na gerencia          | `ManageAction` em `management.system.ts`        |
| nova skin ou decoracao           | `management.constants.ts` + config da engine    |
| tipo usado por mais de um modulo | `app/modules/world/types/world.types.ts`        |
| novo visual 3D                   | `app/engine/renderers`                          |
| novo campo visivel no HUD        | `Hud` em `app/store/game-store/game.store.ts`   |
| nova tela ou painel              | `resources/pages/<feature>`                     |
| helper matematico neutro         | `shared/utils`                                  |
| mundo de teste                   | `src/test/world.fixture.ts`                     |
