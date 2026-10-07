# TelaMax — Produtos e acessórios para TVs

Loja fictícia de TVs e acessórios feita para a disciplina de Desenvolvimento Web (Univille), usando só **HTML, CSS e JavaScript puros**, sem framework e sem biblioteca.

**Site no ar:** https://dewuniville.vercel.app/

## Páginas

| Página | Arquivo | O que tem |
| --- | --- | --- |
| Início | `products.html` | Banner, vantagens da loja, categorias, a história "Monte seu cinema em casa" e os destaques da semana |
| TVs | `category_tvs.html` | Lista de TVs com busca e ordenação, formulário "Solicite sua TV" e perguntas frequentes |
| Acessórios | `category_acessories.html` | Lista de acessórios com busca e ordenação |

Todas as páginas têm o mesmo cabeçalho, menu e rodapé, e terminam com links para as outras ("Continue navegando").

## Funcionalidades

- **Menu responsivo:** lista grande que abre pelo botão no celular; links lado a lado no computador.
- **Modo escuro:** fica salvo no navegador e segue o tema do sistema na primeira visita.
- **Carrinho lateral:** adicionar produtos, mudar a quantidade, ver o total e finalizar o pedido (simulado). O carrinho continua cheio ao trocar de página.
- **Busca e ordenação:** por nome ou preço, nas páginas de categoria.
- **Formulário com validação:** nome e email conferidos campo a campo, com a mensagem de erro embaixo de cada um.
- **Scrollytelling "Monte seu cinema em casa":** uma TV desenhada em CSS muda conforme a página rola, em 5 passos:
  1. **Tamanho** da TV.
  2. **Resolução 4K**, com a grade de pixels.
  3. **QLED × OLED:** a tela vira um `canvas` com milhares de pixels. A câmera dá zoom até os subpixels, o mouse ou o dedo apaga pixels e uma linha atravessa a tela comparando as duas tecnologias.
  4. **Som:** a soundbar toca uma música criada na hora com a Web Audio API, sem arquivo de áudio. A sala escurece, a TV vira um visualizador e uma luz ambiente atrás dela pulsa no grave.
  5. **Instalação na parede:** o visualizador vira um anel em volta do "Pronto!".
- **Detalhes de interface:**
  - Seções que aparecem suavemente ao rolar.
  - Manchas de cor no fundo que seguem o mouse.
  - Barra de progresso de leitura e botão de voltar ao topo.
  - Transição suave entre as páginas.
- **Acessibilidade:**
  - Rótulos para leitores de tela.
  - Navegação pelo teclado (Esc fecha o carrinho).
  - Todas as animações são desligadas quando o sistema pede "reduzir movimento".

## Atividades atendidas

Os comentários no código indicam qual exercício cada regra atende (ex.: `/* dew_15 ct-tvs 6: 3 colunas */`).

| Aula | Conteúdo | Onde está |
| --- | --- | --- |
| dew_010 | Formulário, perguntas frequentes e imagens com `<picture>` | `category_tvs.html` e cards de produto |
| dew_12 (Atividade 9) | Banner com imagem de fundo, `.hide`, navegação, opacidade no hover dos links | `css/style.css` |
| dew_14 (Atividade 10) | Flexbox, cabeçalho fixo, imagens responsivas | `css/style.css` |
| dew_15 (Atividade 10) | Grid de produtos (1, 2 e 3 colunas), `grid-template-areas`, media queries, estilo de impressão | `css/style.css` |
| dew_16 (Atividade 10) | Mobile first, formulário em flex, animações com `@keyframes` | `css/style.css` e `css/category_tvs.css` |

## Estrutura

```
├── products.html            página inicial
├── category_tvs.html        TVs + formulário + perguntas frequentes
├── category_acessories.html acessórios
├── css/
│   ├── style.css            estilos de todas as páginas
│   └── category_tvs.css     estilos só da página de TVs
├── js/
│   ├── theme.js             aplica o modo escuro antes da página aparecer
│   ├── main.js              menu, tema, carrinho, busca, história e efeitos
│   ├── story-music.js       música e visualizador dos passos 4 e 5
│   └── category_tvs.js      validação do formulário
└── vercel.json              faz o endereço principal abrir o products.html
```

O código está comentado em português, explicando cada parte.

## Como abrir

Não precisa instalar nada: basta abrir o `products.html` no navegador.

## Publicação

O site está publicado na Vercel em https://dewuniville.vercel.app/, como site estático, sem build:
- **Framework Preset:** `Other`
- **Build Command:** vazio
- **Output Directory:** vazio

O `vercel.json` faz o endereço principal (`/`) abrir o `products.html`, já que o projeto não tem `index.html`.
