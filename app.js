// ============================================================
// DEISE FELIX — APP.JS
// ============================================================

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── UTILS ──────────────────────────────────────────────────
const fmtBRL = v => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';
const fmtDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
const initials = n => n?.split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase() || '?';
const avColor = n => ['av1','av2','av3','av4','av5'][n?.charCodeAt(0)%5||0];
const statusBadge = { confirmado:'b-ok', agendado:'b-pend', realizado:'b-done', cancelado:'b-late', nao_compareceu:'b-abs' };
const statusLabel = { confirmado:'Confirmado', agendado:'Agendado', realizado:'Realizado', cancelado:'Cancelado', nao_compareceu:'Não compareceu' };

// ── STATE ──────────────────────────────────────────────────
let currentPage = 'dashboard';
let birthdayMsg = 'Feliz aniversário, {nome}! 🎉 O Deise Felix te dá {desconto} no próximo atendimento! Agende: {link}';
let birthdayDiscount = '15%';
let appUrl = window.location.origin;

// ── NAVIGATION ─────────────────────────────────────────────
async function nav(page, el) {
  currentPage = page;
  document.querySelectorAll('.ni').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  if (el) el.classList.add('active');
  else document.querySelectorAll('.ni').forEach(i => {
    if ((i.getAttribute('onclick')||'').includes(`'${page}'`)) i.classList.add('active');
  });
  const titles = { dashboard:'Dashboard', agenda:'Agenda', clientes:'Clientes', servicos:'Serviços',
    financeiro:'Financeiro', cashback:'Cashback', estoque:'Estoque', fornecedores:'Fornecedores',
    relatorios:'Relatórios', anamnese:'Anamnese', configuracoes:'Configurações' };
  document.getElementById('htitle').textContent = titles[page] || 'Deise Felix';
  const pg = document.getElementById('page-' + page);
  if (pg) { pg.classList.add('active'); await loadPage(page); }
}

async function loadPage(page) {
  switch(page) {
    case 'dashboard': await loadDashboard(); break;
    case 'agenda': await loadAgenda(); break;
    case 'clientes': await loadClientes(); break;
    case 'servicos': await loadServicos(); break;
    case 'financeiro': await loadFinanceiro(); break;
    case 'cashback': await loadCashback(); break;
    case 'estoque': await loadEstoque(); break;
    case 'fornecedores': await loadFornecedores(); break;
    case 'relatorios': await loadRelatorios(); break;
    case 'anamnese': await loadAnamnese(); break;
    case 'configuracoes': await loadConfiguracoes(); break;
  }
}

// ── LOADING ────────────────────────────────────────────────
function loading(id) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = `<div class="loading-wrap"><div class="spinner"></div></div>`;
}
function setHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

// ── DASHBOARD ──────────────────────────────────────────────
async function loadDashboard() {
  loading('dash-stats');
  loading('dash-agendamentos');
  loading('dash-aniversariantes');
  loading('dash-contas');
  loading('dash-estoque');

  const today = new Date().toISOString().split('T')[0];
  const weekEnd = new Date(Date.now() + 7*86400000).toISOString().split('T')[0];
  const monthStart = today.slice(0,7) + '-01';

  const [
    { data: agHoje },
    { data: agSemana },
    { data: transacoes },
    { data: clientes },
    { data: contasPagar },
    { data: estoquesBaixos },
    { data: config }
  ] = await Promise.all([
    sb.from('agendamentos').select('id,status').eq('data', today),
    sb.from('agendamentos').select('id,data,horario,valor,status,clientes(nome,telefone),servicos(nome)')
      .gte('data', today).lte('data', weekEnd).order('data').order('horario').limit(8),
    sb.from('transacoes').select('tipo,valor,status').gte('data', monthStart),
    sb.from('clientes').select('id,nome,data_nascimento,telefone').not('data_nascimento','is',null),
    sb.from('transacoes').select('id,descricao,valor,vencimento,status').eq('tipo','saida').neq('status','pago').order('vencimento').limit(5),
    sb.from('produtos').select('id,nome,quantidade,quantidade_minima,unidade').filter('quantidade','lte','quantidade_minima').limit(5),
    sb.from('config').select('msg_aniversario,desconto_aniversario,link_agendamento').single()
  ]);

  if (config) {
    birthdayMsg = config.msg_aniversario || birthdayMsg;
    birthdayDiscount = config.desconto_aniversario || birthdayDiscount;
    appUrl = config.link_agendamento || appUrl;
  }

  const entradas = (transacoes||[]).filter(t=>t.tipo==='entrada'&&t.status==='pago').reduce((s,t)=>s+t.valor,0);
  const saidas = (transacoes||[]).filter(t=>t.tipo==='saida'&&t.status==='pago').reduce((s,t)=>s+t.valor,0);
  const confirmados = (agHoje||[]).filter(a=>a.status==='confirmado').length;

  setHTML('dash-stats', `
    <div class="stat-card stat-accent">
      <div class="stat-label">Hoje</div>
      <div class="stat-value">${(agHoje||[]).length}</div>
      <div class="stat-sub">${confirmados} confirmados</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Esta semana</div>
      <div class="stat-value">${(agSemana||[]).length}</div>
      <div class="stat-sub">agendamentos</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Entradas do mês</div>
      <div class="stat-value" style="font-size:20px">${fmtBRL(entradas)}</div>
      <div class="stat-sub">faturado</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Saídas do mês</div>
      <div class="stat-value" style="font-size:20px;color:#8a4a4a">${fmtBRL(saidas)}</div>
      <div class="stat-sub">despesas</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Contas a pagar</div>
      <div class="stat-value" style="font-size:20px;color:#8a6e30">${fmtBRL((contasPagar||[]).reduce((s,t)=>s+t.valor,0))}</div>
      <div class="stat-sub">${(contasPagar||[]).length} pendências</div>
    </div>
  `);

  const rows = (agSemana||[]).map(ag => `
    <tr onclick="showClienteById('${ag.clientes?.id||''}')">
      <td><div class="cn-cell"><div class="av av-xs ${avColor(ag.clientes?.nome||'')}">${initials(ag.clientes?.nome||'?')}</div>${ag.clientes?.nome||'—'}</div></td>
      <td>${ag.servicos?.nome||'—'}</td>
      <td>${fmtDate(ag.data)}</td>
      <td>${(ag.horario||'').slice(0,5)}</td>
      <td class="vv" style="color:var(--green)">${fmtBRL(ag.valor)}</td>
      <td><span class="badge ${statusBadge[ag.status]||'b-abs'}">${statusLabel[ag.status]||ag.status}</span></td>
    </tr>
  `).join('');

  setHTML('dash-agendamentos', rows || '<tr><td colspan="6" class="empty">Sem agendamentos esta semana</td></tr>');

  // Aniversariantes próximos 14 dias
  const now = new Date();
  const upcoming = (clientes||[]).filter(c => {
    if (!c.data_nascimento) return false;
    const bd = new Date(c.data_nascimento);
    const next = new Date(now.getFullYear(), bd.getMonth(), bd.getDate());
    if (next < now) next.setFullYear(now.getFullYear()+1);
    return (next-now)/86400000 <= 14;
  }).sort((a,b) => {
    const d = c => { const bd=new Date(c.data_nascimento); const n=new Date(now.getFullYear(),bd.getMonth(),bd.getDate()); if(n<now)n.setFullYear(now.getFullYear()+1); return n; };
    return d(a)-d(b);
  }).slice(0,5);

  setHTML('dash-aniversariantes', upcoming.length ? upcoming.map(c => {
    const bd = new Date(c.data_nascimento);
    const next = new Date(now.getFullYear(), bd.getMonth(), bd.getDate());
    if (next < now) next.setFullYear(now.getFullYear()+1);
    const isToday = next.toDateString() === now.toDateString();
    const age = now.getFullYear() - bd.getFullYear();
    const msg = birthdayMsg.replace('{nome}', c.nome.split(' ')[0]).replace('{desconto}', birthdayDiscount).replace('{link}', appUrl);
    const tel = '55' + c.telefone.replace(/\D/g,'');
    return `
      <div class="birthday-row">
        <div class="av av-md ${avColor(c.nome)}">${initials(c.nome)}</div>
        <div class="flex-1">
          <div class="font-medium td">${c.nome}</div>
          <div class="text-light text-xs">${next.getDate().toString().padStart(2,'0')}/${(next.getMonth()+1).toString().padStart(2,'0')} · ${age} anos${isToday?' 🎉':''}</div>
        </div>
        <a href="https://wa.me/${tel}?text=${encodeURIComponent(msg)}" target="_blank" class="btn-wa-sm">💬 WA</a>
      </div>
    `;
  }).join('') : '<p class="empty">Sem aniversariantes nos próximos 14 dias</p>');

  setHTML('dash-contas', (contasPagar||[]).length ? (contasPagar||[]).map(c => `
    <div class="conta-row">
      <div class="flex-1">
        <div class="font-medium td">${c.descricao}</div>
        <div class="text-light text-xs">${c.vencimento ? fmtDate(c.vencimento) : '—'}</div>
      </div>
      <div style="text-align:right">
        <div class="vv" style="font-size:15px">${fmtBRL(c.valor)}</div>
        <span class="badge ${c.status==='atrasado'?'b-late':'b-pend'}">${c.status==='atrasado'?'Atrasado':'Pendente'}</span>
      </div>
    </div>
  `).join('') : '<p class="empty">Sem contas pendentes 🎉</p>');

  setHTML('dash-estoque', (estoquesBaixos||[]).length ? (estoquesBaixos||[]).map(p => `
    <div class="conta-row">
      <div class="flex-1 font-medium td">${p.nome}</div>
      <div style="color:${p.quantidade<=0?'#d06060':'#e0a050'};font-weight:600">${p.quantidade} ${p.unidade}.</div>
      <span class="badge ${p.quantidade<=0?'b-crit':'b-low'}">${p.quantidade<=0?'Crítico':'Baixo'}</span>
    </div>
  `).join('') : '<p class="empty">Estoque em dia ✓</p>');
}

