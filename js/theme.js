// Aplica o tema salvo antes da página aparecer, para não piscar o tema claro
(function () {
  let theme = null;
  try {
    theme = localStorage.getItem('theme');
  } catch (e) {
    // sem acesso ao localStorage: usa o tema do sistema
  }
  if (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    theme = 'dark';
  }
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
