// Valida e envia o formulário de solicitação de TV
const form = document.getElementById('products-form');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');

function showError(input, message) {
  document.getElementById(input.id + '-error').textContent = message;
  input.classList.toggle('invalid', message !== '');
}

function validateField(input) {
  let message = '';

  if (input === nameInput && input.value.trim().length < 3) {
    message = 'Informe seu nome (mínimo 3 letras).';
  }
  if (input === emailInput && (!input.validity.valid || input.value.trim() === '')) {
    message = 'Informe um email válido.';
  }

  showError(input, message);
  return message === '';
}

function validate() {
  const nameValid = validateField(nameInput);
  const emailValid = validateField(emailInput);
  return nameValid && emailValid;
}

form.addEventListener('submit', function (event) {
  event.preventDefault();
  if (!validate()) return;

  const name = nameInput.value.trim().split(' ')[0];
  const brand = document.getElementById('brand').value.trim();

  showToast('Obrigado, ' + name + '! Sua solicitação' +
    (brand ? ' de TV ' + brand : '') + ' foi enviada.');
  form.reset();
});

form.addEventListener('reset', function () {
  showError(nameInput, '');
  showError(emailInput, '');
});

// valida o campo assim que o usuário sai dele
[nameInput, emailInput].forEach(function (input) {
  input.addEventListener('blur', function () {
    if (input.value !== '') validateField(input);
  });
});