// ── AGENDA ─────────────────────────────────────────────────
let agendaDate = new Date().toISOString().split('T')[0];

async function loadAgenda() {
  const dtLabel = new Date(agendaDate+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  document.getElementById('agenda-date-label').textContent = dtLabel.charAt(0).toUpperCase()+dtLabel.slice(1);
  loading('agenda-slots');

  const { data: ags } = await sb.from('agendamentos')
    .select('*,clientes(nome,telefone),servicos(nome)')
    .eq('data', agendaDate).order('horario');

  const HORAS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'];
  const bgs = { confirmado:'ab-conf', agendado:'ab-pend', realizado:'ab-done', cancelado:'ab-canc', nao_compareceu:'ab-abs' };

  setHTML('agenda-slots', HORAS.map(h => {
    const slot = (ags||[]).filter(a => a.horario?.startsWith(h.slice(0,2)));
    return `
      <div class="tslot">
        <div class="tlbl">${h}</div>
        <div class="tline">
          ${slot.length === 0 ? `<div class="empty-slot" onclick="openModal('modal-agendamento')">+ Encaixe</div>` :
            slot.map(ag => `
              <div class="ab ${bgs[ag.status]||'ab-conf'}">
                <div class="ab-name">${ag.clientes?.nome||'?'} · ${ag.servicos?.nome||'?'}</div>
                <div class="ab-det">
                  ${ag.duracao_min}min · ${fmtBRL(ag.valor)} · 
                  <span class="badge ${statusBadge[ag.status]||''}" style="font-size:10px">${statusLabel[ag.status]||''}</span>
                  ${ag.clientes?.telefone ? `<a href="https://wa.me/55${ag.clientes.telefone.replace(/\D/g,'')}" target="_blank" class="wa-link">💬</a>` : ''}
                </div>
              </div>
            `).join('')
          }
        </div>
      </div>
    `;
  }).join(''));
}

function agendaNav(dir) {
  const d = new Date(agendaDate+'T12:00:00');
  d.setDate(d.getDate()+dir);
  agendaDate = d.toISOString().split('T')[0];
  loadAgenda();
}

// ── CLIENTES ───────────────────────────────────────────────
let allClientes = [];

async function loadClientes() {
  loading('clientes-table');
  const [{ data: clientes }, { data: anamneses }] = await Promise.all([
    sb.from('clientes').select('*').order('nome'),
    sb.from('anamnese').select('cliente_id,status,token')
  ]);
  allClientes = clientes || [];
  const aMap = {};
  (anamneses||[]).forEach(a => aMap[a.cliente_id] = a);
  renderClientes(allClientes, aMap);
  window._anamneseMap = aMap;
}

function renderClientes(list, aMap) {
  aMap = aMap || window._anamneseMap || {};
  setHTML('clientes-table', list.map(c => `
    <tr onclick="showCliente('${c.id}')">
      <td><div class="cn-cell"><div class="av av-xs ${avColor(c.nome)}">${initials(c.nome)}</div><span class="clink">${c.nome}</span></div></td>
      <td>${c.telefone}</td>
      <td>${c.servico_favorito||'—'}</td>
      <td>${aMap[c.id]?.status==='preenchida'?'<span class="badge b-ok">✓ Preenchida</span>':aMap[c.id]?.status==='pendente'?'<span class="badge b-pend">Pendente</span>':'<span class="badge b-abs">Não enviada</span>'}</td>
      <td>${c.categoria?`<span class="tag">${c.categoria}</span>`:'—'}</td>
      <td><span class="badge ${c.status==='ativa'?'b-ok':'b-abs'}">${c.status==='ativa'?'Ativa':'Inativa'}</span></td>
    </tr>
  `).join('') || '<tr><td colspan="6" class="empty">Nenhuma cliente encontrada</td></tr>');
}

function filterClientes(q) {
  const f = allClientes.filter(c => c.nome.toLowerCase().includes(q.toLowerCase()) || c.telefone.includes(q));
  renderClientes(f);
}

async function showCliente(id) {
  const c = allClientes.find(x => x.id === id);
  if (!c) return;
  document.getElementById('clientes-list-view').classList.add('hidden');
  document.getElementById('cliente-profile-view').classList.remove('hidden');
  document.getElementById('htitle').textContent = c.nome;

  const [{ data: ags }, { data: anamnese }, { data: cb }] = await Promise.all([
    sb.from('agendamentos').select('*,servicos(nome)').eq('cliente_id', id).order('data',{ascending:false}).limit(20),
    sb.from('anamnese').select('*').eq('cliente_id', id).single(),
    sb.from('cashback').select('*').eq('cliente_id', id)
  ]);

  const totalGasto = (ags||[]).filter(a=>a.status==='realizado').reduce((s,a)=>s+a.valor,0);
  const visitas = (ags||[]).filter(a=>a.status==='realizado').length;
  const cbDisp = (cb||[]).filter(x=>x.status==='ativo').reduce((s,x)=>s+x.valor_cashback,0);
  const ultimo = (ags||[]).find(a=>a.status==='realizado');
  const proximo = (ags||[]).find(a=>['agendado','confirmado'].includes(a.status));
  const aLink = anamnese ? `${window.location.origin}#anamnese-publica?token=${anamnese.token}` : null;

  document.getElementById('profile-content').innerHTML = `
    <div class="ph">
      <div class="av av-lg ${avColor(c.nome)}">${initials(c.nome)}</div>
      <div class="flex-1">
        <div class="vv" style="font-size:22px;color:var(--td)">${c.nome}</div>
        <div class="text-light" style="font-size:12.5px;margin-top:2px">${c.telefone}${c.email?' · '+c.email:''}</div>
        <div style="display:flex;gap:6px;margin-top:6px;align-items:center">
          <span class="badge ${c.status==='ativa'?'b-ok':'b-abs'}">${c.status==='ativa'?'Ativa':'Inativa'}</span>
          ${c.categoria?`<span class="tag">${c.categoria}</span>`:''}
          ${anamnese?.status==='preenchida'?'<span class="badge b-ok">✓ Anamnese preenchida</span>':'<span class="badge b-pend">Anamnese pendente</span>'}
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0">
        <button class="btn btng" style="font-size:12px;padding:6px 11px" onclick="openEditCliente('${c.id}')">Editar</button>
        <button class="btn btnp" style="font-size:12px;padding:6px 11px" onclick="openModal('modal-agendamento')">+ Agendamento</button>
      </div>
    </div>

    <div class="anamnese-block">
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--green)" stroke-width="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
      <div class="flex-1">
        <div style="font-size:13px;font-weight:500;color:var(--td)">Ficha de Anamnese</div>
        <div style="font-size:11.5px;color:var(--tl);margin-top:2px">${anamnese?.status==='preenchida'?'Preenchida em '+fmtDate(anamnese.preenchida_em):'Envie o link para a cliente preencher'}</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
        ${aLink ? `
          <button class="btn btng" style="font-size:12px;padding:6px 11px" onclick="copyLink('${aLink}')">Copiar link</button>
          <a href="https://wa.me/55${c.telefone.replace(/\D/g,'')}?text=${encodeURIComponent('Olá! Preencha sua ficha de anamnese: '+aLink)}" target="_blank" class="btn btn-wa" style="font-size:12px;padding:6px 11px">Enviar via WA</a>
        ` : `<button class="btn btnp" style="font-size:12px;padding:6px 11px" onclick="criarAnamnese('${c.id}')">Gerar link</button>`}
        ${anamnese?.status==='preenchida'?`<button class="btn btnp" style="font-size:12px;padding:6px 11px" onclick="showTabContent('tab-anamnese')">Ver ficha →</button>`:''}
      </div>
    </div>

    <div class="ptabs">
      <div class="ptab active" onclick="switchTab(this,'tab-visao')">Visão geral</div>
      <div class="ptab" onclick="switchTab(this,'tab-historico')">Histórico</div>
      <div class="ptab" onclick="switchTab(this,'tab-anamnese')">Anamnese</div>
    </div>

    <div id="tab-visao">
      <div class="frow2" style="margin-bottom:12px">
        <div><div class="flabel">Data de nascimento</div><div class="fvalue">${c.data_nascimento?fmtDate(c.data_nascimento):'—'}</div></div>
        <div><div class="flabel">Endereço</div><div class="fvalue">${c.endereco||'—'}</div></div>
        <div><div class="flabel">Serviço favorito</div><div class="fvalue">${c.servico_favorito||'—'}</div></div>
        <div><div class="flabel">Origem</div><div class="fvalue">${c.origem||'—'}</div></div>
      </div>
      ${c.observacoes?`<div style="margin-top:14px"><div class="flabel" style="margin-bottom:7px">Observações</div><div style="background:var(--bg);border-radius:8px;padding:11px;font-size:13px;line-height:1.6">${c.observacoes}</div></div>`:''}
      ${(c.historico_quimico||[]).length?`<div style="margin-top:14px"><div class="flabel" style="margin-bottom:7px">Histórico químico</div><div style="display:flex;gap:5px;flex-wrap:wrap">${(c.historico_quimico||[]).map(h=>`<span class="tag">${h}</span>`).join('')}</div></div>`:''}
    </div>

    <div id="tab-historico" class="hidden">
      <table class="tbl">
        <thead><tr><th>Data</th><th>Serviço</th><th>Valor</th><th>Status</th></tr></thead>
        <tbody>
          ${(ags||[]).filter(a=>a.status==='realizado').map(a=>`
            <tr>
              <td>${fmtDate(a.data)}</td>
              <td>${a.servicos?.nome||'—'}</td>
              <td class="vv" style="color:var(--green)">${fmtBRL(a.valor)}</td>
              <td><span class="badge b-done">Realizado</span></td>
            </tr>
          `).join('') || '<tr><td colspan="4" class="empty">Sem histórico</td></tr>'}
        </tbody>
      </table>
    </div>

    <div id="tab-anamnese" class="hidden">
      ${anamnese?.status==='preenchida' ? renderAnamneseView(anamnese) : '<p class="empty">Ficha ainda não preenchida</p>'}
    </div>
  `;

  document.getElementById('profile-sidebar').innerHTML = `
    <div class="sc">
      <div style="margin-bottom:10px"><div class="slabel">Total investido</div><div class="vv sval">${fmtBRL(totalGasto)}</div></div>
      <div style="margin-bottom:10px"><div class="slabel">Visitas totais</div><div class="vv sval">${visitas}</div></div>
      <div><div class="slabel">Cashback disponível</div><div class="vv sval" style="color:var(--green)">${fmtBRL(cbDisp)}</div></div>
    </div>
    <div class="sc">
      <div style="margin-bottom:10px"><div class="slabel">Último atendimento</div><div style="font-size:13px;color:var(--td);margin-top:2px">${ultimo?fmtDate(ultimo.data)+' · '+ultimo.servicos?.nome:'Nenhum'}</div></div>
      <div><div class="slabel">Próximo agendamento</div><div style="font-size:13px;font-weight:500;color:var(--green);margin-top:2px">${proximo?fmtDate(proximo.data)+' · '+(proximo.horario||'').slice(0,5):'Nenhum agendado'}</div></div>
    </div>
    <div class="sc">
      <a href="https://wa.me/55${c.telefone.replace(/\D/g,'')}" target="_blank" class="btn btn-wa" style="width:100%;justify-content:center;margin-bottom:8px">Enviar WhatsApp</a>
      <button class="btn btng" style="width:100%;justify-content:center" onclick="switchTab(document.querySelector('.ptab'),'tab-historico')">Ver histórico</button>
    </div>
  `;
}

function renderAnamneseView(a) {
  const fields = [
    ['Tipo de cabelo', a.tipo_cabelo], ['Espessura', a.espessura], ['Densidade', a.densidade],
    ['Porosidade', a.porosidade], ['Elasticidade', a.elasticidade], ['Curvatura', a.curvatura],
    ['Proc. químico anterior', a.proc_quimico_anterior], ['Último procedimento', a.ultimo_procedimento],
    ['Fez alisamento', a.fez_alisamento!=null?(a.fez_alisamento?'Sim':'Não'):null],
    ['Qual alisamento', a.qual_alisamento],
    ['Tem coloração', a.tem_coloracao!=null?(a.tem_coloracao?'Sim':'Não'):null],
    ['Tem alergia', a.tem_alergia!=null?(a.tem_alergia?'Sim':'Não'):null],
    ['Couro sensível', a.couro_sensivel!=null?(a.couro_sensivel?'Sim':'Não'):null],
    ['Produtos atuais', a.produtos_atuais], ['Freq. lavagem', a.freq_lavagem],
    ['Usa calor', a.usa_calor!=null?(a.usa_calor?'Sim':'Não'):null],
  ].filter(f=>f[1]);
  return `
    <div style="background:var(--gl);border:1px solid #c8ddc5;border-radius:10px;padding:12px 14px;margin-bottom:14px">
      <div style="font-size:13px;font-weight:500;color:var(--gd)">✓ Preenchida em ${fmtDate(a.preenchida_em)}</div>
    </div>
    <div class="grid-2" style="gap:10px;margin-bottom:12px">
      ${fields.map(f=>`<div><div class="flabel">${f[0]}</div><div class="fvalue">${f[1]}</div></div>`).join('')}
    </div>
    ${(a.problemas||[]).length?`<div><div class="flabel" style="margin-bottom:6px">Problemas</div><div style="display:flex;gap:5px;flex-wrap:wrap">${a.problemas.map(p=>`<span class="tag">${p}</span>`).join('')}</div></div>`:''}
  `;
}

function showClienteById(id) { if(id) { nav('clientes'); setTimeout(()=>showCliente(id),500); } }

function backToClientes() {
  document.getElementById('clientes-list-view').classList.remove('hidden');
  document.getElementById('cliente-profile-view').classList.add('hidden');
  document.getElementById('htitle').textContent = 'Clientes';
}

function switchTab(el, tabId) {
  if(!el) return;
  el.closest('.ptabs').querySelectorAll('.ptab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  ['tab-visao','tab-historico','tab-anamnese'].forEach(id => {
    const el2 = document.getElementById(id);
    if(el2) el2.classList.toggle('hidden', id!==tabId);
  });
}

