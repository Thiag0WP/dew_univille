// =====================================================================
// main.js — funcionalidades usadas em TODAS as páginas do site
// =====================================================================
// Funcionalidades comuns a todas as páginas:
// menu do celular, modo escuro, carrinho, busca/ordenação, voltar ao topo e avisos
//
// Além disso, na página inicial ele cuida do scrollytelling ("Monte seu
// cinema em casa"), da tela de pixels QLED x OLED do passo 3, das seções
// que aparecem ao rolar, dos efeitos de fundo e da transição entre páginas.
//
// Este arquivo é carregado no fim do <body>, então quando ele roda todo o
// HTML já existe e podemos buscar os elementos com querySelector.
//
// Ordem do arquivo:
//   1. Utilitários (funções pequenas usadas em vários lugares)
//   2. Avisos (toast)
//   3. Menu do celular
//   4. Modo escuro
//   5. Carrinho
//   6. Busca e ordenação dos produtos
//   7. Barra de progresso, header e botão "voltar ao topo"
//   8. Tela de pixels do passo 3 (QLED x OLED)
//   9. Scrollytelling (a TV que muda conforme a rolagem)
//  10. Seções aparecendo ao rolar
//  11. Efeitos de fundo (manchas coloridas e luz do mouse)
//  12. Luz que segue o mouse dentro dos cards
//  13. Transição suave entre as páginas

// ---------- Utilitários ----------

// true quando a pessoa ativou "reduzir movimento" no sistema (acessibilidade:
// algumas pessoas passam mal com animações). Usamos essa variável para
// desligar as animações feitas em JavaScript; as do CSS são desligadas
// no próprio CSS com @media (prefers-reduced-motion: reduce).
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Formata um número como dinheiro brasileiro: 2999.9 -> "R$ 2.999,90"
// toLocaleString já sabe usar vírgula, ponto e o símbolo R$ do Brasil.
function formatMoney(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Lê um valor salvo no localStorage (armazenamento do navegador que
// sobrevive a recarregar a página). O localStorage só guarda texto, então
// salvamos em JSON e aqui transformamos o texto de volta em objeto/lista
// com JSON.parse. Se não existir nada salvo (ou der erro), devolve "fallback".
function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (e) {
    return fallback;
  }
}

// Salva um valor no localStorage, transformando em texto com JSON.stringify.
function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // sem acesso ao localStorage: o carrinho vale só nesta página
  }
}

// ---------- Avisos (toast) ----------
// O "toast" é a mensagem que aparece no rodapé da tela por alguns segundos
// (ex.: "TV adicionada ao carrinho"). O elemento <div class="toast"> já
// existe no HTML; aqui só trocamos o texto e mostramos/escondemos.
const toast = document.querySelector('.toast');
// guarda o "timer" do setTimeout para poder cancelar se vier outro aviso
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  // a classe "show" faz o toast subir e aparecer (transição no CSS)
  toast.classList.add('show');
  // se já havia um aviso esperando para sumir, cancela aquele timer,
  // senão o aviso novo sumiria antes da hora
  clearTimeout(toastTimer);
  // depois de 2,5 segundos (2500 ms) o aviso some
  toastTimer = setTimeout(function () {
    toast.classList.remove('show');
  }, 2500);
}

// ---------- Menu do celular ----------
// No celular os links do menu ficam escondidos e aparecem ao tocar no
// botão de "hambúrguer" (as três linhas). No computador o botão some (CSS).
const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.getElementById('main-nav');

menuToggle.addEventListener('click', function () {
  // toggle coloca a classe se não tiver e tira se tiver;
  // ele devolve true se a classe ficou colocada (menu aberto)
  const open = mainNav.classList.toggle('open');
  // aria-expanded avisa leitores de tela (pessoas cegas) se o menu está aberto
  menuToggle.setAttribute('aria-expanded', open);
});

// fecha o menu ao escolher um link
// Em vez de colocar um evento em cada link, colocamos um só no <nav>:
// o clique "sobe" do link até o nav (isso se chama delegação de eventos).
// event.target é o elemento exato que foi clicado.
mainNav.addEventListener('click', function (event) {
  if (event.target.tagName === 'A') {
    mainNav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', false);
  }
});

// ---------- Modo escuro ----------
// O tema escuro funciona pelo atributo data-theme="dark" na tag <html>:
// o CSS tem um bloco [data-theme="dark"] { ... } que troca as variáveis
// de cor. O theme.js já aplicou o tema salvo; aqui é só o botão da lua/sol.
document.querySelector('.theme-toggle').addEventListener('click', function () {
  // document.documentElement = a tag <html>
  const root = document.documentElement;
  // se agora NÃO está escuro, então o clique vai deixar escuro
  const dark = root.getAttribute('data-theme') !== 'dark';

  if (dark) {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.removeAttribute('data-theme');
  }
  // salva a escolha para as outras páginas e para a próxima visita
  try {
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  } catch (e) {
    // tema não fica salvo, mas continua funcionando
  }
});

// ---------- Carrinho ----------
// O carrinho é uma lista de objetos { id, name, price, image, qty }.
// Ela fica salva no localStorage com o nome 'cart', por isso continua
// cheia mesmo trocando de página ou recarregando.
let cart = readStorage('cart', []);

// elementos do painel lateral do carrinho (o "drawer")
const cartDrawer = document.getElementById('cart-drawer');
// fundo escuro atrás do carrinho; clicar nele fecha o carrinho
const overlay = document.querySelector('.overlay');
const cartItems = document.querySelector('.cart-items');
const cartEmpty = document.querySelector('.cart-empty');
const cartFooter = document.querySelector('.cart-footer');
// bolinha com a quantidade em cima do ícone do carrinho
const cartCount = document.querySelector('.cart-count');
const cartTotal = document.querySelector('.cart-total strong');

function openCart() {
  // a classe "open" faz o painel deslizar para dentro da tela (CSS)
  cartDrawer.classList.add('open');
  cartDrawer.setAttribute('aria-hidden', false);
  overlay.classList.add('show');
  // trava a rolagem da página enquanto o carrinho está aberto
  document.body.classList.add('no-scroll');
}

function closeCart() {
  cartDrawer.classList.remove('open');
  cartDrawer.setAttribute('aria-hidden', true);
  overlay.classList.remove('show');
  document.body.classList.remove('no-scroll');
}

