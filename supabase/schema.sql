-- Banco de dados da TelaMax. Execute no SQL Editor do Supabase.
-- Usuários e senhas ficam no Supabase Auth; esta tabela só lista os admins.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key,
  name text not null,
  category text not null check (category in ('tvs', 'acessorios')),
  price numeric(12,2) not null check (price >= 0),
  old_price numeric(12,2),
  installments text not null default '',
  badge text not null default '',
  summary text not null default '',
  description text not null default '',
  specifications text not null default '',
  image_url text not null,
  featured boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS nega qualquer operação que não esteja expressamente permitida abaixo.
alter table public.admin_users enable row level security;
alter table public.products enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.admin_users where user_id = auth.uid()); $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "admin le o proprio cadastro" on public.admin_users;
create policy "admin le o proprio cadastro" on public.admin_users
for select to authenticated using (user_id = auth.uid());

-- Duas políticas separadas evitam pedir permissão de administrador ao visitante.
drop policy if exists "publico le produtos ativos" on public.products;
create policy "publico le produtos ativos" on public.products for select to anon, authenticated
using (active = true);
drop policy if exists "admin le todos os produtos" on public.products;
create policy "admin le todos os produtos" on public.products for select to authenticated
using (public.is_admin());
drop policy if exists "admin cria produtos" on public.products;
create policy "admin cria produtos" on public.products for insert to authenticated
with check (public.is_admin());
drop policy if exists "admin edita produtos" on public.products;
create policy "admin edita produtos" on public.products for update to authenticated
using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin exclui produtos" on public.products;
create policy "admin exclui produtos" on public.products for delete to authenticated
using (public.is_admin());

