# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Professor da disciplina de Desenvolvimento Web (Univille):** avalia o site. Confere se as atividades (dew_010, dew_12, dew_14, dew_15, dew_16) foram cumpridas e se o código está bem feito e explicado.
- **Comprador fictício:** quer montar um cinema em casa. Compara TVs e acessórios, lê os detalhes de cada produto e coloca no carrinho. O site deve funcionar para essa pessoa como uma loja de verdade.
- **Administrador (o autor):** cadastra, edita, oculta e exclui produtos pelo painel `/dewuniville-admin/`.

## Product Purpose

TelaMax é uma loja fictícia de TVs e acessórios, feita como trabalho da disciplina. O sucesso tem dois lados, com o mesmo peso:
- ser uma loja crível e fácil de usar: catálogo, busca, ordenação, carrinho, página de produto e formulário;
- impressionar na apresentação com a história interativa "Monte seu cinema em casa".

## Positioning

É uma loja de TVs que mostra a tecnologia em vez de só listar especificações. A história "Monte seu cinema em casa" tem cinco passos:
1. Tamanho da TV.
2. Grade de pixels 4K.
3. Comparação QLED × OLED num canvas com pixels que dá para apagar.
4. Soundbar com música gerada pela Web Audio API.
5. Instalação na parede.

Tudo isso é feito só com HTML, CSS e JavaScript puros.

## Operating Context

- **Páginas públicas:** `products.html` (início), `category_tvs.html`, `category_acessories.html` e `product.html?id=`.
- **Publicação:** site estático na Vercel (https://dewuniville.vercel.app/). O `vercel.json` roda `scripts/gerar-config.js` e faz o endereço `/` abrir o `products.html`.
- **Dados:** os produtos vêm do Supabase. Se o banco não estiver configurado, o site usa os cards escritos no HTML.
- **Painel admin:** login com o usuário curto `thiago`, que vira um e-mail técnico. A proteção real é feita pelas políticas RLS do Supabase.

## Capabilities and Constraints

- **Stack:** só HTML, CSS e JavaScript puros no site, sem framework e sem biblioteca.
- **Exercícios:** nada que atenda os exercícios `dew_*` pode ser removido. Isso inclui:
  - o grid de produtos com 1, 2 e 3 colunas e o `grid-template-areas`;
  - as media queries e o estilo de impressão;
  - mobile first, formulário em flex e `@keyframes`;
  - `.hide`, a opacidade no hover dos links e o `<picture>`.
- **Comentários:** todo código novo deve vir comentado em português, explicando cada parte, no mesmo nível do código atual. Os comentários indicam qual exercício cada regra atende.
- **Sem segredos no repositório:** o repositório é público.
  - Chaves e credenciais ficam só no `.env` (que está no gitignore) e nas variáveis da Vercel. Elas nunca vão para o GitHub.
  - A chave `service_role` nunca entra no site.
  - Senhas nunca são escritas em arquivo.
- **Já existe e funciona:**
  - menu responsivo e modo escuro, que fica salvo;
  - carrinho lateral que continua cheio entre as páginas;
  - busca, ordenação e validação do formulário;
  - transição entre páginas e barra de progresso de leitura;
  - respeito a "reduzir movimento".

## Brand Commitments

- **Nome:** TelaMax.
- **Idioma:** todo o texto da interface é em português do Brasil.

## Evidence on Hand

- **Catálogo:** 12 produtos iniciais em `supabase/schema.sql`, com imagens em `img/`.
- **O que não existe:** depoimentos, clientes reais, avaliações, números de vendas e parceiros. Não inventar nada disso como se fosse real.

## Product Principles

1. **Loja primeiro, espetáculo junto:** os efeitos nunca atrapalham comprar, buscar ou ler um produto.
2. **Mostrar, não listar:** explicar a tecnologia de TV de forma interativa sempre que fizer sentido.
3. **Código que ensina:** cada parte deve ser legível e comentada, porque o código também é avaliado.
4. **Feito à mão:** usar só o que o navegador já oferece, sem dependências.
5. **Seguro por padrão:** nada sensível no código público.

## Accessibility & Inclusion

- Rótulos para leitores de tela.
- Navegação pelo teclado (Esc fecha o carrinho).
- Todas as animações são desligadas quando o sistema pede "reduzir movimento".