// Redesenha a lista do carrinho a partir do array "cart".
// Sempre que o carrinho muda, chamamos esta função: ela apaga a lista
// antiga e cria tudo de novo. É simples e evita a tela ficar diferente
// dos dados.
function renderCart() {
  let count = 0;
  let total = 0;
  // apaga os itens que estavam na tela
  cartItems.innerHTML = '';

  cart.forEach(function (item) {
    count += item.qty;
    total += item.qty * item.price;

    // cria um <li> para o produto
    const li = document.createElement('li');
    li.className = 'cart-item';
    // monta o HTML do item como texto. Os botões têm data-action para
    // sabermos depois qual foi clicado (aumentar ou diminuir).
    li.innerHTML =
      '<img src="' + item.image + '" alt="">' +
      '<div>' +
      '  <p class="cart-item-name"></p>' +
      '  <p class="cart-item-price">' + formatMoney(item.price) + '</p>' +
      '</div>' +
      '<div class="cart-qty">' +
      '  <button type="button" data-action="decrease" aria-label="Diminuir quantidade">-</button>' +
      '  <span>' + item.qty + '</span>' +
      '  <button type="button" data-action="increase" aria-label="Aumentar quantidade">+</button>' +
      '</div>';
    // o nome entra com textContent (e não dentro do innerHTML) por
    // segurança: textContent nunca é interpretado como HTML
    li.querySelector('.cart-item-name').textContent = item.name;
    // dataset.id vira o atributo data-id="..." no <li>
    li.dataset.id = item.id;
    cartItems.appendChild(li);
  });

  // hidden = true esconde o elemento (igual a display: none)
  // carrinho vazio: mostra "Seu carrinho está vazio" e esconde o total
  cartEmpty.hidden = cart.length > 0;
  cartFooter.hidden = cart.length === 0;
  // a bolinha do contador só aparece se tiver pelo menos 1 item
  cartCount.hidden = count === 0;
  cartCount.textContent = count;
  cartTotal.textContent = formatMoney(total);
  // salva o carrinho atualizado
  writeStorage('cart', cart);
}

function addToCart(product) {
  // find devolve o primeiro item que satisfaz a condição (ou undefined)
  const existing = cart.find(function (item) {
    return item.id === product.id;
  });

  // se o produto já está no carrinho, só aumenta a quantidade
  if (existing) {
    existing.qty++;
  } else {
    cart.push(product);
  }
  renderCart();

  // pequena animação no contador do carrinho
  // Truque para repetir uma animação CSS: tira a classe, força o navegador
  // a recalcular o layout (ler offsetWidth faz isso) e coloca de novo.
  // Sem a linha do meio, o navegador juntaria as duas mudanças e a
  // animação não recomeçaria.
  cartCount.classList.remove('bump');
  void cartCount.offsetWidth;
  cartCount.classList.add('bump');
}

// abrir e fechar o carrinho
document.querySelector('.cart-toggle').addEventListener('click', openCart);
document.querySelector('.cart-close').addEventListener('click', closeCart);
overlay.addEventListener('click', closeCart);

// a tecla Esc também fecha o carrinho
document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape') closeCart();
});

// botões + e - dentro do carrinho
// Os itens são recriados toda hora pelo renderCart, então usamos de novo
// a delegação de eventos: um único evento na lista inteira.
cartItems.addEventListener('click', function (event) {
  // data-action="increase" ou "decrease"; se clicou em outra coisa, ignora
  const action = event.target.dataset.action;
  if (!action) return;

  // closest sobe pelos "pais" do botão até achar o <li class="cart-item">
  const id = event.target.closest('.cart-item').dataset.id;
  const item = cart.find(function (i) { return i.id === id; });

  item.qty += action === 'increase' ? 1 : -1;
  // quantidade zerou: tira o produto do carrinho
  // (filter cria uma lista nova só com os itens que passam na condição)
  if (item.qty <= 0) {
    cart = cart.filter(function (i) { return i.id !== id; });
  }
  renderCart();
});

// "Finalizar compra": esvazia o carrinho e agradece (compra simulada)
document.querySelector('.cart-checkout').addEventListener('click', function () {
  cart = [];
  renderCart();
  closeCart();
  showToast('Pedido finalizado! Obrigado pela compra.');
});

// botões "Adicionar ao carrinho" dos produtos
// Cada <li class="product"> do HTML guarda os dados do produto em
// atributos data-*: data-id, data-name, data-price e data-image.
// No JavaScript eles aparecem em element.dataset (dataset.name etc.).
document.querySelectorAll('.add-to-cart').forEach(function (button) {
  button.addEventListener('click', function () {
    // o produto é o "pai" mais próximo do botão com a classe .product
    const product = button.closest('.product');

    addToCart({
      id: product.dataset.id,
      name: product.dataset.name,
      // os atributos são sempre texto; Number transforma "2999.9" em número
      price: Number(product.dataset.price),
      image: product.dataset.image,
      qty: 1
    });
    showToast(product.dataset.name + ' adicionado ao carrinho');

    // o botão vira "Adicionado!" (verde, pelo CSS) por 1,2 segundo
    button.textContent = 'Adicionado!';
    button.classList.add('added');
    setTimeout(function () {
      button.textContent = 'Adicionar ao carrinho';
      button.classList.remove('added');
    }, 1200);
  });
});

// desenha o carrinho salvo assim que a página abre
renderCart();

// ---------- Busca e ordenação dos produtos ----------
// Só existe nas páginas de categoria (TVs e Acessórios). Na página inicial
// esses elementos não existem, querySelector devolve null e o "if" pula.
const searchInput = document.querySelector('.products-search');
const sortSelect = document.querySelector('.products-sort');

if (searchInput && sortSelect) {
  const list = document.querySelector('.products-list');
  // Array.from transforma a lista de elementos em um array de verdade,
  // para podermos usar slice/sort. Guardamos a ordem ORIGINAL aqui.
  const products = Array.from(list.querySelectorAll('.product'));
  const countText = document.querySelector('.products-count');
  // mensagem "Nenhum produto encontrado"
  const emptyText = document.querySelector('.products-empty');

  function updateProducts() {
    // texto buscado, sem espaços nas pontas e em minúsculas
    // (assim "TV" e "tv" encontram a mesma coisa)
    const term = searchInput.value.trim().toLowerCase();
    const order = sortSelect.value;
    // slice() sem argumentos faz uma cópia: ordenamos a cópia para
    // poder voltar à ordem original ("Relevância")
    const sorted = products.slice();

    // sort recebe uma função que compara dois itens:
    // resultado negativo = a vem antes; positivo = b vem antes.
    // a.dataset.price - b.dataset.price: o "-" converte os textos em número.
    if (order === 'price-asc') {
      sorted.sort(function (a, b) { return a.dataset.price - b.dataset.price; });
    } else if (order === 'price-desc') {
      sorted.sort(function (a, b) { return b.dataset.price - a.dataset.price; });
    } else if (order === 'name') {
      // localeCompare compara textos respeitando acentos do português
      sorted.sort(function (a, b) { return a.dataset.name.localeCompare(b.dataset.name); });
    }

    let visible = 0;
    sorted.forEach(function (product) {
      // mostra o produto se o nome contém o texto buscado
      const show = product.dataset.name.toLowerCase().includes(term);
      product.hidden = !show;
      if (show) visible++;
      // appendChild de um elemento que JÁ está na página MOVE ele para o
      // fim da lista; fazendo isso na ordem do array, a lista fica ordenada
      list.appendChild(product);
    });

    // "1 produto" no singular, "2 produtos" no plural
    countText.textContent = visible + (visible === 1 ? ' produto' : ' produtos');
    emptyText.hidden = visible > 0;
  }

  // "input" dispara a cada letra digitada; "change" quando escolhe outra opção
  searchInput.addEventListener('input', updateProducts);
  sortSelect.addEventListener('change', updateProducts);
}

