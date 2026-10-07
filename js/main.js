// Funcionalidades comuns a todas as páginas:
// menu do celular, modo escuro, carrinho, busca/ordenação, voltar ao topo e avisos

// ---------- Utilitários ----------
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function formatMoney(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (e) {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // sem acesso ao localStorage: o carrinho vale só nesta página
  }
}

// ---------- Avisos (toast) ----------
const toast = document.querySelector('.toast');
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    toast.classList.remove('show');
  }, 2500);
}

// ---------- Menu do celular ----------
const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.getElementById('main-nav');

menuToggle.addEventListener('click', function () {
  const open = mainNav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', open);
});

// fecha o menu ao escolher um link
mainNav.addEventListener('click', function (event) {
  if (event.target.tagName === 'A') {
    mainNav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', false);
  }
});

// ---------- Modo escuro ----------
document.querySelector('.theme-toggle').addEventListener('click', function () {
  const root = document.documentElement;
  const dark = root.getAttribute('data-theme') !== 'dark';

  if (dark) {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.removeAttribute('data-theme');
  }
  try {
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  } catch (e) {
    // tema não fica salvo, mas continua funcionando
  }
});

// ---------- Carrinho ----------
let cart = readStorage('cart', []);

const cartDrawer = document.getElementById('cart-drawer');
const overlay = document.querySelector('.overlay');
const cartItems = document.querySelector('.cart-items');
const cartEmpty = document.querySelector('.cart-empty');
const cartFooter = document.querySelector('.cart-footer');
const cartCount = document.querySelector('.cart-count');
const cartTotal = document.querySelector('.cart-total strong');

function openCart() {
  cartDrawer.classList.add('open');
  cartDrawer.setAttribute('aria-hidden', false);
  overlay.classList.add('show');
  document.body.classList.add('no-scroll');
}

function closeCart() {
  cartDrawer.classList.remove('open');
  cartDrawer.setAttribute('aria-hidden', true);
  overlay.classList.remove('show');
  document.body.classList.remove('no-scroll');
}

function renderCart() {
  let count = 0;
  let total = 0;
  cartItems.innerHTML = '';

  cart.forEach(function (item) {
    count += item.qty;
    total += item.qty * item.price;

    const li = document.createElement('li');
    li.className = 'cart-item';
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
    li.querySelector('.cart-item-name').textContent = item.name;
    li.dataset.id = item.id;
    cartItems.appendChild(li);
  });

  cartEmpty.hidden = cart.length > 0;
  cartFooter.hidden = cart.length === 0;
  cartCount.hidden = count === 0;
  cartCount.textContent = count;
  cartTotal.textContent = formatMoney(total);
  writeStorage('cart', cart);
}

function addToCart(product) {
  const existing = cart.find(function (item) {
    return item.id === product.id;
  });

  if (existing) {
    existing.qty++;
  } else {
    cart.push(product);
  }
  renderCart();

  // pequena animação no contador do carrinho
  cartCount.classList.remove('bump');
  void cartCount.offsetWidth;
  cartCount.classList.add('bump');
}

document.querySelector('.cart-toggle').addEventListener('click', openCart);
document.querySelector('.cart-close').addEventListener('click', closeCart);
overlay.addEventListener('click', closeCart);

document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape') closeCart();
});

// botões + e - dentro do carrinho
cartItems.addEventListener('click', function (event) {
  const action = event.target.dataset.action;
  if (!action) return;

  const id = event.target.closest('.cart-item').dataset.id;
  const item = cart.find(function (i) { return i.id === id; });

  item.qty += action === 'increase' ? 1 : -1;
  if (item.qty <= 0) {
    cart = cart.filter(function (i) { return i.id !== id; });
  }
  renderCart();
});

document.querySelector('.cart-checkout').addEventListener('click', function () {
  cart = [];
  renderCart();
  closeCart();
  showToast('Pedido finalizado! Obrigado pela compra.');
});