function showTabContent(tabId) {
  document.querySelectorAll('.ptab').forEach(t => {
    t.classList.toggle('active', t.getAttribute('onclick')?.includes(tabId));
  });
  ['tab-visao','tab-historico','tab-anamnese'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.classList.toggle('hidden', id!==tabId);
  });
}

function copyLink(link) {
  navigator.clipboard?.writeText(link).catch(()=>{});
  showToast('Link copiado!');
}

async function criarAnamnese(clienteId) {
  const { error } = await sb.from('anamnese').insert({ cliente_id: clienteId });
  if (!error) { showToast('Link criado! Recarregando...'); setTimeout(()=>showCliente(clienteId),1000); }
}

// ── SERVIÇOS ───────────────────────────────────────────────
async function loadServicos() {
  loading('servicos-list');
  const { data } = await sb.from('servicos').select('*').order('nome');
  setHTML('servicos-list', (data||[]).map(s => `
    <div class="svc-row ${s.status==='inativo'?'svc-inactive':''}">
      <div class="svc-ic">✂️</div>
      <div class="svc-inf">
        <div class="svc-nm">${s.nome}</div>
        ${s.descricao?`<div class="svc-ds">${s.descricao}</div>`:''}
      </div>
      <div class="svc-mt">
        <span style="font-size:12px;color:var(--tl)">${s.duracao_min}min</span>
        <div class="vv svc-pr">${fmtBRL(s.valor)}</div>
        <span class="badge ${s.status==='ativo'?'b-ok':'b-abs'}">${s.status==='ativo'?'Ativo':'Inativo'}</span>
        <button class="btn-icon" onclick="toggleServico('${s.id}','${s.status}')">⋯</button>
      </div>
    </div>
  `).join('') || '<p class="empty">Nenhum serviço cadastrado</p>');
}

