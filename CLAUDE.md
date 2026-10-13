# Sushi Rush

Jogo de restaurante top-down de navegador: three.js puro na engine, React so
na UI. Nasceu do Blade & Bounty e do Shadow Contract (ver "Origem" no
README): mesma arquitetura e mesmos adaptadores de modelo, com outra
simulacao (atender mesas, cozinhar, cobrar, gerenciar).

Antes de criar ou mover arquivo, ler:

- `docs/pattern.md`: camadas, direcao de dependencias, nomes e sufixos
- `docs/folder-structure.md`: arvore alvo e onde cada coisa mora
- `docs/contracts.md`: tipos e interfaces entre simulacao, store, engine e UI
- `docs/testing.md`: o que testar, onde colocar e como rodar
- `docs/engine-reuse.md`: o que e reusavel em outros jogos e o que e so deste
- `docs/characters.md`: como os personagens sao montados e animados; como
  criar skin ou animacao nova
- `docs/scenery.md`: cenario de modelo (piso, parede, balcao, pratos); como
  trocar peca ou kit

Regras que mais quebram:

- `three` so pode ser importado em `src/app/engine`
- `src/app/modules` e TS puro: sem `three`, sem React, sem DOM
- todo teste mora dentro de uma pasta `tests/`
- mudou tipo em `world.types.ts`: atualizar `docs/contracts.md` na mesma mudanca
- numero de balanceamento mora em `*.constants.ts`, nunca solto no sistema
- moedas e gorjeta so mudam por `store/game-store/save.ts`
- codigo de plataforma (conta, pagamento, analytics, anuncio) nasce em
  `src/platform` e nao importa `app/modules`, `app/store` nem `app/engine`

Comandos: `pnpm dev`, `pnpm test`, `pnpm typecheck`, `pnpm lint`.
