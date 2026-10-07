// Funcionalidades comuns a todas as páginas:
// menu do celular, modo escuro, carrinho, busca/ordenação, voltar ao topo e avisos

// ---------- Utilitários ----------
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
  overlay.hidden = false;
  document.body.classList.add('no-scroll');
}

function closeCart() {
  cartDrawer.classList.remove('open');
  cartDrawer.setAttribute('aria-hidden', true);
  overlay.hidden = true;
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

window.addEventListener('scroll', function () {
  backToTop.classList.toggle('visible', window.scrollY > 400);
});

backToTop.addEventListener('click', function () {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ---------- Scrollytelling: a TV muda conforme o passo visível ----------
const storyVisual = document.querySelector('.story-visual');

if (storyVisual) {
  const steps = document.querySelectorAll('.story-step');
  const dots = document.querySelectorAll('.story-progress li');
  const label = document.querySelector('.tv-label');
  const labels = { 1: '55"', 2: '4K', 3: 'QLED · OLED', 4: '♪ Som surround', 5: 'Pronto!' };

  function setStep(step) {
    storyVisual.dataset.step = step;
    label.textContent = labels[step];

    steps.forEach(function (el) {
      el.classList.toggle('active', el.dataset.step === step);
    });
    dots.forEach(function (dot) {
      dot.classList.toggle('active', dot.dataset.step === step);
      dot.classList.toggle('done', Number(dot.dataset.step) < Number(step));
    });
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
}

// ---------- Seções aparecem suavemente ao rolar ----------
const revealItems = document.querySelectorAll('main > section:not(.story), .feature, .category, .product');

const revealObserver = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

revealItems.forEach(function (item) {
  item.classList.add('reveal');
  revealObserver.observe(item);
});
