// =====================================================================
// product-detail.js — monta a página de um produto (product.html)
// =====================================================================
// A página é uma só para todos os produtos. Qual produto mostrar vem do
// endereço: product.html?id=tv-lg-oled-55 -> id = "tv-lg-oled-55".
//
// De onde vêm os dados:
//   1. do Supabase (o banco do painel admin), quando ele está configurado;
//   2. da lista "reserva" abaixo, quando o Supabase não está configurado
//      ou não responde (sem internet, projeto pausado...). Assim os links
//      "Detalhes" dos cards nunca levam a uma página quebrada.
//
// Todo o conteúdo é criado com createElement + textContent (e nunca com
// innerHTML montado a partir dos dados). Assim, se alguém cadastrar um nome
// com "<script>" no admin, ele aparece como texto e não é executado.

// (function () { ... })() é uma função que roda na hora e guarda as
// variáveis só para ela, sem misturar com as do main.js
(function () {
  'use strict';

  const container = document.getElementById('product-detail');
  // URLSearchParams lê a parte "?id=..." do endereço
  const id = new URLSearchParams(location.search).get('id');

  // Lista reserva: os mesmos 12 produtos dos cards do HTML.
  // Cada item: [nome, categoria, preço, texto da imagem de exemplo]
  const fallback = {
    'tv-samsung-55': ['Samsung Crystal UHD 55" CU7700', 'tvs', 2699, 'Samsung+55'],
    'tv-lg-50': ['LG UHD 50" UR8750', 'tvs', 2399, 'LG+50'],
    'tv-tcl-65': ['TCL QLED 65" C655', 'tvs', 3499, 'TCL+65'],
    'tv-samsung-neo-65': ['Samsung Neo QLED 65" QN85C', 'tvs', 6999, 'Neo+QLED+65'],
    'tv-lg-oled-55': ['LG OLED 55" C3', 'tvs', 5999, 'LG+OLED+55'],
    'tv-philips-50': ['Philips Ambilight 50" PUG7908', 'tvs', 2299, 'Philips+50'],
    'ac-soundbar-jbl': ['Soundbar JBL Bar 2.1', 'acessorios', 899, 'Soundbar+JBL'],
    'ac-suporte-parede': ['Suporte de Parede Multivisão Fixo', 'acessorios', 129, 'Suporte+de+Parede'],
    'ac-cabo-hdmi': ['Cabo HDMI 2.1 8K 2 metros', 'acessorios', 79, 'Cabo+HDMI+2.1'],
    'ac-chromecast': ['Chromecast com Google TV', 'acessorios', 349, 'Chromecast'],
    'ac-controle': ['Controle Remoto Universal', 'acessorios', 59.90, 'Controle+Remoto'],
    'ac-filtro-linha': ['Filtro de Linha 8 Tomadas', 'acessorios', 89.90, 'Filtro+de+Linha']
  };

  // Transforma um item da lista reserva no mesmo formato que vem do banco
  // (os nomes dos campos são os das colunas da tabela products).
  function fallbackProduct(productId) {
    const data = fallback[productId];
    if (!data) return null;
    return {
      id: productId,
      name: data[0],
      category: data[1],
      price: data[2],
      image_url: 'https://placehold.co/600x400/f5f5f7/1d1d1f/png?text=' + data[3],
      description: 'Conheça os detalhes deste produto TelaMax.',
      installments: 'Consulte as condições de pagamento.',
      specifications: ''
    };
  }

  // 2699 -> "R$ 2.699,00" (formato de dinheiro do Brasil)
  function money(value) {
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  // Atalho para criar um elemento com classe e texto em uma linha só.
  // textContent coloca o texto como texto puro (nunca como HTML).
  function create(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  }

  // Avisa leitores de tela que o carregamento terminou (aria-busy="false").
  function done() {
    container.setAttribute('aria-busy', 'false');
  }

  // Mensagem de erro com uma saída: links para as duas categorias,
  // para a pessoa não ficar presa numa página vazia.
  function showError(text) {
    container.innerHTML = '';
    const box = create('div', 'detail-status');
    const message = create('p', 'detail-status-title', text);
    const hint = create('p', null, 'Veja os produtos disponíveis:');
    const links = create('div', 'detail-status-links');
    const tvs = create('a', 'btn btn-primary', 'TVs');
    tvs.href = 'category_tvs.html';
    const accessories = create('a', 'btn btn-ghost', 'Acessórios');
    accessories.href = 'category_acessories.html';
    links.append(tvs, accessories);
    box.append(message, hint, links);
    container.appendChild(box);
    done();
  }

  // Preenche a trilha "Início / TVs / Nome do produto".
  function fillBreadcrumb(product) {
    const isTv = product.category === 'tvs';
    const category = document.querySelector('.breadcrumb-category');
    category.textContent = isTv ? 'TVs' : 'Acessórios';
    category.href = isTv ? 'category_tvs.html' : 'category_acessories.html';
    category.hidden = false;
    document.querySelector('.breadcrumb-category-sep').hidden = false;
    // aria-current="page" diz ao leitor de tela que este é o item atual
    const current = document.querySelector('.breadcrumb-current');
    current.textContent = product.name;
    current.setAttribute('aria-current', 'page');
  }

  // As especificações são cadastradas uma por linha, no formato
  // "Tela: 55 polegadas". Aqui cada linha vira um par nome/valor em uma
  // lista de definições (<dl>): <dt> é o nome e <dd> é o valor.
  // A expressão /\r?\n|\\n/ quebra tanto em quebras de linha de verdade
  // quanto no texto "\n" literal (que aparece se o UPDATE do schema.sql
  // ainda não foi rodado no banco).
  function createSpecs(text) {
    const lines = text.split(/\r?\n|\\n/)
      .map(function (line) { return line.trim(); })
      .filter(Boolean);
    if (lines.length === 0) return null;

    const list = create('dl', 'detail-specs');
    lines.forEach(function (line) {
      const row = create('div', 'detail-spec');
      // separa no primeiro ":"; linhas sem ":" ocupam a linha toda
      const colon = line.indexOf(':');
      if (colon > 0) {
        row.append(
          create('dt', null, line.slice(0, colon).trim()),
          create('dd', null, line.slice(colon + 1).trim())
        );
      } else {
        row.appendChild(create('dd', 'detail-spec-full', line));
      }
      list.appendChild(row);
    });
    return list;
  }

  // Desenha o produto na página.
  function render(product) {
    container.innerHTML = '';

    // O main.js lê estes data-* quando o botão "Adicionar ao carrinho"
    // é clicado (do mesmo jeito que nos cards das listas)
    container.dataset.id = product.id;
    container.dataset.name = product.name;
    container.dataset.price = product.price;
    container.dataset.image = product.image_url;

    // ----- coluna da imagem -----
    const media = create('div', 'detail-media');
    if (product.badge) media.appendChild(create('span', 'badge', product.badge));
    const image = create('img', 'detail-image');
    image.src = product.image_url;
    image.alt = product.name;
    // width e height reservam o espaço da imagem antes dela baixar
    // (a página não "pula" quando a imagem aparece)
    image.width = 600;
    image.height = 400;
    media.appendChild(image);

    // ----- coluna do texto -----
    const content = create('div', 'detail-content');
    const title = create('h1', null, product.name);
    content.appendChild(title);

    // resumo/descrição: usa a descrição longa e, se não tiver, o resumo
    const text = product.description || product.summary;
    if (text) content.appendChild(create('p', 'detail-description', text));

    // preço: o antigo riscado (<s>) e o atual em destaque, como nos cards
    const prices = create('div', 'detail-prices');
    if (product.old_price && Number(product.old_price) > Number(product.price)) {
      const old = create('s', 'detail-old-price', money(product.old_price));
      // o leitor de tela não fala "riscado", então avisamos com texto escondido
      old.prepend(create('span', 'visually-hidden', 'De '));
      prices.appendChild(old);
    }
    const price = create('p', 'detail-price', money(product.price) + ' ');
    price.appendChild(create('small', null, 'à vista'));
    prices.appendChild(price);
    if (product.installments) prices.appendChild(create('p', 'detail-installments', product.installments));
    content.appendChild(prices);

    // botão de compra: mesma classe dos cards, o main.js cuida do clique
    const add = create('button', 'btn btn-primary add-to-cart', 'Adicionar ao carrinho');
    add.type = 'button';
    content.appendChild(add);

    // especificações (só aparecem se houver alguma cadastrada)
    const specs = product.specifications ? createSpecs(product.specifications) : null;
    if (specs) {
      content.append(create('h2', 'detail-specs-title', 'Especificações'), specs);
    }

    container.append(media, content);
    fillBreadcrumb(product);
    document.title = product.name + ' | TelaMax';
    done();
  }

  // Usa a lista reserva; se o id também não existir nela, mostra o erro.
  function renderFallback(errorText) {
    const localProduct = fallbackProduct(id);
    if (localProduct) render(localProduct);
    else showError(errorText);
  }

  // ----- Início -----
  if (!id) {
    showError('Nenhum produto foi escolhido.');
    return;
  }

  // Supabase não configurado: vai direto para a lista reserva
  if (!window.SupabaseApi || !window.SupabaseApi.isConfigured()) {
    renderFallback('Produto não encontrado.');
    return;
  }

  // Supabase configurado: busca o produto no banco.
  // .then roda quando a resposta chega; .catch roda se der erro de rede.
  window.SupabaseApi.getProduct(id)
    .then(function (product) {
      if (product) render(product);
      else showError('Produto não encontrado. Ele pode ter saído do catálogo.');
    })
    .catch(function (error) {
      // sem conexão com o banco: mostra os dados reservas em vez de um erro
      console.error('Não foi possível carregar o produto:', error);
      renderFallback('Não foi possível carregar este produto. Tente de novo em instantes.');
    });
})();