// ---------- Voltar ao topo ----------
// Esta parte também cuida de outras duas coisas ligadas à rolagem:
// a barrinha azul de progresso embaixo do header e a sombra do header.
const backToTop = document.querySelector('.back-to-top');

// cria a barra de progresso pelo JavaScript e coloca dentro do <header>
// (ela é só enfeite, por isso não está escrita no HTML)
const siteHeader = document.querySelector('header');
const scrollProgress = document.createElement('div');
scrollProgress.className = 'scroll-progress';
siteHeader.appendChild(scrollProgress);

function onScroll() {
  // quanto dá para rolar no total: altura da página - altura da janela
  const max = document.documentElement.scrollHeight - window.innerHeight;
  // scaleX vai de 0 (barra vazia) a 1 (barra cheia), proporcional à rolagem.
  // Usar transform é mais leve para o navegador do que mudar a largura.
  scrollProgress.style.transform = 'scaleX(' + (max > 0 ? window.scrollY / max : 0) + ')';
  // header ganha a classe "scrolled" (fica mais opaco) ao sair do topo
  siteHeader.classList.toggle('scrolled', window.scrollY > 10);
  // o botão de voltar ao topo só aparece depois de rolar 400px
  backToTop.classList.toggle('visible', window.scrollY > 400);
}

// passive: true promete ao navegador que não vamos cancelar a rolagem,
// o que deixa a rolagem mais suave no celular
window.addEventListener('scroll', onScroll, { passive: true });
// roda uma vez já ao abrir (a página pode abrir no meio, ex.: ao recarregar)
onScroll();