async function toggleServico(id, status) {
  const novo = status==='ativo'?'inativo':'ativo';
  await sb.from('servicos').update({status:novo}).eq('id',id);
  loadServicos();
}

// ── FINANCEIRO ─────────────────────────────────────────────
async function loadFinanceiro() {
  loading('fin-stats');
  loading('fin-entradas');
  loading('fin-saidas');
  loading('fin-contas');
  const monthStart = new Date().toISOString().slice(0,7)+'-01';
  const [{ data: transacoes }, { data: parcelas }] = await Promise.all([
    sb.from('transacoes').select('*,clientes(nome)').gte('data',monthStart).order('data',{ascending:false}),
    sb.from('parcelas').select('*,fornecedores(nome)').neq('status','pago').order('vencimento').limit(5)
  ]);
  const entradas = (transacoes||[]).filter(t=>t.tipo==='entrada'&&t.status==='pago').reduce((s,t)=>s+t.valor,0);
  const saidas = (transacoes||[]).filter(t=>t.tipo==='saida'&&t.status==='pago').reduce((s,t)=>s+t.valor,0);
  const aPagar = (transacoes||[]).filter(t=>t.tipo==='saida'&&t.status!=='pago').reduce((s,t)=>s+t.valor,0);
  setHTML('fin-stats', `
    <div class="stat-card"><div class="stat-label">Entradas</div><div class="vv" style="font-size:22px;color:#3a6e3a">${fmtBRL(entradas)}</div></div>
    <div class="stat-card"><div class="stat-label">Saídas</div><div class="vv" style="font-size:22px;color:#8a3a3a">${fmtBRL(saidas)}</div></div>
    <div class="stat-card"><div class="stat-label">Saldo</div><div class="vv" style="font-size:22px;color:var(--green)">${fmtBRL(entradas-saidas)}</div></div>
    <div class="stat-card"><div class="stat-label">A pagar</div><div class="vv" style="font-size:22px;color:#8a6e30">${fmtBRL(aPagar)}</div></div>
  `);
  const sv={pago:'b-ok',pendente:'b-pend',atrasado:'b-late'}, sl={pago:'Pago',pendente:'Pendente',atrasado:'Atrasado'};
  setHTML('fin-entradas', (transacoes||[]).filter(t=>t.tipo==='entrada').slice(0,10).map(t=>`
    <tr>
      <td><div class="cn-cell"><div class="av av-xs ${avColor(t.clientes?.nome||'')}">${initials(t.clientes?.nome||'?')}</div>${t.clientes?.nome||'—'}</div></td>
      <td>${t.descricao}</td>
      <td class="vv" style="color:var(--green)">${fmtBRL(t.valor)}</td>
      <td>${t.forma_pagamento?`<span class="tag">${t.forma_pagamento}</span>`:'—'}</td>
      <td style="color:var(--tl)">${fmtDate(t.data)}</td>
      <td><span class="badge ${sv[t.status]}">${sl[t.status]}</span></td>
    </tr>
  `).join('')||'<tr><td colspan="6" class="empty">Sem entradas</td></tr>');
  setHTML('fin-saidas', (transacoes||[]).filter(t=>t.tipo==='saida').slice(0,10).map(t=>`
    <tr>
      <td style="font-weight:500;color:var(--td)">${t.descricao}</td>
      <td><span class="tag">${t.categoria}</span></td>
      <td class="vv" style="color:#8a4a4a">${fmtBRL(t.valor)}</td>
      <td style="color:var(--tl)">${t.vencimento?fmtDate(t.vencimento):'—'}</td>
      <td><span class="badge ${sv[t.status]}">${sl[t.status]}</span></td>
    </tr>
  `).join('')||'<tr><td colspan="5" class="empty">Sem saídas</td></tr>');
  setHTML('fin-contas', [...(transacoes||[]).filter(t=>t.tipo==='saida'&&t.status!=='pago'), ...(parcelas||[])].slice(0,6).map(c=>`
    <div class="conta-row">
      <div class="flex-1"><div class="font-medium td">${c.descricao||c.fornecedores?.nome}</div><div class="text-light text-xs">${c.vencimento?fmtDate(c.vencimento):'—'}</div></div>
      <div style="text-align:right"><div class="vv" style="font-size:15px">${fmtBRL(c.valor)}</div><span class="badge ${sv[c.status]}">${sl[c.status]}</span></div>
    </div>
  `).join('')||'<p class="empty">Sem pendências 🎉</p>');
}

