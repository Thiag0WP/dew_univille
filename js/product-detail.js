// Monta a página interna usando o id presente em product.html?id=produto.
(function(){
  'use strict';
  const container=document.getElementById('product-detail');
  const id=new URLSearchParams(location.search).get('id');
  // Dados mínimos mantêm os links antigos funcionando antes da configuração
  // do banco. Assim que o Supabase existir, ele passa a ser a fonte oficial.
  const fallback={
    'tv-samsung-55':['Samsung Crystal UHD 55" CU7700','tvs',2699,'Samsung+55'],
    'tv-lg-50':['LG UHD 50" UR8750','tvs',2399,'LG+50'],
    'tv-tcl-65':['TCL QLED 65" C655','tvs',3499,'TCL+65'],
    'tv-samsung-neo-65':['Samsung Neo QLED 65" QN85C','tvs',6999,'Neo+QLED+65'],
    'tv-lg-oled-55':['LG OLED 55" C3','tvs',5999,'LG+OLED+55'],
    'tv-philips-50':['Philips Ambilight 50" PUG7908','tvs',2299,'Philips+50'],
    'ac-soundbar-jbl':['Soundbar JBL Bar 2.1','acessorios',899,'Soundbar+JBL'],
    'ac-suporte-parede':['Suporte de Parede Multivisão Fixo','acessorios',129,'Suporte+de+Parede'],
    'ac-cabo-hdmi':['Cabo HDMI 2.1 8K 2 metros','acessorios',79,'Cabo+HDMI+2.1'],
    'ac-chromecast':['Chromecast com Google TV','acessorios',349,'Chromecast'],
    'ac-controle':['Controle Remoto Universal','acessorios',59.90,'Controle+Remoto'],
    'ac-filtro-linha':['Filtro de Linha 8 Tomadas','acessorios',89.90,'Filtro+de+Linha']
  };

  function fallbackProduct(productId){
    const data=fallback[productId];
    if(!data)return null;
    return {id:productId,name:data[0],category:data[1],price:data[2],image_url:'https://placehold.co/600x400/f5f5f7/1d1d1f/png?text='+data[3],description:'Conheça os detalhes deste produto TelaMax.',installments:'Consulte as condições de pagamento.',specifications:''};
  }
  function money(value){return Number(value).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}
  function showError(text){container.innerHTML='';const p=document.createElement('p');p.className='detail-error';p.textContent=text;container.appendChild(p);}
  function render(product){
    container.innerHTML='';container.classList.add('product');
    container.dataset.id=product.id;container.dataset.name=product.name;container.dataset.price=product.price;container.dataset.image=product.image_url;
    const image=document.createElement('img');image.className='detail-image';image.src=product.image_url;image.alt=product.name;
    const content=document.createElement('div');content.className='detail-content';
    const category=document.createElement('p');category.className='detail-category';category.textContent=product.category==='tvs'?'TVs':'Acessórios';
    const title=document.createElement('h1');title.textContent=product.name;
    const description=document.createElement('p');description.className='detail-description';description.textContent=product.description||product.summary;
    const price=document.createElement('p');price.className='detail-price';price.textContent=money(product.price);
    const installments=document.createElement('p');installments.textContent=product.installments||'';
    const add=document.createElement('button');add.type='button';add.className='btn btn-primary add-to-cart';add.textContent='Adicionar ao carrinho';
    content.append(category,title,description,price,installments);
    if(product.specifications){const heading=document.createElement('h2');heading.textContent='Especificações';const specs=document.createElement('ul');specs.className='detail-specs';product.specifications.split('\n').filter(Boolean).forEach(function(text){const li=document.createElement('li');li.textContent=text;specs.appendChild(li);});content.append(heading,specs);}
    content.appendChild(add);container.append(image,content);document.title=product.name+' | TelaMax';
  }
  if(!id) return showError('Produto não informado.');
  if(!window.SupabaseApi.isConfigured()) {
    const localProduct=fallbackProduct(id);
    return localProduct?render(localProduct):showError('Produto não encontrado.');
  }
  window.SupabaseApi.getProduct(id).then(function(product){if(product)render(product);else showError('Produto não encontrado.');}).catch(function(){showError('Não foi possível carregar este produto.');});
})();
