// Mostra uma mensagem de confirmação ao enviar a solicitação de TV
const form = document.getElementById('products-form');
const message = document.getElementById('form-message');

form.addEventListener('submit', function (event) {
  event.preventDefault();

  const name = document.getElementById('name').value.trim();
  const brand = document.getElementById('brand').value.trim();

  message.textContent = 'Obrigado, ' + name + '! Sua solicitação' +
    (brand ? ' de TV ' + brand : '') + ' foi enviada.';
  message.hidden = false;
  form.reset();
});

form.addEventListener('reset', function () {
  message.hidden = true;
});