// ── CASHBACK ───────────────────────────────────────────────
async function loadCashback() {
  loading('cb-stats'); loading('cb-table');
  const { data } = await sb.from('cashback').select('*,clientes(nome),agendamentos(servicos(nome))').order('created_at',{ascending:false});
  const disp=(data||[]).filter(c=>c.status==='ativo').reduce((s,c)=>s+c.valor_cashback,0);
  const acum=(data||[]).reduce((s,c)=>s+c.valor_cashback,0);
  const usado=(data||[]).filter(c=>c.status==='usado').reduce((s,c)=>s+c.valor_cashback,0);
  setHTML('cb-stats',`
    <div class="stat-card"><div class="stat-label">Disponível</div><div class="vv" style="font-size:24px;color:var(--green)">${fmtBRL(disp)}</div></div>
    <div class="stat-card"><div class="stat-label">Acumulado</div><div class="vv" style="font-size:24px;color:var(--td)">${fmtBRL(acum)}</div></div>
    <div class="stat-card"><div class="stat-label">Usado</div><div class="vv" style="font-size:24px;color:#8a6e30">${fmtBRL(usado)}</div></div>
  `);
  const sv={ativo:'b-ok',usado:'b-done',expirado:'b-abs'}, sl={ativo:'Ativo',usado:'Usado',expirado:'Expirado'};
  setHTML('cb-table',(data||[]).map(c=>`
    <tr>
      <td><div class="cn-cell"><div class="av av-xs ${avColor(c.clientes?.nome||'')}">${initials(c.clientes?.nome||'?')}</div>${c.clientes?.nome||'—'}</div></td>
      <td>${c.agendamentos?.servicos?.nome||'—'}</td>
      <td>${fmtBRL(c.valor_servico)}</td>
      <td><span class="tag">${c.forma_pagamento}</span></td>
      <td style="color:var(--green);font-weight:600">${c.percentual}%</td>
      <td class="vv" style="color:var(--green)">${fmtBRL(c.valor_cashback)}</td>
      <td><span class="badge ${sv[c.status]}">${sl[c.status]}</span></td>
    </tr>
  `).join('')||'<tr><td colspan="7" class="empty">Sem registros</td></tr>');
}

// ── ESTOQUE ────────────────────────────────────────────────
let allProdutos = [];
async function loadEstoque() {
  loading('estoque-table');
  const [{ data: produtos }, { data: fornecedores }] = await Promise.all([
    sb.from('produtos').select('*,fornecedores(nome)').order('nome'),
    sb.from('fornecedores').select('id,nome').order('nome')
  ]);
  allProdutos = produtos || [];
  window._fornecedores = fornecedores || [];
  renderEstoque(allProdutos);
}

function renderEstoque(list) {
  const getS = (q,m) => q<=0?'b-crit':q<=m?'b-low':'b-ok';
  const getL = (q,m) => q<=0?'Crítico':q<=m?'Baixo':'OK';
  const getC = (q,m) => q<=m/2?'#d06060':q<=m?'#e0a050':'inherit';
  setHTML('estoque-table', list.map(p=>`
    <tr class="${p.quantidade<=p.quantidade_minima?'row-alert':''}">
      <td style="font-weight:500;color:var(--td)">${p.nome}</td>
      <td><span class="tag">${p.categoria}</span></td>
      <td style="color:var(--tl)">${p.fornecedores?.nome||'—'}</td>
      <td style="color:var(--tl)">${p.ultima_compra?fmtDate(p.ultima_compra):'—'}</td>
      <td style="font-weight:600;color:${getC(p.quantidade,p.quantidade_minima)}">${p.quantidade}</td>
      <td style="color:var(--tl)">${p.quantidade_minima}</td>
      <td><div class="sbar-wrap"><div class="sbar-fill ${p.quantidade<=0?'sb-crit':p.quantidade<=p.quantidade_minima?'sb-low':'sb-ok'}" style="width:${Math.min(100,Math.round(p.quantidade/(p.quantidade_minima*3)*100))}%"></div></div></td>
      <td><span class="badge ${getS(p.quantidade,p.quantidade_minima)}">${getL(p.quantidade,p.quantidade_minima)}</span></td>
    </tr>
  `).join('')||'<tr><td colspan="8" class="empty">Nenhum produto</td></tr>');
}

function filterEstoque(q) { renderEstoque(allProdutos.filter(p=>p.nome.toLowerCase().includes(q.toLowerCase()))); }

// ── FORNECEDORES ───────────────────────────────────────────
async function loadFornecedores() {
  loading('forn-table');
  const { data } = await sb.from('fornecedores').select('*,parcelas(id,valor,status)').order('nome');
  setHTML('forn-table', (data||[]).map(f=>{
    const parc=f.parcelas||[];
    const em=parc.filter(p=>p.status!=='pago').reduce((s,p)=>s+p.valor,0);
    const atras=parc.filter(p=>p.status==='atrasado').length;
    return `
      <tr onclick="showFornecedor('${f.id}')">
        <td style="font-weight:500;color:var(--td)">${f.nome}</td>
        <td style="color:var(--tl)">${f.telefone||'—'}</td>
        <td class="vv" style="font-size:16px">${fmtBRL(em)}</td>
        <td><span class="badge ${atras>0?'b-late':'b-pend'}">${atras>0?atras+' atrasada(s)':parc.filter(p=>p.status==='pendente').length+' pendente(s)'}</span></td>
        <td><span class="badge ${atras>0?'b-late':'b-ok'}">${atras>0?'Atraso':'Regular'}</span></td>
        <td><span class="link-sm">Ver parcelas →</span></td>
      </tr>
    `;
  }).join('')||'<tr><td colspan="6" class="empty">Nenhum fornecedor</td></tr>');
}

