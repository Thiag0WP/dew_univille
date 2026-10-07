// =====================================================================
// category_tvs.js — formulário "Solicite sua TV" da página de TVs
// =====================================================================
// Valida o nome e o email antes de enviar, mostra a mensagem de erro
// embaixo de cada campo e, se estiver tudo certo, mostra um aviso (toast)
// de agradecimento. Não existe servidor: o "envio" é só simulado.
// A função showToast() vem do main.js, que é carregado logo depois deste
// arquivo; como ela só é usada no clique (quando tudo já carregou), funciona.

// Valida e envia o formulário de solicitação de TV
// getElementById busca o elemento pelo atributo id="..." do HTML
const form = document.getElementById('products-form');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');

// Mostra (ou apaga) a mensagem de erro de um campo.
// Cada campo tem um <p id="CAMPO-error"> logo abaixo dele, por exemplo
// o campo id="name" tem o parágrafo id="name-error".
// message vazia ('') = sem erro.
function showError(input, message) {
  document.getElementById(input.id + '-error').textContent = message;
  // classList.toggle(classe, condição): coloca a classe se a condição for
  // true e tira se for false. A classe "invalid" deixa a borda vermelha (CSS).
  input.classList.toggle('invalid', message !== '');
}

// Confere UM campo e devolve true se ele estiver válido.
function validateField(input) {
  let message = '';

  // nome: trim() tira os espaços das pontas; precisa ter 3 letras ou mais
  if (input === nameInput && input.value.trim().length < 3) {
    message = 'Informe seu nome (mínimo 3 letras).';
  }
  // email: o próprio navegador sabe validar <input type="email">.
  // validity.valid é false quando o texto não tem cara de email.
  // Também não aceitamos o campo vazio.
  if (input === emailInput && (!input.validity.valid || input.value.trim() === '')) {
    message = 'Informe um email válido.';
  }

  showError(input, message);
  return message === '';
}

// Confere todos os campos obrigatórios.
// Chamamos os dois ANTES de juntar o resultado para que os dois erros
// apareçam de uma vez (se usássemos && direto, o segundo nem seria testado
// quando o primeiro falhasse).
function validate() {
  const nameValid = validateField(nameInput);
  const emailValid = validateField(emailInput);
  return nameValid && emailValid;
}

// "submit" acontece quando a pessoa clica em Enviar (ou aperta Enter)
form.addEventListener('submit', function (event) {
  // impede o comportamento padrão do formulário, que seria recarregar a
  // página mandando os dados para um servidor (que não temos)
  event.preventDefault();
  // se algum campo estiver errado, para aqui; os erros já estão na tela
  if (!validate()) return;

  // pega só o primeiro nome: "Maria Silva" -> ["Maria", "Silva"] -> "Maria"
  const name = nameInput.value.trim().split(' ')[0];
  const brand = document.getElementById('brand').value.trim();

  // monta a mensagem; a marca só entra se a pessoa tiver preenchido
  // (condição ? valorSeVerdadeiro : valorSeFalso)
  showToast('Obrigado, ' + name + '! Sua solicitação' +
    (brand ? ' de TV ' + brand : '') + ' foi enviada.');
  // limpa todos os campos do formulário
  form.reset();
});

// botão "Limpar" (type="reset"): além de limpar os campos, apaga os erros
form.addEventListener('reset', function () {
  showError(nameInput, '');
  showError(emailInput, '');
});

// valida o campo assim que o usuário sai dele
// "blur" acontece quando o campo perde o foco (a pessoa clicou fora ou
// apertou Tab). Só validamos se ela já digitou algo, para não mostrar
// erro em um campo que ela nem começou a preencher.
[nameInput, emailInput].forEach(function (input) {
  input.addEventListener('blur', function () {
    if (input.value !== '') validateField(input);
  });
});