backToTop.addEventListener('click', function () {
  // behavior: 'smooth' faz a rolagem animada até o topo
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ---------- Passo 3: tela de pixels (QLED x OLED) desenhada no canvas ----------
// A imagem é uma grade fixa de 120 x 68 pixels (uma cena noturna com lua).
// Ao entrar no passo 3 a câmera dá zoom até os pixels ficarem grandes;
// o mouse/dedo apaga pixels e alguns se apagam sozinhos de vez em quando.
//
// Como funciona um <canvas>: é uma área de desenho. Pelo JavaScript pegamos
// o "contexto 2D" (ctx) e mandamos desenhar retângulos, imagens, linhas...
// Para ter animação, apagamos e redesenhamos tudo várias vezes por segundo
// (cerca de 60) usando requestAnimationFrame.
//
// Esta função recebe o elemento .tech-zoom e devolve um objeto com três
// comandos: start() (começa e faz o zoom), stop() (para de desenhar) e
// sweepTo('qled' | 'oled') (passa a linha de comparação).
function createPixelScreen(container) {
  const canvas = container.querySelector('.tech-canvas');
  const ctx = canvas.getContext('2d');
  // tamanho da cena em pixels "de TV" (proporção 16:9, como uma TV)
  const COLS = 120;
  const ROWS = 68;
  const ZOOM = 3.8;            // quanto a câmera aproxima
  const ZOOM_DELAY = 500;      // ms mostrando a imagem inteira antes do zoom
  const ZOOM_TIME = 2000;      // ms
  const SWEEP_TIME = 1100;     // ms da linha de comparação

  // cor de cada pixel da cena (0 a 1) e a luz de fundo do mini-LED
  // Float32Array é um array só de números, mais rápido que um array comum.
  // A grade 2D é guardada "em fila": o pixel da coluna i e linha j fica na
  // posição k = j * COLS + i (linha 0 primeiro, depois linha 1, ...).
  const red = new Float32Array(COLS * ROWS);
  const green = new Float32Array(COLS * ROWS);
  const blue = new Float32Array(COLS * ROWS);
  const backlight = new Float32Array(COLS * ROWS);
  // quanto tempo cada pixel ainda fica apagado (0 = aceso)
  // valores acima de 1 significam "apagado e ainda esperando para voltar"
  const off = new Float32Array(COLS * ROWS);

  // QLED: o painel LCD filtra a luz dos mini-LEDs, mas não bloqueia tudo:
  // perto de algo claro o preto fica acinzentado/azulado
  // Recebe o índice do pixel (k) e quanto ele está aceso (on, de 0 a 1) e
  // devolve [vermelho, verde, azul]. Os "+ 0.1", "+ 0.13" e "+ 0.25" são a
  // luz que vaza (mais no azul, porque os mini-LEDs são azulados).
  function qledColor(k, on) {
    const light = backlight[k] * on;
    return [
      (red[k] * 0.9 + 0.1) * light,
      (green[k] * 0.9 + 0.13) * light,
      (blue[k] * 0.85 + 0.25) * light
    ];
  }

  // Transição suave entre 0 e 1: devolve 0 quando x <= a, 1 quando x >= b
  // e uma curva em "S" no meio. Serve para bordas e fades sem degraus.
  function smoothstep(a, b, x) {
    const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
    return t * t * (3 - 2 * t);
  }

  // Número "aleatório" entre 0 e 1 que é SEMPRE o mesmo para o mesmo (i, j).
  // Assim as estrelas ficam sempre no mesmo lugar. A conta com seno e
  // números quebrados é um truque clássico de computação gráfica: o
  // resultado parece bagunçado, mas é previsível.
  function random(i, j) {
    const n = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
    // fica só com a parte depois da vírgula (0 a 1)
    return n - Math.floor(n);
  }

  // monta a cena: céu preto, lua, estrelas, aurora e montanhas no horizonte
  // Os dois "for" passam por todos os pixels: j = linha, i = coluna.
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      // posição do centro do pixel em uma medida que não depende da grade:
      // x = 0 no meio da tela (negativo à esquerda), y = 0 no topo e 1 embaixo.
      // Os dois são divididos por ROWS para a lua sair redonda e não oval.
      const x = (i + 0.5 - COLS / 2) / ROWS;
      const y = (j + 0.5) / ROWS;
      // cor do pixel, começando preta; cada elemento da cena soma luz
      let r = 0;
      let g = 0;
      let b = 0;

      // céu levemente azul só lá em cima
      // sky vai de 1 no topo até 0 em 30% da altura
      if (y < 0.3) {
        const sky = 1 - y / 0.3;
        r += 0.03 * sky;
        g += 0.06 * sky;
        b += 0.2 * sky;
      }

      // estrelas
      // 0,7% dos pixels viram estrela, cada uma com um brilho diferente
      if (random(i, j) < 0.007) {
        const star = 0.45 + random(j, i) * 0.55;
        r += star;
        g += star;
        b += star * 0.9 + 0.1;
      }

      // aurora ondulando, mudando de cor ao longo da tela
      // wave é a altura do centro da faixa (uma onda de seno);
      // Math.exp(-(distância)²) dá uma faixa forte no centro que some
      // suavemente para cima e para baixo (curva de sino).
      const wave = 0.575 + 0.03 * Math.sin(x * 9);
      const aurora = Math.exp(-Math.pow((y - wave) / 0.018, 2));
      // hue vai de 0 (esquerda) a 1 (direita): verde-água -> rosa
      const hue = smoothstep(-0.5, 0.5, x);
      r += aurora * (0.1 + 0.8 * hue);
      g += aurora * (0.9 - 0.7 * hue);
      b += aurora * (0.6 + 0.3 * hue);

      // lua com crateras
      // Math.hypot = distância até o centro da lua (0, 0.47). Raio 0.08,
      // com a borda suavizada até 0.09. moon = 1 dentro, 0 fora.
      const moon = 1 - smoothstep(0.08, 0.09, Math.hypot(x, y - 0.47));
      if (moon > 0) {
        let shade = 1;
        // cada cratera é [x, y, raio]; dentro dela a lua fica mais escura
        [[-0.03, 0.45, 0.022], [0.035, 0.5, 0.016], [0.012, 0.415, 0.012], [-0.02, 0.515, 0.01]].forEach(function (c) {
          if (Math.hypot(x - c[0], y - c[1]) < c[2]) shade = 0.72;
        });
        // mistura a cor do céu com a cor da lua (branco amarelado)
        r = r * (1 - moon) + moon * shade;
        g = g * (1 - moon) + moon * 0.95 * shade;
        b = b * (1 - moon) + moon * 0.82 * shade;
      }

      // brilho do pôr do sol e montanhas pretas na frente
      // abaixo de 74% da altura começa um brilho laranja/rosa que cresce
      if (y > 0.74) {
        const glow = Math.pow((y - 0.74) / 0.14, 2);
        r += glow;
        g += glow * (0.35 + 0.2 * hue);
        b += glow * (0.25 + 0.3 * (1 - hue));
      }
      // ridge é a linha do topo das montanhas (soma de duas ondas);
      // tudo abaixo dela fica preto, formando a silhueta
      const ridge = 0.86 + 0.035 * Math.sin(x * 5 + 1) + 0.015 * Math.sin(x * 17);
      if (y > ridge) {
        r = 0;
        g = 0;
        b = 0;
      }

      // guarda a cor final, limitada a no máximo 1 (brilho máximo)
      const k = j * COLS + i;
      red[k] = Math.min(r, 1);
      green[k] = Math.min(g, 1);
      blue[k] = Math.min(b, 1);
    }
  }

  // mini-LED: cada LED acende pelo pixel mais claro da sua vizinhança,
  // por isso a luz "vaza" para as partes pretas (blooming)
  // Para cada pixel olhamos um quadrado de 7x7 em volta (di e dj de -3 a 3).
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      let light = 0;
      for (let dj = -3; dj <= 3; dj++) {
        for (let di = -3; di <= 3; di++) {
          // ni, nj = coluna e linha do vizinho
          const ni = i + di;
          const nj = j + dj;
          // vizinho fora da tela: pula
          if (ni < 0 || nj < 0 || ni >= COLS || nj >= ROWS) continue;
          const n = nj * COLS + ni;
          // brilho do vizinho = o canal de cor mais forte dele
          const lum = Math.max(red[n], green[n], blue[n]);
          const distance = Math.hypot(di, dj);
          // o próprio pixel conta 100%; vizinhos contam menos quanto mais longe
          const reach = distance === 0 ? 1 : 0.6 * (1 - distance / 3.5);
          light = Math.max(light, lum * reach);
        }
      }
      // 0.04 é o mínimo: o mini-LED nunca desliga totalmente
      backlight[j * COLS + i] = 0.04 + light * 0.96;
    }
  }

  // imagens pequenas (1 pixel por pixel da cena) usadas no começo do zoom
  // Quando os pixels ainda estão minúsculos na tela, desenhar cada
  // subpixel seria pesado e nem daria para ver. Então criamos um canvas
  // escondido de 120x68 e desenhamos ele esticado, de uma vez só.
  // colorOf é uma função que diz a cor [r, g, b] de cada pixel k.
  function makeImage(colorOf) {
    const image = document.createElement('canvas');
    image.width = COLS;
    image.height = ROWS;
    const imageCtx = image.getContext('2d');
    // ImageData é a lista crua dos pixels: 4 números por pixel
    // (vermelho, verde, azul e opacidade), cada um de 0 a 255
    const data = imageCtx.createImageData(COLS, ROWS);
    for (let k = 0; k < COLS * ROWS; k++) {
      const c = colorOf(k);
      data.data[k * 4] = c[0] * 255;
      data.data[k * 4 + 1] = c[1] * 255;
      data.data[k * 4 + 2] = c[2] * 255;
      data.data[k * 4 + 3] = 255;
    }
    imageCtx.putImageData(data, 0, 0);
    return image;
  }

  // versão pequena da cena em cada tecnologia
  const oledImage = makeImage(function (k) { return [red[k], green[k], blue[k]]; });
  const qledImage = makeImage(function (k) {
    return qledColor(k, 1);
  });

  // brilho redondo de um mini-LED, desenhado uma vez e reaproveitado
  // É um canvas de 64x64 com um degradê circular: branco no centro,
  // azul no meio e transparente na borda. Depois "carimbamos" ele em cada
  // pixel com drawImage, o que é bem mais rápido que criar um degradê por LED.
  const led = document.createElement('canvas');
  led.width = 64;
  led.height = 64;
  const ledCtx = led.getContext('2d');
  // createRadialGradient(xInicio, yInicio, raioInicio, xFim, yFim, raioFim)
  const ledGradient = ledCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
  // addColorStop(posição de 0 a 1, cor)
  ledGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  ledGradient.addColorStop(0.12, 'rgba(235, 245, 255, 1)');
  ledGradient.addColorStop(0.28, 'rgba(150, 200, 255, 0.7)');
  ledGradient.addColorStop(0.55, 'rgba(60, 120, 255, 0.22)');
  ledGradient.addColorStop(1, 'rgba(40, 90, 255, 0)');
  ledCtx.fillStyle = ledGradient;
  ledCtx.fillRect(0, 0, 64, 64);

  // estado da animação
  let width = 0;               // largura do canvas na tela (px do CSS)
  let height = 0;              // altura do canvas na tela
  let frame = 0;               // número do requestAnimationFrame (para cancelar)
  let lastTime = 0;            // horário do quadro anterior (para medir o tempo)
  let zoomStart = 0;           // quando o zoom começou
  let reveal = 0;              // 0 = só QLED, 1 = só OLED
  let sweepFrom = 0;           // reveal no início da linha de comparação
  let sweepTarget = 0;         // reveal no fim da linha de comparação
  let sweepStart = -Infinity;  // quando a linha começou (-Infinity = nunca)
  let pointer = null;          // última posição do mouse/dedo (ou null)

  // Ajusta a resolução do canvas ao tamanho dele na tela.
  // Telas "retina" têm 2 ou 3 pixels físicos para cada pixel do CSS
  // (devicePixelRatio). Criamos o canvas com mais pixels para o desenho
  // ficar nítido, limitado a 2x para não pesar.
  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = container.clientWidth;
    height = container.clientHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    // a partir daqui, desenhamos usando medidas do CSS e o canvas
    // multiplica tudo por "ratio" sozinho
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  // Curva de aceleração: começa devagar, acelera no meio e freia no fim.
  // Recebe t de 0 a 1 (progresso no tempo) e devolve 0 a 1 (progresso suave).
  function easeInOut(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // tamanho atual de cada pixel na tela e onde a grade começa
  // "now" é o horário atual em milissegundos. Devolve:
  //   cell = tamanho de um pixel da cena em px da tela
  //   x, y = onde fica o canto superior esquerdo da grade (pode ser negativo,
  //          ou seja, fora da tela, quando estamos com zoom)
  function camera(now) {
    // no início a cena inteira cabe na tela
    const startCell = Math.max(width / COLS, height / ROWS);
    // t = progresso do zoom no tempo (0 antes de começar, 1 quando acabou);
    // com "reduzir movimento" o zoom já começa pronto
    const t = reduceMotion ? 1 : Math.min(Math.max((now - zoomStart - ZOOM_DELAY) / ZOOM_TIME, 0), 1);
    const progress = easeInOut(t);
    // Math.pow(ZOOM, progress) vai de 1 a 3.8. Usar potência (e não uma
    // conta linear) faz o zoom parecer constante, como uma câmera real.
    const cell = startCell * Math.pow(ZOOM, progress);
    // centraliza a grade na tela
    return { cell: cell, x: width / 2 - (COLS / 2) * cell, y: height / 2 - (ROWS / 2) * cell };
  }

  // quanto o pixel está aceso (apagado volta a acender suavemente)
  // off >= 1 -> 0 (apagado); off = 0 -> 1 (aceso)
  function lit(k) {
    return 1 - smoothstep(0, 1, off[k]);
  }

  // cores dos subpixels: vermelho, verde e azul (tons usados pela Apple)
  const SUBPIXEL_COLORS = [[255, 69, 58], [48, 209, 88], [10, 132, 255]];

  // faixa de pixels da grade que aparece entre from e to
  // Só desenhamos o que aparece na tela; com zoom, a maior parte da grade
  // fica fora e não precisa ser desenhada (economiza muito trabalho).
  // margin desenha alguns pixels a mais nas bordas (o brilho do LED vaza).
  function visibleRange(cam, from, to, margin) {
    const c = cam.cell;
    return {
      firstI: Math.max(0, Math.floor((from - cam.x) / c) - margin),
      lastI: Math.min(COLS - 1, Math.floor((to - cam.x) / c) + margin),
      firstJ: Math.max(0, Math.floor(-cam.y / c) - margin),
      lastJ: Math.min(ROWS - 1, Math.floor((height - cam.y) / c) + margin)
    };
  }

  // subpixels vermelho, verde e azul de um pixel
  // Cada pixel de uma TV é formado por 3 barrinhas (R, G e B) lado a lado.
  // values = brilho de cada barrinha (0 a 1); alpha = opacidade geral.
  function drawSubpixels(cam, i, j, values, alpha) {
    const c = cam.cell;
    // canto da primeira barrinha, com uma pequena margem dentro do pixel
    const left = cam.x + i * c + c * 0.07;
    const top = cam.y + j * c + c * 0.1;
    for (let s = 0; s < 3; s++) {
      const v = values[s] * alpha;
      // barrinha quase apagada: nem desenha (o fundo já é preto)
      if (v < 0.015) continue;
      const color = SUBPIXEL_COLORS[s];
      // cor da barrinha escurecida pelo brilho v
      ctx.fillStyle = 'rgb(' + Math.round(color[0] * v) + ',' + Math.round(color[1] * v) + ',' + Math.round(color[2] * v) + ')';
      // cada barrinha tem 24% da largura e 80% da altura do pixel
      ctx.fillRect(left + s * c * 0.3, top, c * 0.24, c * 0.8);
    }
  }

  // OLED: cada subpixel tem luz própria; apagado é preto de verdade
  function drawOled(cam, from, to, alpha) {
    const range = visibleRange(cam, from, to, 0);

    // brilho suave da luz emitida, por baixo dos subpixels
    // 'lighter' SOMA as cores com o que já está desenhado (como luz real:
    // duas luzes juntas ficam mais claras)
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.22 * alpha;
    // imageSmoothingEnabled = true deixa a imagem pequena esticada borrada,
    // perfeita para parecer um brilho
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(oledImage, cam.x, cam.y, COLS * cam.cell, ROWS * cam.cell);
    ctx.globalAlpha = 1;

    for (let j = range.firstJ; j <= range.lastJ; j++) {
      for (let i = range.firstI; i <= range.lastI; i++) {
        const k = j * COLS + i;
        const on = lit(k);
        // pixel apagado no OLED = nada desenhado = preto absoluto
        if (on < 0.01) continue;
        drawSubpixels(cam, i, j, [red[k] * on, green[k] * on, blue[k] * on], alpha);
      }
    }
    // volta ao modo normal de desenho
    ctx.globalCompositeOperation = 'source-over';
  }

  // QLED: mini-LEDs brilhando atrás + painel LCD na frente
  function drawQled(cam, from, to, alpha) {
    const c = cam.cell;
    // o brilho de cada LED é maior que o pixel (2,3x) e invade os vizinhos
    const size = c * 2.3;
    const range = visibleRange(cam, from, to, 1);

    ctx.globalCompositeOperation = 'lighter';
    for (let j = range.firstJ; j <= range.lastJ; j++) {
      for (let i = range.firstI; i <= range.lastI; i++) {
        const k = j * COLS + i;
        // no mini-LED o pixel nunca apaga por completo: sobra um brilho
        const on = 0.15 + 0.85 * lit(k);
        const glow = backlight[k] * on * 0.85 * alpha;
        // carimba o brilho do LED centralizado no pixel
        if (glow > 0.01) {
          ctx.globalAlpha = glow;
          ctx.drawImage(led, cam.x + (i + 0.5) * c - size / 2, cam.y + (j + 0.5) * c - size / 2, size, size);
        }
        ctx.globalAlpha = 1;
        // e por cima, os subpixels do LCD (com a luz que vaza)
        drawSubpixels(cam, i, j, qledColor(k, on), alpha);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // desenha um dos modelos só na faixa [from, to) da tela
  // É assim que a comparação funciona: o OLED é desenhado do lado esquerdo
  // da linha e o QLED do lado direito.
  function drawSide(tech, cam, from, to) {
    // faixa sem largura: não tem o que desenhar
    if (to - from < 0.5) return;
    // save/restore guardam e devolvem as configurações do ctx;
    // clip() faz tudo que for desenhado depois ficar só dentro do retângulo
    ctx.save();
    ctx.beginPath();
    ctx.rect(from, 0, to - from, height);
    ctx.clip();

    // pixels pequenos demais: usa a imagem reduzida; depois troca pelos pixels desenhados um a um
    // detail = 0 quando o pixel tem até 6px, 1 a partir de 10px, e entre
    // os dois as duas versões se misturam (um "fade")
    const detail = smoothstep(6, 10, cam.cell);
    if (detail < 1) {
      ctx.globalAlpha = 1 - detail;
      // OLED sem suavização: a imagem esticada fica com quadradinhos nítidos;
      // QLED com suavização: fica borrado, como o brilho dos LEDs
      ctx.imageSmoothingEnabled = tech === 'qled';
      ctx.drawImage(tech === 'oled' ? oledImage : qledImage, cam.x, cam.y, COLS * cam.cell, ROWS * cam.cell);
    }
    if (detail > 0) {
      if (tech === 'oled') drawOled(cam, from, to, detail);
      else drawQled(cam, from, to, detail);
    }
    ctx.restore();
  }

  // apaga os pixels perto do ponto (x, y) da tela
  function erase(x, y, cam) {
    // qual modelo está aparecendo mais na tela agora
    const oled = reveal > 0.5;
    // raio da "borracha" em px: maior no QLED, porque lá a luz espalha
    const radius = oled ? 24 : 36;
    // quantos pixels da grade cabem no raio
    const reach = Math.ceil(radius / cam.cell);
    // coluna e linha do pixel embaixo do mouse
    const ci = Math.floor((x - cam.x) / cam.cell);
    const cj = Math.floor((y - cam.y) / cam.cell);

    // passa pelos pixels de um quadrado em volta do mouse...
    for (let j = cj - reach; j <= cj + reach; j++) {
      for (let i = ci - reach; i <= ci + reach; i++) {
        if (i < 0 || j < 0 || i >= COLS || j >= ROWS) continue;
        // ...mas só apaga os que estão dentro do círculo
        const distance = Math.hypot(cam.x + (i + 0.5) * cam.cell - x, cam.y + (j + 0.5) * cam.cell - y);
        if (distance > radius) continue;
        const k = j * COLS + i;
        // OLED apaga em bloco, com borda nítida; o mini-LED apaga em degradê
        // 1.6 = apagado e esperando ~0,9s antes de começar a reacender
        const amount = oled ? 1.6 : 1.6 * (1 - distance / radius);
        // Math.max para não "reacender" um pixel que já estava mais apagado
        off[k] = Math.max(off[k], amount);
      }
    }
  }

  // Desenha UM quadro da animação. O requestAnimationFrame chama esta
  // função de novo antes de cada atualização da tela (~60 vezes/segundo)
  // e passa "now", o horário atual em milissegundos.
  function draw(now) {
    // dt = segundos desde o quadro anterior (no máximo 0,05 para não dar
    // um "pulo" grande se a aba ficou parada)
    const dt = Math.min((now - (lastTime || now)) / 1000, 0.05);
    lastTime = now;

    // se o tamanho da TV mudou (ex.: girou o celular), ajusta o canvas
    if (container.clientWidth !== width || container.clientHeight !== height) resize();
    const cam = camera(now);

    // linha de comparação
    // sweep = progresso da linha (0 a 1); reveal anda de sweepFrom até sweepTarget
    const sweep = reduceMotion ? 1 : Math.min((now - sweepStart) / SWEEP_TIME, 1);
    reveal = sweepFrom + (sweepTarget - sweepFrom) * easeInOut(sweep);

    // pixels apagados voltam a acender aos poucos
    // multiplicar por dt faz a velocidade ser a mesma em qualquer computador
    for (let k = 0; k < off.length; k++) {
      if (off[k] > 0) off[k] = Math.max(off[k] - dt * 0.7, 0);
    }

    // alguns pixels se apagam sozinhos, um de cada vez
    // (só depois que o zoom terminou)
    if (!reduceMotion && now - zoomStart > ZOOM_DELAY + ZOOM_TIME) {
      // quantos pixels cabem na tela agora
      const visibleCols = width / cam.cell;
      const visibleRows = height / cam.cell;
      // chance proporcional ao tempo: em média 14 pixels por segundo
      const count = Math.random() < dt * 14 ? 1 : 0;
      for (let n = 0; n < count; n++) {
        // sorteia um pixel dentro da parte visível
        const i = Math.floor(COLS / 2 - visibleCols / 2 + Math.random() * visibleCols);
        const j = Math.floor(ROWS / 2 - visibleRows / 2 + Math.random() * visibleRows);
        if (i >= 0 && j >= 0 && i < COLS && j < ROWS) off[j * COLS + i] = 1.4 + Math.random() * 0.6;
      }
    }

    // pinta tudo de preto antes de desenhar o quadro novo
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // posição da linha em px: OLED à esquerda dela, QLED à direita
    const split = reveal * width;
    drawSide('oled', cam, 0, split);
    drawSide('qled', cam, split, width);

    // linha brilhante enquanto troca de modelo
    if (sweep < 1) {
      // aparece rápido no começo e some rápido no fim
      ctx.globalAlpha = Math.min(sweep * 6, (1 - sweep) * 6, 1);
      ctx.fillStyle = '#ffffff';
      // shadowBlur cria o brilho em volta da linha
      ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
      ctx.shadowBlur = 14;
      ctx.fillRect(split - 1, 0, 2, height);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;

    // agenda o próximo quadro
    frame = requestAnimationFrame(draw);
  }

  // segue o mouse/dedo, preenchendo o caminho entre um movimento e outro
  // Se o mouse anda rápido, os eventos chegam "pulando" vários pixels.
  // Por isso apagamos também pontos intermediários a cada 6px, formando
  // um traço contínuo.
  function track(event) {
    // posição do mouse dentro do canvas (clientX é relativo à janela)
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const cam = camera(performance.now());
    if (pointer) {
      const steps = Math.ceil(Math.hypot(x - pointer.x, y - pointer.y) / 6);
      for (let n = 1; n < steps; n++) {
        erase(pointer.x + (x - pointer.x) * n / steps, pointer.y + (y - pointer.y) * n / steps, cam);
      }
    }
    erase(x, y, cam);
    pointer = { x: x, y: y };
    // a classe "touched" esconde a dica "Passe o dedo ou o mouse..." (CSS)
    container.classList.add('touched');
  }

  // "pointer" funciona igual para mouse, dedo e caneta
  container.addEventListener('pointermove', track);
  container.addEventListener('pointerdown', track);
  // saiu da tela ou o toque foi cancelado (ex.: virou rolagem): esquece a posição
  container.addEventListener('pointerleave', function () { pointer = null; });
  container.addEventListener('pointercancel', function () { pointer = null; });
  // tirou o dedo: esquece a posição, senão o próximo toque ligaria os dois
  // pontos com um traço (no mouse não, porque ele continua em cima da tela)
  container.addEventListener('pointerup', function (event) {
    if (event.pointerType !== 'mouse') pointer = null;
  });

  // os comandos que o scrollytelling usa
  return {
    // começa a desenhar e faz o zoom (uma vez a cada chegada no passo 3)
    start: function () {
      cancelAnimationFrame(frame);
      zoomStart = performance.now();
      lastTime = 0;
      frame = requestAnimationFrame(draw);
    },
    // para de desenhar quando sai do passo 3 (economiza bateria)
    stop: function () {
      cancelAnimationFrame(frame);
      pointer = null;
    },
    // troca de modelo: a linha atravessa a tela sem repetir o zoom
    sweepTo: function (tech) {
      // começa de onde está (mesmo se a pessoa clicar no meio da troca)
      sweepFrom = reveal;
      sweepTarget = tech === 'oled' ? 1 : 0;
      sweepStart = performance.now();
    }
  };
}

// ---------- Scrollytelling: a TV muda conforme o passo visível ----------
// Scrollytelling = contar uma história conforme a pessoa rola a página.
// De um lado ficam os cartões de texto (passos 1 a 5) e do outro uma TV
// "grudada" na tela (position: sticky no CSS). Quando um cartão passa pelo
// meio da tela, mudamos o atributo data-step da TV e o CSS faz o resto
// (aumenta a TV, mostra a soundbar, pendura na parede...).
const storyVisual = document.querySelector('.story-visual');

// só existe na página inicial
if (storyVisual) {
  const steps = document.querySelectorAll('.story-step');
  // as bolinhas de progresso embaixo da TV
  const dots = document.querySelectorAll('.story-progress li');
  // texto que aparece no meio da tela da TV
  const label = document.querySelector('.tv-label');
  const techButtons = document.querySelectorAll('.tech-switch button');
  // cria a tela de pixels do passo 3 (função lá de cima)
  const pixels = createPixelScreen(document.querySelector('.tech-zoom'));
  // texto da TV em cada passo
  const labels = { 1: '55"', 2: '4K', 3: 'QLED · OLED', 4: '♪ Som surround', 5: 'Pronto!' };
  // no celular, distância (px) em que o cartão vai sumindo antes da TV
  const FADE_DISTANCE = 80;

  // Muda a história para o passo "step" ('1' a '5', como texto)
  function setStep(step) {
    const previous = storyVisual.dataset.step;
    // data-step na TV: o CSS usa [data-step="3"] etc. para mudar o visual.
    // O story-music.js também observa essa mudança para tocar a música.
    storyVisual.dataset.step = step;
    label.textContent = labels[step];

    // marca o cartão do passo atual
    steps.forEach(function (el) {
      el.classList.toggle('active', el.dataset.step === step);
    });
    // bolinha atual fica comprida ("active"); as anteriores, cinza ("done")
    dots.forEach(function (dot) {
      dot.classList.toggle('active', dot.dataset.step === step);
      dot.classList.toggle('done', Number(dot.dataset.step) < Number(step));
    });

    // ao chegar no passo 3 o zoom nos pixels acontece uma vez;
    // trocar entre QLED e OLED depois disso não repete o zoom
    if (step === '3' && previous !== '3') {
      pixels.start();
    } else if (step !== '3') {
      pixels.stop();
    }
  }

  // o passo ativo é o que está cruzando o meio da tela
  // IntersectionObserver avisa quando um elemento entra ou sai de uma área.
  // rootMargin '-50% 0px -50% 0px' encolhe essa área para uma linha fina
  // no meio da tela (tira 50% de cima e 50% de baixo). Assim, só o cartão
  // que está passando pelo meio conta como "visível".
  const storyObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) setStep(entry.target.dataset.step);
    });
  }, { rootMargin: '-50% 0px -50% 0px' });

  steps.forEach(function (step) {
    storyObserver.observe(step);
  });
  // começa no passo 1
  setStep('1');

  // mesma largura do @media do CSS em que a TV fica em cima e os cartões embaixo
  const mobileLayout = window.matchMedia('(max-width: 1023px)');

  // clicar numa bolinha rola até o passo dela
  dots.forEach(function (dot) {
    dot.querySelector('button').addEventListener('click', function () {
      // procura o cartão com o mesmo número da bolinha
      const step = document.querySelector('.story-step[data-step="' + dot.dataset.step + '"]');
      let top;

      if (mobileLayout.matches) {
        // no celular o cartão para logo abaixo da TV fixa, totalmente visível
        const card = step.querySelector('.story-card');
        // onde termina a TV grudada no topo: o "top" do sticky + a altura dela
        const stuckBottom = parseFloat(getComputedStyle(storyVisual).top) + storyVisual.offsetHeight;
        // getBoundingClientRect().top é a distância do cartão até o topo da
        // janela; somando scrollY temos a posição dele na página inteira
        top = window.scrollY + card.getBoundingClientRect().top - stuckBottom - FADE_DISTANCE - 10;
      } else {
        // no computador: centraliza o passo na tela
        const rect = step.getBoundingClientRect();
        top = window.scrollY + rect.top + rect.height / 2 - window.innerHeight / 2;
      }
      window.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });

  // QLED x OLED: uma linha atravessa a tela revelando o outro modelo
  techButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      // clicou no modelo que já está aparecendo: não faz nada
      if (storyVisual.dataset.tech === button.dataset.tech) return;

      // data-tech="qled" ou "oled" troca a legenda pelo CSS
      storyVisual.dataset.tech = button.dataset.tech;
      // aria-pressed marca o botão escolhido (e o CSS deixa ele branco)
      techButtons.forEach(function (b) {
        b.setAttribute('aria-pressed', b === button);
      });

      pixels.sweepTo(button.dataset.tech);
    });
  });

  // no celular, cada cartão some antes de chegar na TV fixa no topo
  function fadeSteps() {
    // onde termina a TV na tela
    const visualBottom = storyVisual.getBoundingClientRect().bottom;

    steps.forEach(function (step) {
      // no computador os cartões ficam ao lado da TV: tira o efeito
      // ('' apaga o estilo colocado pelo JavaScript)
      if (!mobileLayout.matches) {
        step.style.opacity = '';
        step.style.pointerEvents = '';
        return;
      }
      const cardTop = step.querySelector('.story-card').getBoundingClientRect().top;
      // começa a sumir pouco antes de encostar na TV
      // fade = 1 quando o cartão está a 80px ou mais da TV, e cai até 0
      // quando encosta nela
      const fade = Math.min(Math.max((cardTop - visualBottom) / FADE_DISTANCE, 0), 1);
      step.style.opacity = fade;
      // cartão quase invisível não pode receber cliques
      step.style.pointerEvents = fade < 0.1 ? 'none' : '';
    });
  }

  window.addEventListener('scroll', fadeSteps, { passive: true });
  window.addEventListener('resize', fadeSteps);
  fadeSteps();
}