async function showFornecedor(id) {
  const { data: f } = await sb.from('fornecedores').select('*').eq('id',id).single();
  const { data: parcelas } = await sb.from('parcelas').select('*').eq('fornecedor_id',id).order('vencimento');
  if (!f) return;
  document.getElementById('forn-list-view').classList.add('hidden');
  document.getElementById('forn-detail-view').classList.remove('hidden');
  document.getElementById('htitle').textContent = f.nome;
  const em=(parcelas||[]).filter(p=>p.status!=='pago').reduce((s,p)=>s+p.valor,0);
  const sv={pago:'b-ok',pendente:'b-pend',atrasado:'b-late'}, sl={pago:'Pago',pendente:'Pendente',atrasado:'Atrasado'};
  setHTML('forn-detail-content',`
    <div style="display:flex;align-items:center;gap:14px;padding-bottom:16px;border-bottom:1px solid var(--border);margin-bottom:16px">
      <div class="av av-lg ${avColor(f.nome)}" style="font-size:14px">${f.nome.slice(0,2).toUpperCase()}</div>
      <div><div class="vv" style="font-size:20px;color:var(--td)">${f.nome}</div><div style="font-size:12px;color:var(--tl);margin-top:2px">${[f.telefone,f.email].filter(Boolean).join(' · ')}</div></div>
    </div>
    <div class="vv" style="font-size:15px;color:var(--td);margin-bottom:12px">Parcelas</div>
    <table class="tbl">
      <thead><tr><th>Descrição</th><th>Valor</th><th>Vencimento</th><th>Status</th></tr></thead>
      <tbody>
        ${(parcelas||[]).map(p=>`
          <tr>
            <td style="font-weight:500;color:var(--td)">${p.descricao}</td>
            <td class="vv">${fmtBRL(p.valor)}</td>
            <td style="color:${p.status==='atrasado'?'#c47a7a':'var(--tl)'}">${fmtDate(p.vencimento)}</td>
            <td><span class="badge ${sv[p.status]}">${sl[p.status]}</span></td>
          </tr>
        `).join('')||'<tr><td colspan="4" class="empty">Sem parcelas</td></tr>'}
      </tbody>
    </table>
  `);
  setHTML('forn-detail-sidebar',`
    <div class="sc" style="margin-bottom:12px">
      <div style="margin-bottom:10px"><div class="slabel">Total em aberto</div><div class="vv sval" style="color:#8a4a4a">${fmtBRL(em)}</div></div>
    </div>
    <div class="sc">
      <button class="btn btnp" style="width:100%;justify-content:center;margin-bottom:8px">Registrar pagamento</button>
      <button class="btn btng" style="width:100%;justify-content:center">Novo pedido</button>
    </div>
  `);
}

function backToFornecedores() {
  document.getElementById('forn-list-view').classList.remove('hidden');
  document.getElementById('forn-detail-view').classList.add('hidden');
  document.getElementById('htitle').textContent = 'Fornecedores';
}

// ── RELATÓRIOS ─────────────────────────────────────────────
async function loadRelatorios() {
  loading('rel-stats'); loading('rel-svcs'); loading('rel-pagamentos');
  const monthStart = new Date().toISOString().slice(0,7)+'-01';
  const [{ data: transacoes }, { data: ags }] = await Promise.all([
    sb.from('transacoes').select('tipo,valor,status,categoria').gte('data',monthStart),
    sb.from('agendamentos').select('valor,status,servicos(nome)').eq('status','realizado').gte('data',monthStart)
  ]);
  const fat=(transacoes||[]).filter(t=>t.tipo==='entrada'&&t.status==='pago').reduce((s,t)=>s+t.valor,0);
  const desp=(transacoes||[]).filter(t=>t.tipo==='saida'&&t.status==='pago').reduce((s,t)=>s+t.valor,0);
  setHTML('rel-stats',`
    <div class="stat-card stat-accent"><div class="stat-label">Total faturado</div><div class="vv" style="font-size:24px;color:var(--gd)">${fmtBRL(fat)}</div></div>
    <div class="stat-card"><div class="stat-label">Lucro estimado</div><div class="vv" style="font-size:24px;color:#3a6e3a">${fmtBRL(fat-desp)}</div></div>
    <div class="stat-card"><div class="stat-label">Ticket médio</div><div class="vv" style="font-size:24px;color:var(--td)">${fmtBRL((ags||[]).length?fat/(ags||[]).length:0)}</div></div>
  `);
  const svcMap={};
  (ags||[]).forEach(a=>{const n=a.servicos?.nome||'Outros';if(!svcMap[n])svcMap[n]={nome:n,count:0,receita:0};svcMap[n].count++;svcMap[n].receita+=a.valor;});
  const topSvcs=Object.values(svcMap).sort((a,b)=>b.receita-a.receita).slice(0,5);
  setHTML('rel-svcs', topSvcs.map((s,i)=>`
    <tr>
      <td class="vv" style="font-size:18px;color:${i===0?'var(--green)':'var(--tl)'}">${i+1}</td>
      <td style="font-weight:500;color:var(--td)">${s.nome}</td>
      <td>${s.count}</td>
      <td class="vv" style="color:var(--green)">${fmtBRL(s.receita)}</td>
    </tr>
  `).join('')||'<tr><td colspan="4" class="empty">Sem dados</td></tr>');
  const pgMap={};
  (transacoes||[]).filter(t=>t.tipo==='entrada'&&t.status==='pago').forEach(t=>{if(t.categoria)pgMap[t.categoria]=(pgMap[t.categoria]||0)+t.valor;});
  const total=Object.values(pgMap).reduce((s,v)=>s+v,0)||1;
  setHTML('rel-pagamentos', Object.entries(pgMap).sort(([,a],[,b])=>b-a).map(([k,v])=>`
    <div style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:3px"><span>${k}</span><span style="font-weight:500">${Math.round(v/total*100)}%</span></div>
      <div style="background:var(--border);border-radius:3px;height:6px;overflow:hidden"><div style="width:${Math.round(v/total*100)}%;height:100%;background:var(--green);border-radius:3px"></div></div>
    </div>
  `).join('')||'<p class="empty">Sem dados</p>');
}

