// =====================================================================
// gerar-config.js — cria o js/supabase-config.js a partir das variáveis
// =====================================================================
// O site é só HTML, CSS e JS, sem servidor: o navegador não consegue ler um
// arquivo .env. Por isso este script (Node.js puro, sem biblioteca) lê as
// variáveis e escreve um arquivo JavaScript comum que as páginas carregam.
//
// De onde vêm as variáveis:
//   - no seu computador: do arquivo .env (copie o .env.example)
//   - na Vercel: das Environment Variables do projeto (o vercel.json manda a
//     Vercel rodar este script antes de publicar)
//
// Como rodar no computador:  node scripts/gerar-config.js
//
// O .env e o js/supabase-config.js estão no .gitignore, então as chaves não
// vão para o GitHub. Atenção: a chave pública (anon) continua aparecendo para
// quem abre o site, porque o navegador precisa dela para falar com o Supabase.
// Isso é normal; quem protege os dados são as políticas RLS do schema.sql.

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const envFile = path.join(root, '.env');
const outputFile = path.join(root, 'js', 'supabase-config.js');

// Lê o .env (se existir) linha por linha: NOME=valor.
// Linhas vazias e linhas começando com # (comentários) são ignoradas.
// Uma variável que já existe no ambiente (ex.: na Vercel) tem prioridade.
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf8').split(/\r?\n/).forEach(function (line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const equals = trimmed.indexOf('=');
    if (equals === -1) return;
    const name = trimmed.slice(0, equals).trim();
    // tira aspas em volta do valor, se a pessoa tiver colocado
    const value = trimmed.slice(equals + 1).trim().replace(/^["']|["']$/g, '');
    if (!(name in process.env)) process.env[name] = value;
  });
}

const config = {
  url: process.env.SUPABASE_URL || '',
  anonKey: process.env.SUPABASE_ANON_KEY || '',
  adminUsername: process.env.ADMIN_USERNAME || 'thiago',
  adminEmail: process.env.ADMIN_EMAIL || ''
};

// Sem URL ou chave o site continua funcionando com os produtos escritos no
// HTML; só avisamos, sem interromper a publicação.
if (!config.url || !config.anonKey) {
  console.warn('Aviso: SUPABASE_URL ou SUPABASE_ANON_KEY não definidas. ' +
    'O site vai usar os produtos fixos do HTML.');
}

// Proteção extra: a chave secreta (service_role) nunca pode ir para o navegador.
// As chaves antigas são um JWT (três partes separadas por ponto); a do meio
// diz o "role". As novas chaves secretas começam com "sb_secret_".
function isSecretKey(key) {
  if (key.startsWith('sb_secret_')) return true;
  const parts = key.split('.');
  if (parts.length !== 3) return false;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64').toString()).role === 'service_role';
  } catch (error) {
    return false;
  }
}

if (isSecretKey(config.anonKey)) {
  console.error('Erro: SUPABASE_ANON_KEY é a chave SECRETA (service_role). ' +
    'Use a chave pública "anon"/"publishable".');
  process.exit(1);
}

const content =
  '// Arquivo GERADO por scripts/gerar-config.js. Não edite e não envie ao GitHub.\n' +
  '// Para mudar os valores, altere o .env (ou as variáveis da Vercel) e gere de novo.\n' +
  'window.SUPABASE_CONFIG = ' + JSON.stringify(config, null, 2) + ';\n';

fs.writeFileSync(outputFile, content);
console.log('js/supabase-config.js gerado' + (config.url ? ' para ' + config.url : '') + '.');
