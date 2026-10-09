// ============================================================================
// CATÁLOGO DINÂMICO
// ============================================================================
// Se o Supabase estiver configurado, substitui os cards escritos no HTML pelos
// produtos do banco. Se não estiver, não faz nada: o conteúdo original continua
// visível e o site segue funcionando durante o aprendizado/configuração.
(function () {
  'use strict';
  const api = window.SupabaseApi;
  const list = document.querySelector('.products-list');
  if (!list || !api || !api.isConfigured()) return;

  function money(value) {
    return Number(value).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
  }

  // createElement + textContent protegem a página contra HTML colocado no admin.
  function createCard(product) {
    const item=document.createElement('li'); item.className='product';
    item.dataset.id=product.id; item.dataset.name=product.name;
    item.dataset.price=product.price; item.dataset.image=product.image_url;
    if(product.badge){const badge=document.createElement('span');badge.className='badge';badge.textContent=product.badge;item.appendChild(badge);}
    const imageBox=document.createElement('div');imageBox.className='product-image';
    const image=document.createElement('img');image.src=product.image_url;image.alt=product.name;image.loading='lazy';imageBox.appendChild(image);
    const title=document.createElement('h3');title.textContent=product.name;
    const description=document.createElement('p');description.className='product-description';description.textContent=product.summary||product.description;
    // h4 e h5 mantêm exatamente a tipografia usada pelos cards originais.
    const price=document.createElement('h4');
    price.appendChild(document.createTextNode(money(product.price)+' '));
    if(product.old_price){const old=document.createElement('small');old.textContent='de '+money(product.old_price);price.appendChild(old);}
    const installments=document.createElement('h5');installments.textContent=product.installments||'';
    const actions=document.createElement('div');actions.className='product-actions';
    const add=document.createElement('button');add.type='button';add.className='btn btn-primary add-to-cart';add.textContent='Adicionar ao carrinho';
    const details=document.createElement('a');details.className='btn btn-ghost';details.href='product.html?id='+encodeURIComponent(product.id);details.textContent='Detalhes';
    actions.append(add,details);item.append(imageBox,title,description,price,installments,actions);
    return item;
  }

  api.listProducts(false).then(function (products) {
    // A página atual decide qual subconjunto deve aparecer.
    const path=location.pathname;
    if(path.includes('category_tvs')) products=products.filter(function(p){return p.category==='tvs';});
    else if(path.includes('category_acessories')) products=products.filter(function(p){return p.category==='acessorios';});
    else products=products.filter(function(p){return p.featured;}).slice(0,3);
    list.innerHTML='';products.forEach(function(product){list.appendChild(createCard(product));});
    // O main.js ouve este evento para atualizar busca e quantidade.
    document.dispatchEvent(new CustomEvent('catalog:rendered'));
  }).catch(function (error) {
    // Mantém os cards estáticos e registra o problema somente no console.
    console.error('Não foi possível carregar o catálogo:',error);
  });
})();