// ---------- Seções aparecem suavemente ao rolar ----------
// Seções e cards começam transparentes e um pouco abaixo (classe "reveal"
// no CSS) e "sobem" quando entram na tela (classe "visible").
// A história fica de fora porque tem a própria animação.
const revealItems = document.querySelectorAll('main > section:not(.story), .feature, .category, .product');

const revealObserver = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) {
      const item = entry.target;
      // itens lado a lado aparecem em cascata
      // posição do item entre os irmãos, de 0 a 2 (% 3 = resto da divisão
      // por 3, porque a grade tem até 3 colunas); cada um espera 90ms a mais
      const index = Array.prototype.indexOf.call(item.parentElement.children, item) % 3;
      item.style.transitionDelay = (index * 90) + 'ms';
      item.classList.add('visible');
      // já apareceu: não precisa mais observar
      revealObserver.unobserve(item);
      // tira o atraso depois, para não atrasar o hover
      setTimeout(function () { item.style.transitionDelay = ''; }, 1200);
    }
  });
// threshold 0.1 = conta como visível quando 10% do item aparece
}, { threshold: 0.1 });

// a classe "reveal" é colocada pelo JavaScript: se o JS não carregar,
// nada fica invisível
revealItems.forEach(function (item) {
  item.classList.add('reveal');
  revealObserver.observe(item);
});