// ── ANAMNESE ADMIN ─────────────────────────────────────────
async function loadAnamnese() {
  loading('anam-stats'); loading('anam-table');
  const { data } = await sb.from('anamnese').select('*,clientes(nome,telefone)').order('created_at',{ascending:false});
  const total=(data||[]).length, preen=(data||[]).filter(f=>f.status==='preenchida').length, pend=(data||[]).filter(f=>f.status==='pendente').length;
  setHTML('anam-stats',`
    <div class="stat-card"><div class="stat-label">Total</div><div class="vv" style="font-size:26px;color:var(--td)">${total}</div></div>
    <div class="stat-card"><div class="stat-label">Preenchidas</div><div class="vv" style="font-size:26px;color:var(--green)">${preen}</div></div>
    <div class="stat-card"><div class="stat-label">Pendentes</div><div class="vv" style="font-size:26px;color:#8a6e30">${pend}</div></div>
  `);
  setHTML('anam-table',(data||[]).map(f=>{
    const link = `${window.location.origin}${window.location.pathname}#anamnese-publica?token=${f.token}`;
    return `
      <tr>
        <td><div class="cn-cell"><div class="av av-xs ${avColor(f.clientes?.nome||'')}">${initials(f.clientes?.nome||'?')}</div>${f.clientes?.nome||'—'}</div></td>
        <td style="color:var(--tl)">${fmtDate(f.created_at)}</td>
        <td style="color:var(--tl)">${f.preenchida_em?fmtDate(f.preenchida_em):'—'}</td>
        <td>${f.tipo_cabelo||'—'}</td>
        <td>${f.tem_alergia?'<span class="badge b-pend">Sim</span>':f.status==='preenchida'?'<span class="badge b-ok">Não</span>':'—'}</td>
        <td><span class="badge ${f.status==='preenchida'?'b-ok':'b-pend'}">${f.status==='preenchida'?'✓ Preenchida':'Pendente'}</span></td>
        <td>${f.status==='preenchida'?'<span class="link-sm" onclick="showAnamneseFicha(\''+f.id+'\')">Ver ficha →</span>':'<button class="btn btng" style="font-size:11px;padding:4px 9px" onclick="copyLink(\''+link+'\')">Copiar link</button>'}</td>
      </tr>
    `;
  }).join('')||'<tr><td colspan="7" class="empty">Nenhuma ficha</td></tr>');
}

// ── CONFIGURAÇÕES ──────────────────────────────────────────
async function loadConfiguracoes() {
  const { data } = await sb.from('config').select('*').single();
  if (!data) return;
  document.getElementById('cfg-nome').value = data.nome_salao||'';
  document.getElementById('cfg-telefone').value = data.telefone||'';
  document.getElementById('cfg-endereco').value = data.endereco||'';
  document.getElementById('cfg-abertura').value = data.abertura||'08:30';
  document.getElementById('cfg-fechamento').value = data.fechamento||'19:00';
  document.getElementById('cfg-msg-confirmacao').value = data.msg_confirmacao||'';
  document.getElementById('cfg-msg-aniversario').value = data.msg_aniversario||'';
  document.getElementById('cfg-desconto').value = data.desconto_aniversario||'15%';
  document.getElementById('cfg-link').value = data.link_agendamento||'';
  const dias = data.dias_ativos||[1,2,3,4,5,6];
  document.querySelectorAll('.day-chip').forEach((chip,i)=>{
    chip.classList.toggle('active', dias.includes(i));
  });
  window._configId = data.id;
}

async function salvarConfig() {
  const btn = document.getElementById('btn-salvar-cfg');
  btn.textContent = 'Salvando...';
  btn.disabled = true;
  const dias=[];
  document.querySelectorAll('.day-chip').forEach((c,i)=>{ if(c.classList.contains('active')) dias.push(i); });
  const { error } = await sb.from('config').update({
    nome_salao: document.getElementById('cfg-nome').value,
    telefone: document.getElementById('cfg-telefone').value,
    endereco: document.getElementById('cfg-endereco').value,
    abertura: document.getElementById('cfg-abertura').value,
    fechamento: document.getElementById('cfg-fechamento').value,
    dias_ativos: dias,
    msg_confirmacao: document.getElementById('cfg-msg-confirmacao').value,
    msg_aniversario: document.getElementById('cfg-msg-aniversario').value,
    desconto_aniversario: document.getElementById('cfg-desconto').value,
    link_agendamento: document.getElementById('cfg-link').value,
  }).eq('id', window._configId);
  btn.disabled = false;
  if (error) { btn.textContent = '❌ Erro'; setTimeout(()=>btn.textContent='Salvar configurações',2000); }
  else { btn.textContent = '✓ Salvo!'; setTimeout(()=>btn.textContent='Salvar configurações',2000); }
}

// ── MODAIS ─────────────────────────────────────────────────
function openModal(id) { document.getElementById(id)?.classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }

async function salvarCliente() {
  const btn = document.getElementById('btn-salvar-cliente');
  const nome = document.getElementById('new-nome').value;
  const telefone = document.getElementById('new-telefone').value;
  if (!nome || !telefone) { showToast('Nome e telefone são obrigatórios', 'error'); return; }
  btn.innerHTML = '<span class="spinner-sm"></span> Salvando...'; btn.disabled = true;
  const { error } = await sb.from('clientes').insert({
    nome, telefone,
    email: document.getElementById('new-email').value||null,
    data_nascimento: document.getElementById('new-nasc').value||null,
    categoria: document.getElementById('new-cat').value||'Nova',
    endereco: document.getElementById('new-end').value||null,
    servico_favorito: document.getElementById('new-svc-fav').value||null,
    origem: document.getElementById('new-origem').value||null,
    status: 'ativa',
  });
  btn.disabled = false;
  if (error) { btn.innerHTML = '❌ Erro'; setTimeout(()=>{btn.innerHTML='Salvar cliente';}, 2000); }
  else {
    btn.innerHTML = '✓ Salvo!';
    setTimeout(()=>{ closeModal('modal-cliente'); btn.innerHTML='Salvar cliente'; loadClientes(); }, 1000);
  }
}

async function salvarAgendamento() {
  const btn = document.getElementById('btn-salvar-ag');
  const clienteId = document.getElementById('ag-cliente').value;
  const servicoId = document.getElementById('ag-servico').value;
  const data = document.getElementById('ag-data').value;
  const horario = document.getElementById('ag-horario').value;
  if (!clienteId || !servicoId || !data || !horario) { showToast('Preencha todos os campos obrigatórios', 'error'); return; }
  btn.innerHTML = '<span class="spinner-sm"></span> Salvando...'; btn.disabled = true;
  const { data: svc } = await sb.from('servicos').select('duracao_min,valor').eq('id',servicoId).single();
  const valor = parseFloat(document.getElementById('ag-valor').value) || svc?.valor || 0;
  const { error } = await sb.from('agendamentos').insert({
    cliente_id: clienteId, servico_id: servicoId, data, horario,
    profissional: document.getElementById('ag-profissional').value||'Deise',
    duracao_min: svc?.duracao_min||60, valor, status: 'agendado',
    observacoes: document.getElementById('ag-obs').value||null,
  });
  btn.disabled = false;
  if (error) { btn.innerHTML = '❌ Erro'; setTimeout(()=>{btn.innerHTML='Agendar';},2000); }
  else { btn.innerHTML = '✓ Agendado!'; setTimeout(()=>{ closeModal('modal-agendamento'); btn.innerHTML='Agendar'; loadPage(currentPage); },1000); }
}

