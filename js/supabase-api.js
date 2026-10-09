// ============================================================================
// CLIENTE SUPABASE FEITO COM JAVASCRIPT PURO
// ============================================================================
// Para fins didáticos, este arquivo usa fetch() diretamente, sem biblioteca,
// para acessar autenticação, banco de dados e armazenamento de arquivos.
(function () {
  'use strict';
  const config = window.SUPABASE_CONFIG || {};
  const sessionKey = 'telamax-admin-session';

  function isConfigured() {
    return Boolean(config.url && config.anonKey &&
      !config.url.includes('COLE_') && !config.anonKey.includes('COLE_'));
  }

  function baseUrl() { return config.url.replace(/\/$/, ''); }

  // Lê texto ou JSON e transforma respostas HTTP com erro em exceções.
  async function readResponse(response) {
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (error) { data = text; }
    if (!response.ok) {
      const message = data && (data.msg || data.message || data.error_description || data.hint);
      throw new Error(message || 'Não foi possível concluir a operação.');
    }
    return data;
  }

  function getSession() {
    try { return JSON.parse(localStorage.getItem(sessionKey) || 'null'); }
    catch (error) { return null; }
  }
  function saveSession(session) { localStorage.setItem(sessionKey, JSON.stringify(session)); }
  function clearSession() { localStorage.removeItem(sessionKey); }

  // A chave pública identifica o projeto. O token identifica o usuário logado.
  function headers(useSession) {
    const result = { apikey: config.anonKey, 'Content-Type': 'application/json' };
    const session = getSession();
    if (useSession && session) result.Authorization = 'Bearer ' + session.access_token;
    return result;
  }

  async function signIn(email, password) {
    const response = await fetch(baseUrl() + '/auth/v1/token?grant_type=password', {
      method: 'POST', headers: headers(false),
      body: JSON.stringify({ email: email, password: password })
    });
    const session = await readResponse(response);
    saveSession(session);
    return session;
  }

  async function signOut() {
    const session = getSession();
    if (!session) return;
    try {
      await fetch(baseUrl() + '/auth/v1/logout', { method: 'POST', headers: headers(true) });
    } finally { clearSession(); }
  }

  // Consultar a própria linha confirma que a conta faz parte dos administradores.
  async function requireAdmin() {
    if (!getSession()) throw new Error('Faça login para continuar.');
    const response = await fetch(baseUrl() + '/rest/v1/admin_users?select=user_id&limit=1', {
      headers: headers(true)
    });
    const rows = await readResponse(response);
    if (!rows || rows.length === 0) throw new Error('Este usuário não é administrador.');
    return true;
  }

  async function listProducts(admin) {
    const query = admin ? '?select=*&order=sort_order.asc,created_at.desc'
      : '?select=*&active=eq.true&order=sort_order.asc,created_at.desc';
    const response = await fetch(baseUrl() + '/rest/v1/products' + query, {
      headers: headers(Boolean(admin))
    });
    return readResponse(response);
  }

  // on_conflict permite criar e editar com a mesma função.
  async function saveProduct(product) {
    const response = await fetch(baseUrl() + '/rest/v1/products?on_conflict=id', {
      method: 'POST',
      headers: Object.assign(headers(true), {
        Prefer: 'resolution=merge-duplicates,return=representation'
      }),
      body: JSON.stringify(product)
    });
    const rows = await readResponse(response);
    return rows[0];
  }

  async function deleteProduct(id) {
    const response = await fetch(baseUrl() + '/rest/v1/products?id=eq.' + encodeURIComponent(id), {
      method: 'DELETE', headers: headers(true)
    });
    return readResponse(response);
  }

  async function getProduct(id) {
    const response = await fetch(baseUrl() + '/rest/v1/products?id=eq.' +
      encodeURIComponent(id) + '&select=*&limit=1', { headers: headers(false) });
    const rows = await readResponse(response);
    return rows[0] || null;
  }

  async function uploadImage(file) {
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
    const path = Date.now() + '-' + safeName;
    const session = getSession();
    const response = await fetch(baseUrl() + '/storage/v1/object/product-images/' +
      encodeURIComponent(path), {
      method: 'POST',
      headers: {
        apikey: config.anonKey,
        Authorization: 'Bearer ' + session.access_token,
        'Content-Type': file.type,
        'x-upsert': 'false'
      },
      body: file
    });
    await readResponse(response);
    return baseUrl() + '/storage/v1/object/public/product-images/' + encodeURIComponent(path);
  }

  window.SupabaseApi = {
    isConfigured, getSession, signIn, signOut, requireAdmin,
    listProducts, getProduct, saveProduct, deleteProduct, uploadImage
  };
})();