// ---------- Efeitos de fundo que acompanham o mouse e a rolagem ----------
// Cria, atrás de todo o conteúdo, uma grade de pontinhos, três manchas
// coloridas desfocadas (blobs) e uma luz que segue o mouse.

const effects = document.createElement('div');
effects.className = 'bg-effects';
// aria-hidden: é só enfeite, leitores de tela devem ignorar
effects.setAttribute('aria-hidden', 'true');
effects.innerHTML =
  '<div class="bg-grid"></div>' +
  '<span class="blob blob-1"></span>' +
  '<span class="blob blob-2"></span>' +
  '<span class="blob blob-3"></span>' +
  '<div class="cursor-glow"></div>';
// prepend coloca como PRIMEIRO filho do <body>
document.body.prepend(effects);

if (!reduceMotion) {
  const blobs = effects.querySelectorAll('.blob');
  const grid = effects.querySelector('.bg-grid');
  const glow = effects.querySelector('.cursor-glow');

  // "target" é onde o mouse está; "current" persegue o alvo aos poucos (inércia)
  const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const current = { x: target.x, y: target.y };
  let scrollCurrent = window.scrollY;

  document.addEventListener('pointermove', function (event) {
    // no celular (dedo) não tem cursor, então não mostra a luz
    if (event.pointerType !== 'mouse') return;
    target.x = event.clientX;
    target.y = event.clientY;
    glow.classList.add('active');
  });

  // mouse saiu da janela: apaga a luz
  document.documentElement.addEventListener('mouseleave', function () {
    glow.classList.remove('active');
  });

  function animate() {
    // a cada quadro, "current" anda 7% do caminho até o alvo.
    // Isso dá o movimento macio, com inércia (técnica chamada "lerp").
    current.x += (target.x - current.x) * 0.07;
    current.y += (target.y - current.y) * 0.07;
    scrollCurrent += (window.scrollY - scrollCurrent) * 0.07;

    // distância do mouse até o centro da tela
    const dx = current.x - window.innerWidth / 2;
    const dy = current.y - window.innerHeight / 2;

    // cada mancha se move em ritmo diferente, criando profundidade
    blobs.forEach(function (blob, i) {
      // manchas "mais perto" (i maior) se mexem mais com o mouse
      const depth = (i + 1) * 0.025;
      // seno e cosseno da rolagem fazem as manchas ondularem ao rolar
      const waveX = Math.cos(scrollCurrent / (700 + i * 150) + i) * 90;
      const waveY = Math.sin(scrollCurrent / (500 + i * 150) + i) * 140;
      // translate3d usa a placa de vídeo: animação mais leve
      blob.style.transform = 'translate3d(' + (dx * depth + waveX) + 'px, ' + (dy * depth + waveY) + 'px, 0)';
    });

    // a grade de pontos sobe mais devagar que a página (efeito parallax)
    grid.style.backgroundPosition = '0 ' + (-scrollCurrent * 0.15) + 'px';
    glow.style.transform = 'translate3d(' + current.x + 'px, ' + current.y + 'px, 0)';

    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

// ---------- Luz que segue o mouse dentro dos cards ----------
// Guarda a posição do mouse dentro do card nas variáveis CSS --mx e --my.
// O CSS usa essas variáveis num radial-gradient (.product::after etc.)
// para desenhar um brilho exatamente embaixo do mouse.
document.addEventListener('pointermove', function (event) {
  const card = event.target.closest('.product, .category a, .feature');
  if (!card) return;

  const rect = card.getBoundingClientRect();
  card.style.setProperty('--mx', (event.clientX - rect.left) + 'px');
  card.style.setProperty('--my', (event.clientY - rect.top) + 'px');
});

// ---------- Transição suave entre as páginas ----------
// Ao clicar num link para outra página do site, a página atual some em
// fade (classe "page-leave") e só depois de 280ms o navegador troca de página.
document.addEventListener('click', function (event) {
  const link = event.target.closest('a');
  // não é link, abre em outra aba (target) ou outro código já tratou o clique
  if (!link || link.target || event.defaultPrevented) return;
  // botão do meio/direito ou Ctrl/Cmd/Shift (abrir em nova aba): deixa o navegador agir
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) return;

  // URL monta o endereço completo do link para comparar com a página atual
  const url = new URL(link.href, window.location.href);
  // link para a mesma página (ex.: #solicitacao) não precisa de transição
  const samePage = url.pathname === window.location.pathname;
  // link para outro site também não
  const sameSite = url.protocol === window.location.protocol && url.host === window.location.host;
  if (!sameSite || samePage || reduceMotion) return;

  // segura a navegação, faz o fade e navega depois
  event.preventDefault();
  document.body.classList.add('page-leave');
  setTimeout(function () {
    window.location.href = link.href;
  }, 280);
});

// ao voltar pelo botão do navegador, a página não pode ficar invisível
// Alguns navegadores guardam a página "congelada" (cache) do jeito que ela
// estava, ou seja, já com o fade. event.persisted = true nesse caso.
window.addEventListener('pageshow', function (event) {
  if (event.persisted) document.body.classList.remove('page-leave');
});