async function salvarProduto() {
  const btn = document.getElementById('btn-salvar-produto');
  const nome = document.getElementById('prod-nome').value;
  const categoria = document.getElementById('prod-cat').value;
  if (!nome || !categoria) { showToast('Nome e categoria são obrigatórios', 'error'); return; }
  btn.innerHTML = '<span class="spinner-sm"></span> Salvando...'; btn.disabled = true;
  const { error } = await sb.from('produtos').insert({
    nome, categoria,
    fornecedor_id: document.getElementById('prod-forn').value||null,
    quantidade: parseInt(document.getElementById('prod-qtd').value)||0,
    quantidade_minima: parseInt(document.getElementById('prod-qtd-min').value)||5,
    unidade: document.getElementById('prod-unidade').value||'un',
  });
  btn.disabled = false;
  if (error) { btn.innerHTML = '❌ Erro'; setTimeout(()=>{btn.innerHTML='Salvar produto';},2000); }
  else { btn.innerHTML = '✓ Salvo!'; setTimeout(()=>{ closeModal('modal-produto'); btn.innerHTML='Salvar produto'; loadEstoque(); },1000); }
}

async function salvarTransacao(tipo) {
  const btn = document.getElementById('btn-salvar-trans');
  const descricao = document.getElementById('trans-desc').value;
  const valor = document.getElementById('trans-valor').value;
  const categoria = document.getElementById('trans-cat').value;
  if (!descricao || !valor || !categoria) { showToast('Preencha descrição, valor e categoria', 'error'); return; }
  btn.innerHTML = '<span class="spinner-sm"></span> Salvando...'; btn.disabled = true;
  const { error } = await sb.from('transacoes').insert({
    tipo, descricao, categoria,
    valor: parseFloat(valor.replace(',','.')),
    data: document.getElementById('trans-data').value||new Date().toISOString().split('T')[0],
    vencimento: document.getElementById('trans-venc').value||null,
    status: document.getElementById('trans-status').value||'pago',
    forma_pagamento: document.getElementById('trans-pgto').value||null,
  });
  btn.disabled = false;
  if (error) { btn.innerHTML = '❌ Erro'; setTimeout(()=>{btn.innerHTML='Lançar';},2000); }
  else { btn.innerHTML = '✓ Lançado!'; setTimeout(()=>{ closeModal('modal-transacao'); btn.innerHTML='Lançar'; loadFinanceiro(); },1000); }
}

// Preenche select de clientes no modal
async function populateAgModal() {
  const [{ data: clientes }, { data: servicos }] = await Promise.all([
    sb.from('clientes').select('id,nome').eq('status','ativa').order('nome'),
    sb.from('servicos').select('id,nome,valor,duracao_min').eq('status','ativo').order('nome')
  ]);
  const selC = document.getElementById('ag-cliente');
  const selS = document.getElementById('ag-servico');
  if(selC) selC.innerHTML = '<option value="">Selecione a cliente...</option>' + (clientes||[]).map(c=>`<option value="${c.id}">${c.nome}</option>`).join('');
  if(selS) { selS.innerHTML = '<option value="">Selecione o serviço...</option>' + (servicos||[]).map(s=>`<option value="${s.id}" data-valor="${s.valor}">${s.nome}</option>`).join('');
    selS.onchange = () => { const opt=selS.selectedOptions[0]; if(opt?.dataset.valor) document.getElementById('ag-valor').value=opt.dataset.valor; };
  }
  openModal('modal-agendamento');
}

async function populateProdModal() {
  const forn = window._fornecedores || [];
  const sel = document.getElementById('prod-forn');
  if(sel) sel.innerHTML = '<option value="">Selecione...</option>' + forn.map(f=>`<option value="${f.id}">${f.nome}</option>`).join('');
  openModal('modal-produto');
}

// ── TOAST ──────────────────────────────────────────────────
function showToast(msg, type='success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + (type==='error'?'toast-error':'toast-success');
  setTimeout(()=>t.classList.remove('show'),3000);
}

// ── ANAMNESE PÚBLICA ───────────────────────────────────────
async function loadAnamnesePub(token) {
  const { data: anamnese } = await sb.from('anamnese').select('*,clientes(nome)').eq('token',token).single();
  const wrap = document.getElementById('anam-pub-wrap');
  if (!anamnese || !wrap) return;
  document.getElementById('anam-pub-nome').textContent = anamnese.clientes?.nome?.split(' ')[0] || '';
  if (anamnese.status === 'preenchida') {
    wrap.innerHTML = '<div style="text-align:center;padding:40px"><div style="font-size:48px;margin-bottom:16px">✅</div><div class="vv" style="font-size:24px;color:var(--td);margin-bottom:8px">Ficha já preenchida!</div><p style="color:var(--tl);font-size:13.5px">Esta ficha já foi preenchida. Entre em contato com o estúdio para atualizações.</p></div>';
    return;
  }
  window._anamneseToken = token;
}

async function enviarAnamnese() {
  const btn = document.getElementById('btn-enviar-anam');
  btn.innerHTML = '<span class="spinner-sm"></span> Enviando...'; btn.disabled = true;
  const bool = id => { const v=document.querySelector(`input[name="${id}"]:checked`); return v?v.value==='sim':null; };
  const problemas = [...document.querySelectorAll('.prob-check:checked')].map(c=>c.value);
  const { error } = await sb.from('anamnese').update({
    status:'preenchida', preenchida_em:new Date().toISOString(),
    tipo_cabelo:document.querySelector('input[name="tipo"]:checked')?.value||null,
    espessura:document.querySelector('input[name="esp"]:checked')?.value||null,
    densidade:document.querySelector('input[name="den"]:checked')?.value||null,
    porosidade:document.querySelector('input[name="por"]:checked')?.value||null,
    elasticidade:document.querySelector('input[name="elas"]:checked')?.value||null,
    curvatura:document.getElementById('curvatura')?.value||null,
    proc_quimico_anterior:document.getElementById('proc-anterior')?.value||null,
    ultimo_procedimento:document.getElementById('ult-proc')?.value||null,
    fez_alisamento:bool('alis'), qual_alisamento:document.getElementById('qual-alis')?.value||null,
    tem_coloracao:bool('color'), teve_quebra:bool('queda'),
    tem_alergia:bool('alergia'), teve_reacao:bool('reacao'),
    queda_apos_proc:bool('qued2'), couro_sensivel:bool('sensivel'),
    produtos_atuais:document.getElementById('produtos-atuais')?.value||null,
    freq_lavagem:document.getElementById('freq-lav')?.value||null,
    usa_calor:bool('calor'), problemas:problemas.length?problemas:null, termo_aceito:true,
  }).eq('token', window._anamneseToken);
  btn.disabled = false;
  if (error) { btn.innerHTML = '❌ Erro ao enviar'; }
  else { document.getElementById('anam-pub-form').classList.add('hidden'); document.getElementById('anam-pub-success').classList.remove('hidden'); }
}

// ── INIT ───────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  // Verifica se é página de anamnese pública
  const hash = window.location.hash;
  if (hash.startsWith('#anamnese-publica')) {
    const token = new URLSearchParams(hash.split('?')[1]).get('token');
    if (token) {
      document.getElementById('app').classList.add('hidden');
      document.getElementById('anamnese-publica-page').classList.remove('hidden');
      await loadAnamnesePub(token);
      return;
    }
  }
  nav('dashboard');
});
