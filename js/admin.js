// ============================================================================
// PAINEL ADMINISTRATIVO — autenticação e cadastro de produtos
// ============================================================================
(function () {
  'use strict';
  const api = window.SupabaseApi;
  const loginView = document.getElementById('login-view');
  const dashboard = document.getElementById('dashboard-view');
  const loginMessage = document.getElementById('login-message');
  const productMessage = document.getElementById('product-message');
  const form = document.getElementById('product-form');
  const list = document.getElementById('admin-product-list');
  let products = [];

  function money(value) { return Number(value).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
  function field(id) { return document.getElementById(id); }
  function message(element, text, success) { element.textContent=text; element.classList.toggle('success',Boolean(success)); }

  // textContent evita que nomes cadastrados sejam interpretados como HTML.
  function renderList() {
    const term = field('admin-search').value.trim().toLowerCase();
    const visible = products.filter(function (product) { return product.name.toLowerCase().includes(term); });
    field('admin-count').textContent = products.length + (products.length === 1 ? ' produto' : ' produtos');
    list.innerHTML = '';
    visible.forEach(function (product) {
      const item = document.createElement('article'); item.className='admin-product';
      const image=document.createElement('img'); image.src=product.image_url; image.alt='';
      const text=document.createElement('div'); const title=document.createElement('h3'); title.textContent=product.name;
      const detail=document.createElement('p'); detail.textContent=money(product.price)+' · '+(product.active?'Ativo':'Oculto');
      text.append(title,detail);
      const actions=document.createElement('div'); actions.className='product-actions';
      const edit=document.createElement('button'); edit.type='button'; edit.className='admin-button'; edit.textContent='Editar'; edit.dataset.edit=product.id;
      const remove=document.createElement('button'); remove.type='button'; remove.className='admin-button danger'; remove.textContent='Excluir'; remove.dataset.delete=product.id;
      actions.append(edit,remove); item.append(image,text,actions); list.appendChild(item);
    });
  }

  async function loadProducts() { products=await api.listProducts(true); renderList(); }

  function resetForm() {
    form.reset(); field('product-active').checked=true; field('product-order').value='0';
    field('product-id').disabled=false; field('image-preview').hidden=true;
    field('form-title').textContent='Novo produto'; message(productMessage,'');
  }

  function editProduct(product) {
    field('form-title').textContent='Editar produto'; field('product-id').value=product.id;
    field('product-id').disabled=true; field('product-category').value=product.category;
    field('product-name').value=product.name; field('product-price').value=product.price;
    field('product-old-price').value=product.old_price||''; field('product-order').value=product.sort_order;
    field('product-installments').value=product.installments||''; field('product-badge').value=product.badge||'';
    field('product-summary').value=product.summary||''; field('product-description').value=product.description||'';
    field('product-specifications').value=product.specifications||''; field('product-image-url').value=product.image_url;
    field('product-featured').checked=product.featured; field('product-active').checked=product.active;
    const preview=field('image-preview'); preview.src=product.image_url; preview.hidden=false;
    window.scrollTo({top:0,behavior:'smooth'});
  }

  // Se já houver sessão, tentamos abrir o painel sem pedir a senha novamente.
  async function openDashboard() {
    await api.requireAdmin(); loginView.hidden=true; dashboard.hidden=false; await loadProducts();
  }

  if (!api.isConfigured()) field('setup-warning').hidden=false;
  else if (api.getSession()) openDashboard().catch(function () { loginView.hidden=false; });

  field('login-form').addEventListener('submit', async function (event) {
    event.preventDefault(); message(loginMessage,'Entrando...');
    try {
      const typedUsername=field('login-username').value.trim();
      const config=window.SUPABASE_CONFIG;

      // A interface mostra um nome de usuário simples, embora o serviço de
      // autenticação trabalhe internamente com endereço de e-mail.
      if(typedUsername!==config.adminUsername){
        throw new Error('Usuário ou senha inválidos.');
      }
      await api.signIn(config.adminEmail,field('login-password').value);
      await openDashboard();
      message(loginMessage,'');
    }
    catch(error){message(loginMessage,error.message);}
  });

  field('logout-button').addEventListener('click', async function(){await api.signOut();location.reload();});
  field('admin-search').addEventListener('input',renderList);
  field('cancel-edit').addEventListener('click',resetForm);
  field('product-image-url').addEventListener('input',function(){const preview=field('image-preview');preview.src=this.value;preview.hidden=!this.value;});

  list.addEventListener('click',async function(event){
    const editId=event.target.dataset.edit; const deleteId=event.target.dataset.delete;
    if(editId) editProduct(products.find(function(p){return p.id===editId;}));
    if(deleteId && confirm('Excluir este produto? Esta ação não pode ser desfeita.')){
      try{await api.deleteProduct(deleteId);await loadProducts();}catch(error){alert(error.message);}
    }
  });

  form.addEventListener('submit',async function(event){
    event.preventDefault(); message(productMessage,'Salvando...');
    try{
      let imageUrl=field('product-image-url').value.trim(); const imageFile=field('product-image').files[0];
      if(imageFile){message(productMessage,'Enviando imagem...');imageUrl=await api.uploadImage(imageFile);}
      const oldPrice=field('product-old-price').value;
      await api.saveProduct({
        id:field('product-id').value.trim(), name:field('product-name').value.trim(), category:field('product-category').value,
        price:Number(field('product-price').value), old_price:oldPrice?Number(oldPrice):null,
        installments:field('product-installments').value.trim(), badge:field('product-badge').value.trim(),
        summary:field('product-summary').value.trim(), description:field('product-description').value.trim(),
        specifications:field('product-specifications').value.trim(), image_url:imageUrl,
        featured:field('product-featured').checked, active:field('product-active').checked,
        sort_order:Number(field('product-order').value)||0, updated_at:new Date().toISOString()
      });
      resetForm(); await loadProducts(); message(productMessage,'Produto salvo com sucesso!',true);
    }catch(error){message(productMessage,error.message);}
  });
})();