-- Bucket público: todos veem imagens, mas somente admins podem modificá-las.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;
drop policy if exists "admin envia imagens" on storage.objects;
create policy "admin envia imagens" on storage.objects for insert to authenticated
with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "admin altera imagens" on storage.objects;
create policy "admin altera imagens" on storage.objects for update to authenticated
using (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "admin apaga imagens" on storage.objects;
create policy "admin apaga imagens" on storage.objects for delete to authenticated
using (bucket_id = 'product-images' and public.is_admin());

-- Após criar a conta em Authentication > Users, copie o UUID e execute:
-- insert into public.admin_users (user_id) values ('UUID_DO_USUARIO');

-- Produtos iniciais. "on conflict" permite executar o arquivo novamente sem
-- duplicar dados nem apagar mudanças que você já tenha feito no painel.
insert into public.products
(id,name,category,price,old_price,installments,badge,summary,description,specifications,image_url,featured,sort_order)
values
('tv-samsung-55','Samsung Crystal UHD 55" CU7700','tvs',2699,3199,'ou 10x de R$ 269,90 sem juros','Mais vendido','Smart TV 4K com processador Crystal e Gaming Hub.','Cores naturais, resolução 4K e aplicativos reunidos em uma tela elegante.','Tela: 55 polegadas\nResolução: 4K UHD\nSistema: Tizen','https://placehold.co/600x400/f5f5f7/1d1d1f/png?text=Samsung+55',true,1),
('tv-lg-50','LG UHD 50" UR8750','tvs',2399,2799,'ou 10x de R$ 239,90 sem juros','','TV 4K com inteligência artificial e ThinQ AI.','Imagem 4K, comandos inteligentes e acesso aos principais aplicativos.','Tela: 50 polegadas\nResolução: 4K UHD\nSistema: webOS','https://placehold.co/600x400/f5f5f7/1d1d1f/png?text=LG+50',false,2),
('tv-tcl-65','TCL QLED 65" C655','tvs',3499,3999,'ou 10x de R$ 349,90 sem juros','Oferta','Cores QLED em uma grande tela de 65 polegadas.','Painel QLED, Google TV e ampla compatibilidade com HDR.','Tela: 65 polegadas\nTecnologia: QLED\nSistema: Google TV','https://placehold.co/600x400/f5f5f7/1d1d1f/png?text=TCL+65',true,3),
('tv-samsung-neo-65','Samsung Neo QLED 65" QN85C','tvs',6999,7999,'ou 10x de R$ 699,90 sem juros','Premium','Mini LEDs para brilho intenso e contraste preciso.','Uma TV premium com controle preciso de iluminação e alta fluidez.','Tela: 65 polegadas\nTecnologia: Neo QLED\nResolução: 4K','https://placehold.co/600x400/f5f5f7/1d1d1f/png?text=Neo+QLED+65',false,4),
('tv-lg-oled-55','LG OLED 55" C3','tvs',5999,6799,'ou 10x de R$ 599,90 sem juros','OLED','Pretos perfeitos com pixels que acendem individualmente.','Contraste infinito, ótima experiência para filmes e baixa latência para jogos.','Tela: 55 polegadas\nTecnologia: OLED\nSistema: webOS','https://placehold.co/600x400/f5f5f7/1d1d1f/png?text=LG+OLED+55',false,5),
('tv-philips-50','Philips Ambilight 50" PUG7908','tvs',2299,2699,'ou 10x de R$ 229,90 sem juros','Ambilight','Luzes inteligentes ampliam a sensação da imagem.','O Ambilight acompanha as cores da tela e transforma o ambiente.','Tela: 50 polegadas\nResolução: 4K UHD\nRecurso: Ambilight','https://placehold.co/600x400/f5f5f7/1d1d1f/png?text=Philips+50',false,6),
('ac-soundbar-jbl','Soundbar JBL Bar 2.1','acessorios',899,1099,'ou 10x de R$ 89,90 sem juros','Mais vendido','Som potente e graves marcantes para sua sala.','A soundbar melhora diálogos, trilhas e efeitos sem ocupar muito espaço.','Canais: 2.1\nConexão: HDMI e Bluetooth\nSubwoofer incluso','https://placehold.co/600x400/f5f5f7/1d1d1f/png?text=Soundbar+JBL',true,7),
('ac-suporte-parede','Suporte de Parede Multivisão Fixo','acessorios',129,null,'ou 3x de R$ 43,00 sem juros','','Suporte fixo resistente para instalar a TV.','Mantém a televisão próxima da parede com instalação segura.','Tipo: fixo\nCompatibilidade: padrão VESA','https://placehold.co/600x400/f5f5f7/1d1d1f/png?text=Suporte+de+Parede',false,8),
('ac-cabo-hdmi','Cabo HDMI 2.1 8K 2 metros','acessorios',79,null,'ou 2x de R$ 39,50 sem juros','','Alta largura de banda para vídeo e jogos.','Compatível com recursos modernos de imagem, som e alta taxa de atualização.','Versão: HDMI 2.1\nComprimento: 2 metros\nResolução: até 8K','https://placehold.co/600x400/f5f5f7/1d1d1f/png?text=Cabo+HDMI+2.1',false,9),
('ac-chromecast','Chromecast com Google TV','acessorios',349,399,'ou 6x de R$ 58,17 sem juros','Streaming','Aplicativos e streaming em uma interface simples.','Transforme qualquer TV com HDMI em uma central de entretenimento.','Resolução: 4K\nSistema: Google TV\nControle remoto incluso','https://placehold.co/600x400/f5f5f7/1d1d1f/png?text=Chromecast',false,10),
('ac-controle','Controle Remoto Universal','acessorios',59.90,null,'à vista','','Um controle compatível com diversas marcas.','Solução prática para substituir controles perdidos ou danificados.','Tipo: infravermelho\nAlimentação: pilhas','https://placehold.co/600x400/f5f5f7/1d1d1f/png?text=Controle+Remoto',false,11),
('ac-filtro-linha','Filtro de Linha 8 Tomadas','acessorios',89.90,null,'ou 2x de R$ 44,95 sem juros','','Organize e proteja os equipamentos da sala.','Oito tomadas para ligar TV, videogame, soundbar e outros aparelhos.','Tomadas: 8\nProteção contra surtos','https://placehold.co/600x400/f5f5f7/1d1d1f/png?text=Filtro+de+Linha',false,12)
on conflict (id) do nothing;

-- Nas especificações acima, cada linha é separada por "\n". Num texto SQL comum
-- isso fica gravado como os caracteres "\" e "n", e não como quebra de linha.
-- Esta instrução troca por quebras de linha de verdade (chr(10)); pode rodar
-- de novo sem problema, porque só mexe nos textos que ainda têm "\n".
update public.products
set specifications = replace(specifications, '\n', chr(10))
where strpos(specifications, '\n') > 0;
