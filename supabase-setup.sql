-- Enable UUID
create extension if not exists "uuid-ossp";

-- CLIENTES
create table clientes (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  telefone text not null,
  email text,
  data_nascimento date,
  endereco text,
  categoria text check (categoria in ('VIP','Frequente','Regular','Nova')),
  status text default 'ativa' check (status in ('ativa','inativa')),
  servico_favorito text,
  origem text,
  observacoes text,
  historico_quimico text[],
  created_at timestamptz default now()
);

-- SERVICOS
create table servicos (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  descricao text,
  duracao_min integer not null default 60,
  valor numeric(10,2) not null,
  status text default 'ativo' check (status in ('ativo','inativo'))
);

-- AGENDAMENTOS
create table agendamentos (
  id uuid primary key default uuid_generate_v4(),
  cliente_id uuid references clientes(id) on delete restrict,
  servico_id uuid references servicos(id) on delete restrict,
  profissional text default 'Deise',
  data date not null,
  horario time not null,
  duracao_min integer not null default 60,
  valor numeric(10,2) not null,
  status text default 'agendado' check (status in ('agendado','confirmado','realizado','cancelado','nao_compareceu')),
  forma_pagamento text,
  observacoes text,
  created_at timestamptz default now()
);

-- TRANSACOES
create table transacoes (
  id uuid primary key default uuid_generate_v4(),
  tipo text not null check (tipo in ('entrada','saida')),
  descricao text not null,
  categoria text not null,
  valor numeric(10,2) not null,
  data date not null default current_date,
  vencimento date,
  status text default 'pendente' check (status in ('pago','pendente','atrasado')),
  forma_pagamento text,
  cliente_id uuid references clientes(id) on delete set null,
  agendamento_id uuid references agendamentos(id) on delete set null,
  created_at timestamptz default now()
);

-- FORNECEDORES
create table fornecedores (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  telefone text,
  email text,
  created_at timestamptz default now()
);

-- PARCELAS
create table parcelas (
  id uuid primary key default uuid_generate_v4(),
  fornecedor_id uuid references fornecedores(id) on delete cascade,
  descricao text not null,
  valor numeric(10,2) not null,
  vencimento date not null,
  status text default 'pendente' check (status in ('pago','pendente','atrasado')),
  forma_pagamento text,
  created_at timestamptz default now()
);

-- PRODUTOS (estoque)
create table produtos (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  categoria text not null,
  fornecedor_id uuid references fornecedores(id) on delete set null,
  quantidade integer not null default 0,
  quantidade_minima integer not null default 5,
  unidade text default 'un',
  ultima_compra date,
  created_at timestamptz default now()
);

-- CASHBACK
create table cashback (
  id uuid primary key default uuid_generate_v4(),
  cliente_id uuid references clientes(id) on delete cascade,
  agendamento_id uuid references agendamentos(id) on delete cascade,
  valor_servico numeric(10,2) not null,
  forma_pagamento text not null,
  percentual numeric(5,2) not null,
  valor_cashback numeric(10,2) not null,
  status text default 'ativo' check (status in ('ativo','usado','expirado')),
  created_at timestamptz default now()
);

-- ANAMNESE
create table anamnese (
  id uuid primary key default uuid_generate_v4(),
  cliente_id uuid references clientes(id) on delete cascade,
  token text unique default uuid_generate_v4()::text,
  status text default 'pendente' check (status in ('pendente','preenchida')),
  tipo_cabelo text,
  espessura text,
  densidade text,
  porosidade text,
  elasticidade text,
  curvatura text,
  proc_quimico_anterior text,
  ultimo_procedimento text,
  fez_alisamento boolean,
  qual_alisamento text,
  tem_coloracao boolean,
  teve_quebra boolean,
  tem_alergia boolean,
  teve_reacao boolean,
  queda_apos_proc boolean,
  couro_sensivel boolean,
  produtos_atuais text,
  freq_lavagem text,
  usa_calor boolean,
  problemas text[],
  termo_aceito boolean default false,
  preenchida_em timestamptz,
  created_at timestamptz default now()
);

-- CONFIG
create table config (
  id uuid primary key default uuid_generate_v4(),
  nome_salao text default 'Deise Felix',
  telefone text,
  endereco text,
  abertura time default '08:30',
  fechamento time default '19:00',
  dias_ativos integer[] default '{1,2,3,4,5,6}',
  msg_confirmacao text default 'Olá, {nome_cliente}! Confirmando seu horário no Deise Felix: {servico}, no dia {data}, às {horario}. Podemos confirmar?',
  msg_aniversario text default 'Feliz aniversário, {nome_cliente}! 🎉🌸 O Deise Felix deseja um dia lindo! Você ganhou {desconto} de desconto no próximo atendimento. Agende: {link_agendamento} 💚',
  desconto_aniversario text default '15%',
  link_agendamento text
);

insert into config (id) values (uuid_generate_v4());

-- ROW LEVEL SECURITY (básico — auth via Supabase Auth)
alter table clientes enable row level security;
alter table agendamentos enable row level security;
alter table transacoes enable row level security;
alter table servicos enable row level security;
alter table fornecedores enable row level security;
alter table parcelas enable row level security;
alter table produtos enable row level security;
alter table cashback enable row level security;
alter table anamnese enable row level security;
alter table config enable row level security;

-- Policies: acesso total para usuários autenticados (ajuste para multi-tenant se necessário)
create policy "auth_all" on clientes for all using (auth.role() = 'authenticated');
create policy "auth_all" on agendamentos for all using (auth.role() = 'authenticated');
create policy "auth_all" on transacoes for all using (auth.role() = 'authenticated');
create policy "auth_all" on servicos for all using (auth.role() = 'authenticated');
create policy "auth_all" on fornecedores for all using (auth.role() = 'authenticated');
create policy "auth_all" on parcelas for all using (auth.role() = 'authenticated');
create policy "auth_all" on produtos for all using (auth.role() = 'authenticated');
create policy "auth_all" on cashback for all using (auth.role() = 'authenticated');
create policy "auth_all" on config for all using (auth.role() = 'authenticated');

-- Anamnese: pública para leitura/escrita por token (cliente preenche sem login)
create policy "public_token_read" on anamnese for select using (true);
create policy "public_token_update" on anamnese for update using (true);
create policy "auth_all_anamnese" on anamnese for all using (auth.role() = 'authenticated');

-- SEED: serviços iniciais
insert into servicos (nome, descricao, duracao_min, valor) values
  ('Coloração completa', 'Coloração permanente com hidratação inclusa', 120, 280),
  ('Escova progressiva', 'Progressiva com formol zero, frizz control', 90, 180),
  ('Corte feminino', 'Corte e finalização com escova', 60, 120),
  ('Botox capilar', 'Reconstrução profunda concentrada', 60, 150),
  ('Mechas balayage', 'Mechas iluminadas com efeito natural', 180, 380),
  ('Hidratação profunda', 'Hidratação com ampola e máscara', 45, 90);