// botões "Adicionar ao carrinho" dos produtos
document.querySelectorAll('.add-to-cart').forEach(function (button) {
  button.addEventListener('click', function () {
    const product = button.closest('.product');

    addToCart({
      id: product.dataset.id,
      name: product.dataset.name,
      price: Number(product.dataset.price),
      image: product.dataset.image,
      qty: 1
    });
    showToast(product.dataset.name + ' adicionado ao carrinho');

    button.textContent = 'Adicionado!';
    button.classList.add('added');
    setTimeout(function () {
      button.textContent = 'Adicionar ao carrinho';
      button.classList.remove('added');
    }, 1200);
  });
});

renderCart();

// ---------- Busca e ordenação dos produtos ----------
const searchInput = document.querySelector('.products-search');
const sortSelect = document.querySelector('.products-sort');

if (searchInput && sortSelect) {
  const list = document.querySelector('.products-list');
  const products = Array.from(list.querySelectorAll('.product'));
  const countText = document.querySelector('.products-count');
  const emptyText = document.querySelector('.products-empty');

  function updateProducts() {
    const term = searchInput.value.trim().toLowerCase();
    const order = sortSelect.value;
    const sorted = products.slice();

    if (order === 'price-asc') {
      sorted.sort(function (a, b) { return a.dataset.price - b.dataset.price; });
    } else if (order === 'price-desc') {
      sorted.sort(function (a, b) { return b.dataset.price - a.dataset.price; });
    } else if (order === 'name') {
      sorted.sort(function (a, b) { return a.dataset.name.localeCompare(b.dataset.name); });
    }

    let visible = 0;
    sorted.forEach(function (product) {
      const show = product.dataset.name.toLowerCase().includes(term);
      product.hidden = !show;
      if (show) visible++;
      list.appendChild(product);
    });

    countText.textContent = visible + (visible === 1 ? ' produto' : ' produtos');
    emptyText.hidden = visible > 0;
  }

  searchInput.addEventListener('input', updateProducts);
  sortSelect.addEventListener('change', updateProducts);
}

// ---------- Voltar ao topo ----------
const backToTop = document.querySelector('.back-to-top');

const siteHeader = document.querySelector('header');
const scrollProgress = document.createElement('div');
scrollProgress.className = 'scroll-progress';
siteHeader.appendChild(scrollProgress);

function onScroll() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  scrollProgress.style.transform = 'scaleX(' + (max > 0 ? window.scrollY / max : 0) + ')';
  siteHeader.classList.toggle('scrolled', window.scrollY > 10);
  backToTop.classList.toggle('visible', window.scrollY > 400);
}

window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

