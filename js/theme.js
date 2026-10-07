// =====================================================================
// theme.js — escolhe o tema (claro ou escuro) ANTES da página aparecer
// =====================================================================
// Este arquivo é carregado dentro do <head> (e não no fim do <body> como os
// outros). Assim ele roda antes do navegador desenhar a página. Se ele rodasse
// depois, a página apareceria clara por um instante e só então ficaria escura
// (um "piscão" feio). Quem troca o tema ao clicar no botão é o main.js;
// aqui só aplicamos o tema que já estava escolhido.

// (function () { ... })() é uma "função que se executa sozinha".
// Ela serve para as variáveis daqui de dentro (como "theme") não ficarem
// globais e não se misturarem com as variáveis dos outros arquivos.
(function () {
  // começa sem tema definido
  let theme = null;

  // localStorage é um "armazenamento" do navegador que guarda textos
  // mesmo depois de fechar a página. O main.js salva ali 'dark' ou 'light'.
  // O try/catch evita erro em navegadores que bloqueiam o localStorage
  // (por exemplo, em algumas abas anônimas).
  try {
    theme = localStorage.getItem('theme');
  } catch (e) {
    // sem acesso ao localStorage: usa o tema do sistema
  }

  // Se a pessoa nunca escolheu um tema, seguimos o tema do sistema operacional.
  // matchMedia testa uma media query pelo JavaScript; ".matches" é true
  // quando o celular/computador está no modo escuro.
  if (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    theme = 'dark';
  }

  // document.documentElement é a tag <html>. Colocando data-theme="dark"
  // nela, o CSS (seletor [data-theme="dark"]) troca todas as cores do site.
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