backToTop.addEventListener('click', function () {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ---------- Passo 3: tela de pixels (QLED x OLED) desenhada no canvas ----------
// A imagem é uma grade fixa de 120 x 68 pixels (uma cena noturna com lua).
// Ao entrar no passo 3 a câmera dá zoom até os pixels ficarem grandes;
// o mouse/dedo apaga pixels e alguns se apagam sozinhos de vez em quando.
function createPixelScreen(container) {
  const canvas = container.querySelector('.tech-canvas');
  const ctx = canvas.getContext('2d');
  const COLS = 120;
  const ROWS = 68;
  const ZOOM = 3.8;            // quanto a câmera aproxima
  const ZOOM_DELAY = 500;      // ms mostrando a imagem inteira antes do zoom
  const ZOOM_TIME = 2000;      // ms
  const SWEEP_TIME = 1100;     // ms da linha de comparação

  // cor de cada pixel da cena (0 a 1) e a luz de fundo do mini-LED
  const red = new Float32Array(COLS * ROWS);
  const green = new Float32Array(COLS * ROWS);
  const blue = new Float32Array(COLS * ROWS);
  const backlight = new Float32Array(COLS * ROWS);
  // quanto tempo cada pixel ainda fica apagado (0 = aceso)
  const off = new Float32Array(COLS * ROWS);

  // QLED: o painel LCD filtra a luz dos mini-LEDs, mas não bloqueia tudo:
  // perto de algo claro o preto fica acinzentado/azulado
  function qledColor(k, on) {
    const light = backlight[k] * on;
    return [
      (red[k] * 0.9 + 0.1) * light,
      (green[k] * 0.9 + 0.13) * light,
      (blue[k] * 0.85 + 0.25) * light
    ];
  }

  function smoothstep(a, b, x) {
    const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
    return t * t * (3 - 2 * t);
  }

  function random(i, j) {
    const n = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }

  // monta a cena: céu preto, lua, estrelas, aurora e montanhas no horizonte
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      const x = (i + 0.5 - COLS / 2) / ROWS;
      const y = (j + 0.5) / ROWS;
      let r = 0;
      let g = 0;
      let b = 0;

      // céu levemente azul só lá em cima
      if (y < 0.3) {
        const sky = 1 - y / 0.3;
        r += 0.03 * sky;
        g += 0.06 * sky;
        b += 0.2 * sky;
      }

      // estrelas
      if (random(i, j) < 0.007) {
        const star = 0.45 + random(j, i) * 0.55;
        r += star;
        g += star;
        b += star * 0.9 + 0.1;
      }

      // aurora ondulando, mudando de cor ao longo da tela
      const wave = 0.575 + 0.03 * Math.sin(x * 9);
      const aurora = Math.exp(-Math.pow((y - wave) / 0.018, 2));
      const hue = smoothstep(-0.5, 0.5, x);
      r += aurora * (0.1 + 0.8 * hue);
      g += aurora * (0.9 - 0.7 * hue);
      b += aurora * (0.6 + 0.3 * hue);

      // lua com crateras
      const moon = 1 - smoothstep(0.08, 0.09, Math.hypot(x, y - 0.47));
      if (moon > 0) {
        let shade = 1;
        [[-0.03, 0.45, 0.022], [0.035, 0.5, 0.016], [0.012, 0.415, 0.012], [-0.02, 0.515, 0.01]].forEach(function (c) {
          if (Math.hypot(x - c[0], y - c[1]) < c[2]) shade = 0.72;
        });
        r = r * (1 - moon) + moon * shade;
        g = g * (1 - moon) + moon * 0.95 * shade;
        b = b * (1 - moon) + moon * 0.82 * shade;
      }

      // brilho do pôr do sol e montanhas pretas na frente
      if (y > 0.74) {
        const glow = Math.pow((y - 0.74) / 0.14, 2);
        r += glow;
        g += glow * (0.35 + 0.2 * hue);
        b += glow * (0.25 + 0.3 * (1 - hue));
      }
      const ridge = 0.86 + 0.035 * Math.sin(x * 5 + 1) + 0.015 * Math.sin(x * 17);
      if (y > ridge) {
        r = 0;
        g = 0;
        b = 0;
      }

      const k = j * COLS + i;
      red[k] = Math.min(r, 1);
      green[k] = Math.min(g, 1);
      blue[k] = Math.min(b, 1);
    }
  }

  // mini-LED: cada LED acende pelo pixel mais claro da sua vizinhança,
  // por isso a luz "vaza" para as partes pretas (blooming)
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      let light = 0;
      for (let dj = -3; dj <= 3; dj++) {
        for (let di = -3; di <= 3; di++) {
          const ni = i + di;
          const nj = j + dj;
          if (ni < 0 || nj < 0 || ni >= COLS || nj >= ROWS) continue;
          const n = nj * COLS + ni;
          const lum = Math.max(red[n], green[n], blue[n]);
          const distance = Math.hypot(di, dj);
          const reach = distance === 0 ? 1 : 0.6 * (1 - distance / 3.5);
          light = Math.max(light, lum * reach);
        }
      }
      backlight[j * COLS + i] = 0.04 + light * 0.96;
    }
  }

  // imagens pequenas (1 pixel por pixel da cena) usadas no começo do zoom
  function makeImage(colorOf) {
    const image = document.createElement('canvas');
    image.width = COLS;
    image.height = ROWS;
    const imageCtx = image.getContext('2d');
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

  const oledImage = makeImage(function (k) { return [red[k], green[k], blue[k]]; });
  const qledImage = makeImage(function (k) {
    return qledColor(k, 1);
  });

  // brilho redondo de um mini-LED, desenhado uma vez e reaproveitado
  const led = document.createElement('canvas');
  led.width = 64;
  led.height = 64;
  const ledCtx = led.getContext('2d');
  const ledGradient = ledCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
  ledGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  ledGradient.addColorStop(0.12, 'rgba(235, 245, 255, 1)');
  ledGradient.addColorStop(0.28, 'rgba(150, 200, 255, 0.7)');
  ledGradient.addColorStop(0.55, 'rgba(60, 120, 255, 0.22)');
  ledGradient.addColorStop(1, 'rgba(40, 90, 255, 0)');
  ledCtx.fillStyle = ledGradient;
  ledCtx.fillRect(0, 0, 64, 64);

  let width = 0;
  let height = 0;
  let frame = 0;
  let lastTime = 0;
  let zoomStart = 0;
  let reveal = 0;              // 0 = só QLED, 1 = só OLED
  let sweepFrom = 0;
  let sweepTarget = 0;
  let sweepStart = -Infinity;
  let pointer = null;

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = container.clientWidth;
    height = container.clientHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function easeInOut(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // tamanho atual de cada pixel na tela e onde a grade começa
  function camera(now) {
    const startCell = Math.max(width / COLS, height / ROWS);
    const t = reduceMotion ? 1 : Math.min(Math.max((now - zoomStart - ZOOM_DELAY) / ZOOM_TIME, 0), 1);
    const progress = easeInOut(t);
    const cell = startCell * Math.pow(ZOOM, progress);
    return { cell: cell, x: width / 2 - (COLS / 2) * cell, y: height / 2 - (ROWS / 2) * cell };
  }

  // quanto o pixel está aceso (apagado volta a acender suavemente)
  function lit(k) {
    return 1 - smoothstep(0, 1, off[k]);
  }

  const SUBPIXEL_COLORS = [[255, 69, 58], [48, 209, 88], [10, 132, 255]];

  // faixa de pixels da grade que aparece entre from e to
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
  function drawSubpixels(cam, i, j, values, alpha) {
    const c = cam.cell;
    const left = cam.x + i * c + c * 0.07;
    const top = cam.y + j * c + c * 0.1;
    for (let s = 0; s < 3; s++) {
      const v = values[s] * alpha;
      if (v < 0.015) continue;
      const color = SUBPIXEL_COLORS[s];
      ctx.fillStyle = 'rgb(' + Math.round(color[0] * v) + ',' + Math.round(color[1] * v) + ',' + Math.round(color[2] * v) + ')';
      ctx.fillRect(left + s * c * 0.3, top, c * 0.24, c * 0.8);
    }
  }

  // OLED: cada subpixel tem luz própria; apagado é preto de verdade
  function drawOled(cam, from, to, alpha) {
    const range = visibleRange(cam, from, to, 0);

    // brilho suave da luz emitida, por baixo dos subpixels
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.22 * alpha;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(oledImage, cam.x, cam.y, COLS * cam.cell, ROWS * cam.cell);
    ctx.globalAlpha = 1;

    for (let j = range.firstJ; j <= range.lastJ; j++) {
      for (let i = range.firstI; i <= range.lastI; i++) {
        const k = j * COLS + i;
        const on = lit(k);
        if (on < 0.01) continue;
        drawSubpixels(cam, i, j, [red[k] * on, green[k] * on, blue[k] * on], alpha);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // QLED: mini-LEDs brilhando atrás + painel LCD na frente
  function drawQled(cam, from, to, alpha) {
    const c = cam.cell;
    const size = c * 2.3;
    const range = visibleRange(cam, from, to, 1);

    ctx.globalCompositeOperation = 'lighter';
    for (let j = range.firstJ; j <= range.lastJ; j++) {
      for (let i = range.firstI; i <= range.lastI; i++) {
        const k = j * COLS + i;
        // no mini-LED o pixel nunca apaga por completo: sobra um brilho
        const on = 0.15 + 0.85 * lit(k);
        const glow = backlight[k] * on * 0.85 * alpha;
        if (glow > 0.01) {
          ctx.globalAlpha = glow;
          ctx.drawImage(led, cam.x + (i + 0.5) * c - size / 2, cam.y + (j + 0.5) * c - size / 2, size, size);
        }
        ctx.globalAlpha = 1;
        drawSubpixels(cam, i, j, qledColor(k, on), alpha);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // desenha um dos modelos só na faixa [from, to) da tela
  function drawSide(tech, cam, from, to) {
    if (to - from < 0.5) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(from, 0, to - from, height);
    ctx.clip();

    // pixels pequenos demais: usa a imagem reduzida; depois troca pelos pixels desenhados um a um
    const detail = smoothstep(6, 10, cam.cell);
    if (detail < 1) {
      ctx.globalAlpha = 1 - detail;
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
    const oled = reveal > 0.5;
    const radius = oled ? 24 : 36;
    const reach = Math.ceil(radius / cam.cell);
    const ci = Math.floor((x - cam.x) / cam.cell);
    const cj = Math.floor((y - cam.y) / cam.cell);

    for (let j = cj - reach; j <= cj + reach; j++) {
      for (let i = ci - reach; i <= ci + reach; i++) {
        if (i < 0 || j < 0 || i >= COLS || j >= ROWS) continue;
        const distance = Math.hypot(cam.x + (i + 0.5) * cam.cell - x, cam.y + (j + 0.5) * cam.cell - y);
        if (distance > radius) continue;
        const k = j * COLS + i;
        // OLED apaga em bloco, com borda nítida; o mini-LED apaga em degradê
        const amount = oled ? 1.6 : 1.6 * (1 - distance / radius);
        off[k] = Math.max(off[k], amount);
      }
    }
  }

  function draw(now) {
    const dt = Math.min((now - (lastTime || now)) / 1000, 0.05);
    lastTime = now;

    if (container.clientWidth !== width || container.clientHeight !== height) resize();
    const cam = camera(now);

    // linha de comparação
    const sweep = reduceMotion ? 1 : Math.min((now - sweepStart) / SWEEP_TIME, 1);
    reveal = sweepFrom + (sweepTarget - sweepFrom) * easeInOut(sweep);

    // pixels apagados voltam a acender aos poucos
    for (let k = 0; k < off.length; k++) {
      if (off[k] > 0) off[k] = Math.max(off[k] - dt * 0.7, 0);
    }

    // alguns pixels se apagam sozinhos, um de cada vez
    if (!reduceMotion && now - zoomStart > ZOOM_DELAY + ZOOM_TIME) {
      const visibleCols = width / cam.cell;
      const visibleRows = height / cam.cell;
      const count = Math.random() < dt * 14 ? 1 : 0;
      for (let n = 0; n < count; n++) {
        const i = Math.floor(COLS / 2 - visibleCols / 2 + Math.random() * visibleCols);
        const j = Math.floor(ROWS / 2 - visibleRows / 2 + Math.random() * visibleRows);
        if (i >= 0 && j >= 0 && i < COLS && j < ROWS) off[j * COLS + i] = 1.4 + Math.random() * 0.6;
      }
    }

    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    const split = reveal * width;
    drawSide('oled', cam, 0, split);
    drawSide('qled', cam, split, width);

    // linha brilhante enquanto troca de modelo
    if (sweep < 1) {
      ctx.globalAlpha = Math.min(sweep * 6, (1 - sweep) * 6, 1);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
      ctx.shadowBlur = 14;
      ctx.fillRect(split - 1, 0, 2, height);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;

    frame = requestAnimationFrame(draw);
  }

  // segue o mouse/dedo, preenchendo o caminho entre um movimento e outro
  function track(event) {
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
    container.classList.add('touched');
  }

  container.addEventListener('pointermove', track);
  container.addEventListener('pointerdown', track);
  container.addEventListener('pointerleave', function () { pointer = null; });
  container.addEventListener('pointercancel', function () { pointer = null; });
  container.addEventListener('pointerup', function (event) {
    if (event.pointerType !== 'mouse') pointer = null;
  });

  return {
    // começa a desenhar e faz o zoom (uma vez a cada chegada no passo 3)
    start: function () {
      cancelAnimationFrame(frame);
      zoomStart = performance.now();
      lastTime = 0;
      frame = requestAnimationFrame(draw);
    },
    stop: function () {
      cancelAnimationFrame(frame);
      pointer = null;
    },
    // troca de modelo: a linha atravessa a tela sem repetir o zoom
    sweepTo: function (tech) {
      sweepFrom = reveal;
      sweepTarget = tech === 'oled' ? 1 : 0;
      sweepStart = performance.now();
    }
  };
}

// ---------- Scrollytelling: a TV muda conforme o passo visível ----------
const storyVisual = document.querySelector('.story-visual');

if (storyVisual) {
  const steps = document.querySelectorAll('.story-step');
  const dots = document.querySelectorAll('.story-progress li');
  const label = document.querySelector('.tv-label');
  const techButtons = document.querySelectorAll('.tech-switch button');
  const pixels = createPixelScreen(document.querySelector('.tech-zoom'));
  const labels = { 1: '55"', 2: '4K', 3: 'QLED · OLED', 4: '♪ Som surround', 5: 'Pronto!' };
  const FADE_DISTANCE = 80;

  function setStep(step) {
    const previous = storyVisual.dataset.step;
    storyVisual.dataset.step = step;
    label.textContent = labels[step];

    steps.forEach(function (el) {
      el.classList.toggle('active', el.dataset.step === step);
    });
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
  const storyObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) setStep(entry.target.dataset.step);
    });
  }, { rootMargin: '-50% 0px -50% 0px' });

  steps.forEach(function (step) {
    storyObserver.observe(step);
  });
  setStep('1');

  const mobileLayout = window.matchMedia('(max-width: 1023px)');

  // clicar numa bolinha rola até o passo dela
  dots.forEach(function (dot) {
    dot.querySelector('button').addEventListener('click', function () {
      const step = document.querySelector('.story-step[data-step="' + dot.dataset.step + '"]');
      let top;

      if (mobileLayout.matches) {
        // no celular o cartão para logo abaixo da TV fixa, totalmente visível
        const card = step.querySelector('.story-card');
        const stuckBottom = parseFloat(getComputedStyle(storyVisual).top) + storyVisual.offsetHeight;
        top = window.scrollY + card.getBoundingClientRect().top - stuckBottom - FADE_DISTANCE - 10;
      } else {
        const rect = step.getBoundingClientRect();
        top = window.scrollY + rect.top + rect.height / 2 - window.innerHeight / 2;
      }
      window.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });

  // QLED x OLED: uma linha atravessa a tela revelando o outro modelo
  techButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      if (storyVisual.dataset.tech === button.dataset.tech) return;

      storyVisual.dataset.tech = button.dataset.tech;
      techButtons.forEach(function (b) {
        b.setAttribute('aria-pressed', b === button);
      });

      pixels.sweepTo(button.dataset.tech);
    });
  });

  // no celular, cada cartão some antes de chegar na TV fixa no topo
  function fadeSteps() {
    const visualBottom = storyVisual.getBoundingClientRect().bottom;

    steps.forEach(function (step) {
      if (!mobileLayout.matches) {
        step.style.opacity = '';
        step.style.pointerEvents = '';
        return;
      }
      const cardTop = step.querySelector('.story-card').getBoundingClientRect().top;
      // começa a sumir pouco antes de encostar na TV
      const fade = Math.min(Math.max((cardTop - visualBottom) / FADE_DISTANCE, 0), 1);
      step.style.opacity = fade;
      step.style.pointerEvents = fade < 0.1 ? 'none' : '';
    });
  }

  window.addEventListener('scroll', fadeSteps, { passive: true });
  window.addEventListener('resize', fadeSteps);
  fadeSteps();
}

// ---------- Seções aparecem suavemente ao rolar ----------
const revealItems = document.querySelectorAll('main > section:not(.story), .feature, .category, .product');

const revealObserver = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) {
      const item = entry.target;
      // itens lado a lado aparecem em cascata
      const index = Array.prototype.indexOf.call(item.parentElement.children, item) % 3;
      item.style.transitionDelay = (index * 90) + 'ms';
      item.classList.add('visible');
      revealObserver.unobserve(item);
      // tira o atraso depois, para não atrasar o hover
      setTimeout(function () { item.style.transitionDelay = ''; }, 1200);
    }
  });
}, { threshold: 0.1 });

revealItems.forEach(function (item) {
  item.classList.add('reveal');
  revealObserver.observe(item);
});

// ---------- Efeitos de fundo que acompanham o mouse e a rolagem ----------

const effects = document.createElement('div');
effects.className = 'bg-effects';
effects.setAttribute('aria-hidden', 'true');
effects.innerHTML =
  '<div class="bg-grid"></div>' +
  '<span class="blob blob-1"></span>' +
  '<span class="blob blob-2"></span>' +
  '<span class="blob blob-3"></span>' +
  '<div class="cursor-glow"></div>';
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
    if (event.pointerType !== 'mouse') return;
    target.x = event.clientX;
    target.y = event.clientY;
    glow.classList.add('active');
  });

  document.documentElement.addEventListener('mouseleave', function () {
    glow.classList.remove('active');
  });

  function animate() {
    current.x += (target.x - current.x) * 0.07;
    current.y += (target.y - current.y) * 0.07;
    scrollCurrent += (window.scrollY - scrollCurrent) * 0.07;

    const dx = current.x - window.innerWidth / 2;
    const dy = current.y - window.innerHeight / 2;

    // cada mancha se move em ritmo diferente, criando profundidade
    blobs.forEach(function (blob, i) {
      const depth = (i + 1) * 0.025;
      const waveX = Math.cos(scrollCurrent / (700 + i * 150) + i) * 90;
      const waveY = Math.sin(scrollCurrent / (500 + i * 150) + i) * 140;
      blob.style.transform = 'translate3d(' + (dx * depth + waveX) + 'px, ' + (dy * depth + waveY) + 'px, 0)';
    });

    grid.style.backgroundPosition = '0 ' + (-scrollCurrent * 0.15) + 'px';
    glow.style.transform = 'translate3d(' + current.x + 'px, ' + current.y + 'px, 0)';

    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

// ---------- Luz que segue o mouse dentro dos cards ----------
document.addEventListener('pointermove', function (event) {
  const card = event.target.closest('.product, .category a, .feature');
  if (!card) return;

  const rect = card.getBoundingClientRect();
  card.style.setProperty('--mx', (event.clientX - rect.left) + 'px');
  card.style.setProperty('--my', (event.clientY - rect.top) + 'px');
});

// ---------- Transição suave entre as páginas ----------
document.addEventListener('click', function (event) {
  const link = event.target.closest('a');
  if (!link || link.target || event.defaultPrevented) return;
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) return;

  const url = new URL(link.href, window.location.href);
  const samePage = url.pathname === window.location.pathname;
  const sameSite = url.protocol === window.location.protocol && url.host === window.location.host;
  if (!sameSite || samePage || reduceMotion) return;

  event.preventDefault();
  document.body.classList.add('page-leave');
  setTimeout(function () {
    window.location.href = link.href;
  }, 280);
});

// ao voltar pelo botão do navegador, a página não pode ficar invisível
window.addEventListener('pageshow', function (event) {
  if (event.persisted) document.body.classList.remove('page-leave');
});
