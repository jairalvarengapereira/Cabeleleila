const API_URL = '/api';

let currentClienteId = null;
let servicos = [];
let servicosSelecionados = [];
let historicoTelefone = null;
let horarioSelecionado = null;
let horariosOcupados = new Set();
let configHorarios = { horario_inicio: '07:00', horario_fim: '23:00' };

document.addEventListener('DOMContentLoaded', () => {
  init();
});

async function init() {
  await loadServicos();
  await loadConfiguracoes();
  setupEventListeners();
  popularSelectsHorario();
}

function popularSelectsHorario() {
  const inicio = document.getElementById('horario-inicio');
  const fim = document.getElementById('horario-fim');
  if (!inicio || !fim) return;
  
  inicio.innerHTML = '';
  fim.innerHTML = '';
  
  for (let hora = 0; hora < 24; hora++) {
    for (let minuto = 0; minuto < 60; minuto += 30) {
      const horaStr = `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
      inicio.add(new Option(horaStr, horaStr));
      fim.add(new Option(horaStr, horaStr));
    }
  }
}

async function loadConfiguracoes() {
  try {
    const response = await fetch(`${API_URL}/configuracoes`);
    if (response.ok) {
      configHorarios = await response.json();
      const inicio = document.getElementById('horario-inicio');
      const fim = document.getElementById('horario-fim');
      if (inicio) inicio.value = configHorarios.horario_inicio || '07:00';
      if (fim) fim.value = configHorarios.horario_fim || '23:00';
    }
  } catch (error) {
    console.error('Erro ao carregar configurações:', error);
  }
}

function setupEventListeners() {
  document.getElementById('btn-cliente').addEventListener('click', () => showArea('cliente'));
  document.getElementById('btn-admin').addEventListener('click', () => {
    if (window.adminAutenticado) {
      showArea('admin');
      loadDashboard();
    } else {
      document.getElementById('modal-titulo').textContent = 'Acesso Administrativo';
      document.getElementById('modal-body').innerHTML = `<div class="form-group"><label for="admin-senha">Digite a senha de acesso:</label><input type="password" id="admin-senha" placeholder="Senha"></div>`;
      document.getElementById('modal-actions').innerHTML = `<button type="button" class="btn-primary" onclick="verificarSenhaAdmin()">Entrar</button><button type="button" class="btn-secondary" onclick="closeModal()">Cancelar</button>`;
      document.getElementById('modal').classList.add('active');
    }
  });

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
    });
  });

  document.querySelectorAll('.tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = e.target.dataset.tab;
      showTab('tab-' + tab, '.tabs');
    });
  });

  document.querySelectorAll('.tabs-admin .tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = e.target.dataset.tab;
      showTab('tab-' + tab, '.tabs-admin');
    });
  });

  document.getElementById('btn-buscar-cliente').addEventListener('click', buscarCliente);
  document.getElementById('btn-criar-cliente').addEventListener('click', criarCliente);
  document.getElementById('form-agendamento').addEventListener('submit', (e) => { e.preventDefault(); criarAgendamento(e); });
  document.getElementById('btn-buscar-historico').addEventListener('click', buscarHistorico);
  document.getElementById('agendamento-data').addEventListener('change', async (e) => { await carregarHorariosOcupados(e.target.value); });
  document.getElementById('btn-salvar-horarios')?.addEventListener('click', async () => {
    const inicio = document.getElementById('horario-inicio').value;
    const fim = document.getElementById('horario-fim').value;
    if (!inicio || !fim) { showToast('Preencha os horários', 'warning'); return; }
    try {
      await fetch(`${API_URL}/configuracoes`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave: 'horario_inicio', valor: inicio }) });
      await fetch(`${API_URL}/configuracoes`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave: 'horario_fim', valor: fim }) });
      configHorarios.horario_inicio = inicio;
      configHorarios.horario_fim = fim;
      showToast('Horários salvos!', 'success');
    } catch (error) { showToast('Erro ao salvar', 'error'); }
  });
  document.getElementById('btn-novo-servico')?.addEventListener('click', showFormNovoServico);
  document.querySelector('.close-modal').addEventListener('click', closeModal);
}

function showArea(area) {
  document.querySelectorAll('.area-container').forEach(el => el.classList.remove('active'));
  document.getElementById('area-' + area).classList.add('active');
  if (area === 'cliente') {
    document.querySelectorAll('.tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tabs ~ .tab-content').forEach(el => el.classList.remove('active'));
    const btnAgendar = document.querySelector('.tabs .tab-btn[data-tab="agendar"]');
    if (btnAgendar) btnAgendar.classList.add('active');
    document.getElementById('tab-agendar').classList.add('active');
  }
}

function showTab(tabId, tabsSelector) {
  document.querySelectorAll(tabsSelector + ' .tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll(tabsSelector + ' ~ .tab-content').forEach(el => el.classList.remove('active'));
  const tabBtn = document.querySelector(`[data-tab="${tabId.replace('tab-', '')}"]`);
  if (tabBtn) tabBtn.classList.add('active');
  document.getElementById(tabId).classList.add('active');
}

async function loadServicos() {
  try {
    const response = await fetch(`${API_URL}/servicos`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    servicos = await response.json();
    renderServicos();
  } catch (error) { console.error('Erro ao carregar serviços:', error); }
}

function renderServicos() {
  const container = document.getElementById('lista-servicos');
  if (!container) return;
  container.innerHTML = servicos.map(servico => {
    const isSelected = servicosSelecionados.includes(servico.id);
    return `<div class="servico-item ${isSelected ? 'selected' : ''}" data-id="${servico.id}" onclick="toggleServico(${servico.id})"><h4>${servico.nome}</h4><p class="preco">R$ ${parseFloat(servico.preco).toFixed(2)}</p><p class="duracao">${servico.duracao_minutos} min</p></div>`;
  }).join('');
}

function toggleServico(servicoId) {
  const index = servicosSelecionados.indexOf(servicoId);
  if (index > -1) { servicosSelecionados.splice(index, 1); }
  else { servicosSelecionados.push(servicoId); }
  document.querySelectorAll('#lista-servicos .servico-item').forEach(el => {
    const id = parseInt(el.dataset.id);
    el.classList.toggle('selected', servicosSelecionados.includes(id));
  });
  renderServicosSelecionados();
}

function renderServicosSelecionados() {
  const servicosObj = servicos.filter(s => servicosSelecionados.includes(s.id));
  const container = document.getElementById('servicos-selecionados');
  if (!container) return;
  container.innerHTML = servicosObj.map(s => `<div class="servico-item"><span>${s.nome}</span><span>R$ ${parseFloat(s.preco).toFixed(2)}</span></div>`).join('');
  const total = servicosObj.reduce((acc, s) => acc + parseFloat(s.preco), 0);
  document.getElementById('valor-total').textContent = total.toFixed(2).replace('.', ',');
}

async function buscarCliente() {
  const telefone = document.getElementById('cliente-telefone').value.trim();
  if (!telefone) { showToast('Digite um telefone', 'warning'); return; }
  try {
    const response = await fetch(`${API_URL}/clientes/telefone?telefone=${encodeURIComponent(telefone)}`);
    if (response.ok) {
      const cliente = await response.json();
      currentClienteId = cliente.id;
      document.getElementById('cliente-nome').textContent = cliente.nome;
      document.getElementById('dados-cliente').style.display = 'block';
      document.getElementById('novo-cliente').style.display = 'none';
    } else {
      document.getElementById('novo-cliente').style.display = 'block';
      document.getElementById('dados-cliente').style.display = 'none';
    }
  } catch (error) { showToast('Erro ao buscar cliente', 'error'); }
}

async function criarCliente() {
  const nome = document.getElementById('novo-nome').value.trim();
  const email = document.getElementById('novo-email').value.trim();
  const telefone = document.getElementById('cliente-telefone').value.trim();
  if (!nome) { showToast('Nome é obrigatório', 'warning'); return; }
  if (!telefone) { showToast('Telefone é obrigatório', 'warning'); return; }
  try {
    const response = await fetch(`${API_URL}/clientes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome, telefone, email }) });
    if (response.ok) {
      const cliente = await response.json();
      currentClienteId = cliente.id;
      document.getElementById('cliente-nome').textContent = cliente.nome;
      document.getElementById('dados-cliente').style.display = 'block';
      document.getElementById('novo-cliente').style.display = 'none';
      showToast('Cliente cadastrado!', 'success');
    } else { showToast('Erro ao cadastrar cliente', 'error'); }
  } catch (error) { showToast('Erro ao cadastrar cliente', 'error'); }
}

async function criarAgendamento(e) {
  const observacoes = document.getElementById('agendamento-observacoes').value;
  const dataInput = document.getElementById('agendamento-data').value;
  if (!dataInput || !horarioSelecionado) { showToast('Selecione uma data e horário', 'warning'); return; }
  if (servicosSelecionados.length === 0) { showToast('Selecione pelo menos um serviço', 'warning'); return; }

  const dataHora = `${dataInput}T${horarioSelecionado}:00`;

  const servicosEscolhidos = servicos.filter(s => servicosSelecionados.includes(s.id));
  const duracaoTotal = servicosEscolhidos.reduce((acc, s) => acc + s.duracao_minutos, 0);
  const intervalosNecessarios = Math.ceil(duracaoTotal / 30);
  
  const horariosReservados = [];
  const horaBase = parseInt(dataHora.split('T')[1].split(':')[0]);
  const minutoBase = parseInt(dataHora.split('T')[1].split(':')[1]);
  for (let i = 0; i < intervalosNecessarios; i++) {
    const minuto = minutoBase + (i * 30);
    const hora = horaBase + Math.floor(minuto / 60);
    const min = minuto % 60;
    const horaStr = `${hora.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
    horariosReservados.push(horaStr);
  }

  const horariosOcupadosArray = Array.from(horariosOcupados);
  const conflito = horariosReservados.find(h => horariosOcupadosArray.includes(h));
  if (conflito) { showToast(`Horário ${conflito} já está reservado`, 'warning'); return; }

  try {
    const response = await fetch(`${API_URL}/agendamentos`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clienteId: currentClienteId, dataHora, servicosIds: servicosSelecionados, observacoes })
    });
    const data = await response.json();
    if (response.ok) {
      if (data.suggested && data.existingAgendamento) {
        showToast(data.message, 'warning');
        showModalAdicionarServicos(data.existingAgendamento, data.message);
      } else {
        horariosReservados.forEach(h => horariosOcupados.add(h));
        renderHorariosGrid();
        showToast('Agendamento realizado com sucesso!', 'success');
        servicosSelecionados = []; horarioSelecionado = null;
        renderServicosSelecionados(); document.getElementById('form-agendamento').reset();
        document.getElementById('dados-cliente').style.display = 'none'; document.getElementById('novo-cliente').style.display = 'none';
        document.getElementById('horarios-grid').innerHTML = ''; currentClienteId = null;
        if (historicoTelefone) buscarHistorico();
      }
    } else { showToast(data.error || 'Erro ao criar agendamento', 'error'); }
  } catch (error) { console.error('Erro:', error); showToast('Erro ao criar agendamento', 'error'); }
}

function resetForm() {
  servicosSelecionados = []; horarioSelecionado = null; horariosOcupados.clear();
  renderServicosSelecionados(); document.getElementById('form-agendamento').reset();
  document.getElementById('dados-cliente').style.display = 'none'; document.getElementById('novo-cliente').style.display = 'none';
  document.getElementById('horarios-grid').innerHTML = ''; currentClienteId = null;
}

async function buscarHistorico() {
  const telefone = document.getElementById('historico-telefone').value.trim();
  historicoTelefone = telefone;
  if (!telefone) { showToast('Digite um telefone', 'warning'); return; }
  try {
    const clienteResponse = await fetch(`${API_URL}/clientes/telefone?telefone=${encodeURIComponent(telefone)}`);
    if (!clienteResponse.ok) { showToast('Cliente não encontrado', 'warning'); return; }
    const cliente = await clienteResponse.json();
    const response = await fetch(`${API_URL}/agendamentos/cliente/${cliente.id}`);
    const agendamentos = await response.json();
    renderHistorico(agendamentos);
  } catch (error) { showToast('Erro ao buscar histórico', 'error'); }
}

function renderHistorico(agendamentos) {
  const container = document.getElementById('historico-resultado');
  if (agendamentos.length === 0) { container.innerHTML = '<p>Nenhum agendamento encontrado.</p>'; return; }
  container.innerHTML = agendamentos.map(a => `<div class="historico-item ${a.status}"><div class="data">${formatDate(a.data_hora)}</div><div class="status">${a.status === 'cancelado' ? 'CANCELADO' : a.status}</div><div class="servicos">${a.servicos.map(s => `<span class="servico-tag">${s.nome}</span>`).join('')}</div>${a.status !== 'cancelado' ? `<div class="valor">R$ ${a.servicos.reduce((acc, s) => acc + parseFloat(s.preco), 0).toFixed(2).replace('.', ',')}</div>` : ''}${a.status === 'pendente' ? `<div class="historico-actions"><button type="button" class="btn-action btn-editar" onclick="editarAgendamentoCliente(${a.id}, '${a.cliente_id}', '${a.data_hora}')">Editar</button><button type="button" class="btn-action btn-cancelar" onclick="excluirAgendamentoCliente(${a.id})">Excluir</button></div>` : ''}</div>`).join('');
}

async function loadDashboard() {
  try {
    const response = await fetch(`${API_URL}/dashboard`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    document.getElementById('stat-total').textContent = data.total_agendamentos || 0;
    document.getElementById('stat-confirmados').textContent = data.confirmados || 0;
    document.getElementById('stat-concluidos').textContent = data.concluidos || 0;
    document.getElementById('stat-faturamento').textContent = `R$ ${parseFloat(data.faturamento_total || 0).toFixed(2).replace('.', ',')}`;
    loadAgendamentosAdmin();
    if (historicoTelefone) buscarHistorico();
  } catch (error) { console.error('Erro ao carregar dashboard:', error); }
}

async function carregarHorariosOcupados(data) {
  if (!data) return;
  horariosOcupados.clear();
  try {
    const response = await fetch(`${API_URL}/agendamentos/ocupados?data=${data}`);
    if (response.ok) {
      const horarios = await response.json();
      horarios.forEach(h => horariosOcupados.add(h.hora));
    }
  } catch (error) { console.error('Erro ao carregar horários:', error); }
  renderHorariosGrid();
}

function renderHorariosGrid() {
  const container = document.getElementById('horarios-grid');
  if (!container) return;
  const horarios = [];
  const horaInicio = parseInt(configHorarios.horario_inicio?.split(':')[0] || 7);
  const minutoInicio = parseInt(configHorarios.horario_inicio?.split(':')[1] || 0);
  const horaFim = parseInt(configHorarios.horario_fim?.split(':')[0] || 23);
  const minutoFim = parseInt(configHorarios.horario_fim?.split(':')[1] || 0);
  let horaFimLimite = horaFim;
  if (minutoFim === 0) horaFimLimite = horaFim - 1;
  for (let hora = horaInicio; hora <= horaFimLimite; hora++) {
    const minutoInicial = hora === horaInicio ? minutoInicio : 0;
    let minutoFinal = 60;
    if (hora === horaFim && minutoFim > 0 && minutoFim < 60) minutoFinal = minutoFim;
    for (let minuto = minutoInicial; minuto < minutoFinal; minuto += 30) {
      const horaStr = `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
      horarios.push(horaStr);
    }
  }
  container.innerHTML = horarios.map(hora => {
    const indisponivel = horariosOcupados.has(hora);
    const selected = horarioSelecionado === hora;
    return `<div class="horario-item ${indisponivel ? 'indisponivel' : ''} ${selected ? 'selected' : ''}" data-hora="${hora}" onclick="${indisponivel ? '' : `selecionarHorario('${hora}')`}">${hora}</div>`;
  }).join('');
}

function selecionarHorario(hora) {
  horarioSelecionado = hora;
  renderHorariosGrid();
}

async function loadAgendamentosAdmin() {
  try {
    const response = await fetch(`${API_URL}/agendamentos`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const agendamentos = await response.json();
    renderAgendamentosAdmin(agendamentos);
  } catch (error) { console.error('Erro:', error); }
}

function renderAgendamentosAdmin(agendamentos) {
  const listaAgenda = document.getElementById('lista-agendamentos-admin');
  if (!listaAgenda) return;
  const renderCard = (a) => `<div class="agendamento-card ${a.status}"><div class="agendamento-header"><h4>${a.cliente_nome}</h4><span class="status-badge ${a.status}">${a.status}</span></div><div class="agendamento-details"><p><strong>Data:</strong> ${formatDate(a.data_hora)}</p><p><strong>Serviços:</strong> ${a.servicos.map(s => s.nome).join(', ') || 'Nenhum'}</p><p><strong>Telefone:</strong> ${a.cliente_telefone}</p>${a.observacoes ? `<p><strong>Obs:</strong> ${a.observacoes}</p>` : ''}</div><div class="agendamento-actions">${a.status !== 'concluido' ? `<button type="button" class="btn-action btn-editar" onclick="editarAgendamentoAdmin(${a.id})">Editar</button>` : ''}${a.status === 'pendente' ? `<button type="button" class="btn-action btn-confirmar" onclick="confirmarAgendamento(${a.id})">Confirmar</button>` : ''}${a.status === 'confirmado' ? `<button type="button" class="btn-action btn-concluir" onclick="updateStatus(${a.id}, 'concluido')">Concluir</button>` : ''}${a.status !== 'cancelado' && a.status !== 'concluido' ? `<button type="button" class="btn-action btn-cancelar" onclick="confirmarCancelamento(${a.id})">Cancelar</button>` : ''}</div></div>`;
  listaAgenda.innerHTML = agendamentos.map(renderCard).join('');
}

function formatDate(dateString) {
  const data = new Date(dateString);
  return data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function closeModal() {
  document.getElementById('modal').classList.remove('active');
}

function showModalAdicionarServicos(agendamento, message) {
  const modalBody = document.getElementById('modal-body');
  const servicosAtuais = agendamento.servicos.map(s => s.nome).join(', ');
  window.agendamentoExistente = agendamento;
  modalBody.innerHTML = `<p>${message}</p><div class="agendamento-existente"><p><strong>Data:</strong> ${formatDate(agendamento.data_hora)}</p><p><strong>Serviços:</strong> ${servicosAtuais || 'Nenhum'}</p><p><strong>Status:</strong> ${agendamento.status}</p></div><div class="opcoes-unificacao"><button type="button" class="btn-primary" onclick="showFormAdicionarServicos(${agendamento.id})">Adicionar serviços a este agendamento</button><button type="button" class="btn-secondary" onclick="fecharModalECriarNovo()">Criar novo agendamento mesmo assim</button></div>`;
  document.getElementById('modal-titulo').textContent = 'Agendamento na mesma semana';
  document.getElementById('modal-actions').innerHTML = `<button type="button" class="btn-secondary" onclick="closeModal()">Fechar</button>`;
  document.getElementById('modal').classList.add('active');
  window.agendamentoAtualId = agendamento.id;
  window.servicosSelecionadosAdicionais = [];
  window.dadosAgendamentoPendente = { clienteId: currentClienteId, dataHora: document.getElementById('agendamento-data').value, servicosIds: [...servicosSelecionados], observacoes: document.getElementById('agendamento-observacoes').value };
}

function showFormAdicionarServicos(agendamentoId) {
  const modalBody = document.getElementById('modal-body');
  const agendamento = window.agendamentoExistente;
  const servicosAtuaisIds = agendamento.servicos.map(s => s.id);
  window.servicosSelecionadosAdicionais = [...servicosAtuaisIds];
  modalBody.innerHTML = `<p>Serviços já incluídos neste agendamento:</p><div class="servicos-atuais">${agendamento.servicos.map(s => `<span class="servico-tag">${s.nome}</span>`).join('') || 'Nenhum'}</div><p class="mt-3">Selecione serviços adicionais para adicionar:</p><div id="servicos-adicionais-grid" class="servicos-grid"></div>`;
  renderServicosAdicionais();
  document.getElementById('modal-titulo').textContent = 'Adicionar Serviços';
  document.getElementById('modal-actions').innerHTML = `<button type="button" class="btn-primary" onclick="adicionarServicosAgendamento(${agendamentoId})">Adicionar</button><button type="button" class="btn-secondary" onclick="closeModal()">Cancelar</button>`;
}

function fecharModalECriarNovo() {
  closeModal();
  showToast('Agende o novo horário normalmente', 'info');
  setTimeout(() => criarAgendamentoPendente(), 100);
}

async function criarAgendamentoPendente() {
  if (!window.dadosAgendamentoPendente) { console.log('Sem dados pendentes'); return; }
  const { clienteId, dataHora, servicosIds, observacoes } = window.dadosAgendamentoPendente;
  console.log('Criando agendamento:', { clienteId, dataHora, servicosIds });
  try {
    const response = await fetch(`${API_URL}/agendamentos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clienteId, dataHora, servicosIds, observacoes, ignoreSameWeek: true }) });
    const data = await response.json();
    console.log('Resposta:', response.status, data);
    if (response.ok) {
      showToast('Agendamento realizado com sucesso!', 'success');
      resetForm();
      window.dadosAgendamentoPendente = null;
      if (historicoTelefone) buscarHistorico();
    } else { showToast(data.error || 'Erro ao criar agendamento', 'error'); }
  } catch (error) { console.error('Erro:', error); showToast('Erro ao criar agendamento', 'error'); }
}

function renderServicosAdicionais() {
  const container = document.getElementById('servicos-adicionais-grid');
  if (!container) return;
  container.innerHTML = servicos.map(s => {
    const isSelected = window.servicosSelecionadosAdicionais.includes(s.id);
    return `<div class="servico-item ${isSelected ? 'selected' : ''}" data-id="${s.id}" onclick="toggleServicoAdicional(${s.id})"><h4>${s.nome}</h4><p class="preco">R$ ${parseFloat(s.preco).toFixed(2)}</p><p class="duracao">${s.duracao_minutos} min</p></div>`;
  }).join('');
}

function toggleServicoAdicional(servicoId) {
  const index = window.servicosSelecionadosAdicionais.indexOf(servicoId);
  if (index > -1) { window.servicosSelecionadosAdicionais.splice(index, 1); }
  else { window.servicosSelecionadosAdicionais.push(servicoId); }
  document.querySelectorAll('#servicos-adicionais-grid .servico-item').forEach(el => {
    const id = parseInt(el.dataset.id);
    el.classList.toggle('selected', window.servicosSelecionadosAdicionais.includes(id));
  });
}

async function adicionarServicosAgendamento(agendamentoId) {
  if (window.servicosSelecionadosAdicionais.length === 0) { showToast('Selecione pelo menos um serviço', 'warning'); return; }
  try {
    const response = await fetch(`${API_URL}/agendamentos/${agendamentoId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ servicosIds: window.servicosSelecionadosAdicionais, mergeServicos: true }) });
    if (response.ok) {
      showToast('Serviços adicionados ao agendamento!', 'success');
      closeModal(); resetForm(); window.dadosAgendamentoPendente = null;
      window.servicosSelecionadosAdicionais = []; loadAgendamentosAdmin(); loadDashboard();
      if (historicoTelefone) buscarHistorico();
    } else { const data = await response.json(); showToast(data.error || 'Erro ao adicionar serviços', 'error'); }
  } catch (error) { showToast('Erro ao adicionar serviços', 'error'); }
}

window.toggleServicoAdicional = toggleServicoAdicional;
window.adicionarServicosAgendamento = adicionarServicosAgendamento;

function confirmarCancelamento(agendamentoId) {
  if (confirm('Tem certeza que deseja cancelar este agendamento?')) {
    updateStatus(agendamentoId, 'cancelado');
  }
}

function confirmarAgendamento(agendamentoId) {
  if (confirm('Tem certeza que deseja confirmar este agendamento?')) {
    updateStatus(agendamentoId, 'confirmado');
  }
}

async function editarAgendamentoAdmin(agendamentoId) {
  try {
    const response = await fetch(`${API_URL}/agendamentos/${agendamentoId}`);
    const agendamento = await response.json();

    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
      <form id="form-editar-admin">
        <div class="form-group">
          <label for="edit-data-admin">Data e Hora</label>
          <input type="datetime-local" id="edit-data-admin" value="${agendamento.data_hora.slice(0, 16)}" required>
        </div>
        <div class="form-group">
          <label>Serviços</label>
          <div id="edit-servicos-admin-grid" class="servicos-grid"></div>
        </div>
        <div class="form-group">
          <label for="edit-observacoes-admin">Observações</label>
          <textarea id="edit-observacoes-admin">${agendamento.observacoes || ''}</textarea>
        </div>
        <div class="form-group">
          <label for="edit-status-admin">Status</label>
          <select id="edit-status-admin">
            <option value="pendente" ${agendamento.status === 'pendente' ? 'selected' : ''}>Pendente</option>
            <option value="confirmado" ${agendamento.status === 'confirmado' ? 'selected' : ''}>Confirmado</option>
            <option value="concluido" ${agendamento.status === 'concluido' ? 'selected' : ''}>Concluido</option>
            <option value="cancelado" ${agendamento.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
          </select>
        </div>
      </form>
    `;

    renderServicosEdicaoAdmin(agendamento.servicos);

    document.getElementById('modal-titulo').textContent = 'Editar Agendamento';
    document.getElementById('modal-actions').innerHTML = `
      <button type="button" class="btn-primary" onclick="salvarEdicaoAdmin(${agendamentoId})">Salvar</button>
      <button type="button" class="btn-secondary" onclick="closeModal()">Cancelar</button>
    `;

    document.getElementById('modal').classList.add('active');
  } catch (error) {
    showToast('Erro ao carregar agendamento', 'error');
  }
}

function renderServicosEdicaoAdmin(servicosAtuais) {
  const container = document.getElementById('edit-servicos-admin-grid');
  const idsAtuais = servicosAtuais.map(s => s.id);
  window.servicosEdicaoAdminSelecionados = [...idsAtuais];

  container.innerHTML = servicos.map(s => `
    <div class="servico-item ${idsAtuais.includes(s.id) ? 'selected' : ''}" data-id="${s.id}" onclick="toggleServicoEdicaoAdmin(${s.id})">
      <h4>${s.nome}</h4>
      <p class="preco">R$ ${parseFloat(s.preco).toFixed(2)}</p>
      <p class="duracao">${s.duracao_minutos} min</p>
    </div>
  `).join('');
}

function toggleServicoEdicaoAdmin(servicoId) {
  const index = window.servicosEdicaoAdminSelecionados.indexOf(servicoId);
  if (index > -1) {
    window.servicosEdicaoAdminSelecionados.splice(index, 1);
  } else {
    window.servicosEdicaoAdminSelecionados.push(servicoId);
  }

  document.querySelectorAll('#edit-servicos-admin-grid .servico-item').forEach(el => {
    const id = parseInt(el.dataset.id);
    el.classList.toggle('selected', window.servicosEdicaoAdminSelecionados.includes(id));
  });
}

async function salvarEdicaoAdmin(agendamentoId) {
  const dataHora = document.getElementById('edit-data-admin').value;
  const observacoes = document.getElementById('edit-observacoes-admin').value;
  const status = document.getElementById('edit-status-admin').value;

  if (!dataHora) {
    showToast('Selecione uma data e hora', 'warning');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/agendamentos/${agendamentoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataHora,
        observacoes,
        status,
        servicosIds: window.servicosEdicaoAdminSelecionados
      })
    });

    if (response.ok) {
      showToast('Agendamento atualizado!', 'success');
      closeModal();
      loadAgendamentosAdmin();
      loadDashboard();
    } else {
      const data = await response.json();
      showToast(data.error || 'Erro ao atualizar agendamento', 'error');
    }
  } catch (error) {
    showToast('Erro ao atualizar agendamento', 'error');
  }
}

window.confirmarCancelamento = confirmarCancelamento;

async function updateStatus(agendamentoId, status) {
  try {
    const response = await fetch(`${API_URL}/agendamentos/${agendamentoId}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    if (response.ok) { showToast('Status atualizado!', 'success'); loadAgendamentosAdmin(); loadDashboard(); }
    else { const data = await response.json(); showToast(data.error || 'Erro ao atualizar', 'error'); }
  } catch (error) { showToast('Erro ao atualizar status', 'error'); }
}

window.updateStatus = updateStatus;
window.confirmarAgendamento = confirmarAgendamento;

async function loadServicosAdmin() {
  try {
    const response = await fetch(`${API_URL}/servicos`);
    const servicos = await response.json();
    renderServicosAdmin(servicos);
  } catch (error) { console.error('Erro:', error); }
}

function renderServicosAdmin(servicos) {
  const container = document.getElementById('lista-servicos-admin');
  if (!container) return;
  container.innerHTML = servicos.map(s => `<div class="servico-admin-item"><div class="servico-info"><h4>${s.nome}</h4><p>R$ ${parseFloat(s.preco).toFixed(2)} - ${s.duracao_minutos} min</p></div><div class="servico-admin-actions"><button class="btn-editar" onclick="editarServico(${s.id})">Editar</button><button class="btn-excluir" onclick="excluirServico(${s.id})">Excluir</button></div></div>`).join('');
}

function showFormNovoServico() {
  document.getElementById('modal-body').innerHTML = `<form id="form-novo-servico"><div class="form-group"><label for="servico-nome">Nome do Serviço</label><input type="text" id="servico-nome" required></div><div class="form-group"><label for="servico-descricao">Descrição</label><textarea id="servico-descricao"></textarea></div><div class="form-group"><label for="servico-preco">Preço (R$)</label><input type="number" id="servico-preco" step="0.01" required></div><div class="form-group"><label for="servico-duracao">Duração (minutos)</label><input type="number" id="servico-duracao" required></div></form>`;
  document.getElementById('modal-titulo').textContent = 'Novo Serviço';
  document.getElementById('modal-actions').innerHTML = `<button type="button" class="btn-primary" onclick="salvarServico()">Salvar</button><button type="button" class="btn-secondary" onclick="closeModal()">Cancelar</button>`;
  document.getElementById('modal').classList.add('active');
  window.modoEdicao = false;
}

async function salvarServico() {
  const nome = document.getElementById('servico-nome').value;
  const descricao = document.getElementById('servico-descricao').value;
  const preco = document.getElementById('servico-preco').value;
  const duracaoMinutos = document.getElementById('servico-duracao').value;
  if (!nome || !preco || !duracaoMinutos) { showToast('Preencha todos os campos', 'warning'); return; }
  try {
    const method = window.modoEdicao ? 'PUT' : 'POST';
    const url = window.modoEdicao ? `${API_URL}/servicos/${window.servicoEditandoId}` : `${API_URL}/servicos`;
    const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome, descricao, preco: parseFloat(preco), duracaoMinutos: parseInt(duracaoMinutos) }) });
    if (response.ok) { showToast('Serviço salvo!', 'success'); closeModal(); loadServicos(); loadServicosAdmin(); }
    else { showToast('Erro ao salvar serviço', 'error'); }
  } catch (error) { showToast('Erro ao salvar serviço', 'error'); }
}

async function excluirServico(id) {
  if (!confirm('Tem certeza que deseja excluir este serviço?')) return;
  try {
    const response = await fetch(`${API_URL}/servicos/${id}`, { method: 'DELETE' });
    if (response.ok) { showToast('Serviço excluído!', 'success'); loadServicos(); loadServicosAdmin(); }
    else { showToast('Erro ao excluir serviço', 'error'); }
  } catch (error) { showToast('Erro ao excluir serviço', 'error'); }
}

async function verificarSenhaAdmin() {
  const senha = document.getElementById('admin-senha').value;
  if (senha === 'admin123') { window.adminAutenticado = true; closeModal(); showArea('admin'); loadDashboard(); }
  else { showToast('Senha incorreta', 'error'); }
}

function editarServico(id) {
  const servico = servicos.find(s => s.id === id);
  if (!servico) return;
  document.getElementById('modal-body').innerHTML = `<form id="form-editar-servico"><div class="form-group"><label for="servico-nome">Nome do Serviço</label><input type="text" id="servico-nome" value="${servico.nome}" required></div><div class="form-group"><label for="servico-descricao">Descrição</label><textarea id="servico-descricao">${servico.descricao || ''}</textarea></div><div class="form-group"><label for="servico-preco">Preço (R$)</label><input type="number" id="servico-preco" step="0.01" value="${servico.preco}" required></div><div class="form-group"><label for="servico-duracao">Duração (minutos)</label><input type="number" id="servico-duracao" value="${servico.duracao_minutos}" required></div></form>`;
  document.getElementById('modal-titulo').textContent = 'Editar Serviço';
  document.getElementById('modal-actions').innerHTML = `<button type="button" class="btn-primary" onclick="salvarServico()">Salvar</button><button type="button" class="btn-secondary" onclick="closeModal()">Cancelar</button>`;
  document.getElementById('modal').classList.add('active');
  window.modoEdicao = true;
  window.servicoEditandoId = id;
}

window.verificarSenhaAdmin = verificarSenhaAdmin;
window.toggleServico = toggleServico;
window.toggleServicoEdicaoAdmin = toggleServicoEdicaoAdmin;
window.editarAgendamentoAdmin = editarAgendamentoAdmin;
window.salvarEdicaoAdmin = salvarEdicaoAdmin;
window.editarServico = editarServico;
window.excluirServico = excluirServico;
window.salvarServico = salvarServico;
window.showFormNovoServico = showFormNovoServico;
window.showArea = showArea;
window.loadDashboard = loadDashboard;
window.loadAgendamentosAdmin = loadAgendamentosAdmin;
window.loadServicosAdmin = loadServicosAdmin;

function sairAdmin() {
  window.adminAutenticado = false;
  showArea('cliente');
}

window.sairAdmin = sairAdmin;

async function editarAgendamentoCliente(agendamentoId, clienteId, dataHoraOriginal) {
  try {
    const response = await fetch(`${API_URL}/agendamentos/${agendamentoId}`);
    const agendamento = await response.json();
    const telefone = document.getElementById('historico-telefone').value.trim();

    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
      <form id="form-editar-cliente">
        <div class="form-group">
          <label for="edit-telefone-cliente">Telefone (para confirmar)</label>
          <input type="tel" id="edit-telefone-cliente" value="${telefone}" required>
        </div>
        <p><strong>Data:</strong> ${formatDate(agendamento.data_hora)}</p>
        <div class="form-group">
          <label>Serviços</label>
          <div id="edit-servicos-cliente-grid" class="servicos-grid"></div>
        </div>
        <div class="form-group">
          <label for="edit-observacoes-cliente">Observações</label>
          <textarea id="edit-observacoes-cliente">${agendamento.observacoes || ''}</textarea>
        </div>
      </form>
    `;

    window.servicosEdicaoClienteSelecionados = agendamento.servicos.map(s => s.id);
    
    document.getElementById('modal-titulo').textContent = 'Editar Agendamento';
    document.getElementById('modal-actions').innerHTML = `
      <button type="button" class="btn-primary" onclick="salvarEdicaoCliente(${agendamentoId})">Salvar</button>
      <button type="button" class="btn-secondary" onclick="closeModal()">Cancelar</button>
    `;

    renderServicosEdicaoCliente(agendamento.servicos);

    document.getElementById('modal').classList.add('active');
  } catch (error) {
    showToast('Erro ao carregar agendamento', 'error');
  }
}

async function renderHorariosEditarCliente(data) {
  const container = document.getElementById('horarios-editar-grid');
  if (!container) return;
  
  container.innerHTML = '<p>Carregando horários...</p>';
  
  try {
    const response = await fetch(`${API_URL}/agendamentos/ocupados?data=${data}`);
    const horariosOcupadosData = await response.json();
    const horariosOcupadosSet = new Set(horariosOcupadosData.map(h => h.hora));

    const horarios = [];
    const horaInicio = parseInt(configHorarios.horario_inicio?.split(':')[0] || 7);
    const minutoInicio = parseInt(configHorarios.horario_inicio?.split(':')[1] || 0);
    const horaFim = parseInt(configHorarios.horario_fim?.split(':')[0] || 23);
    const minutoFim = parseInt(configHorarios.horario_fim?.split(':')[1] || 0);
    let horaFimLimite = horaFim;
    if (minutoFim === 0) horaFimLimite = horaFim - 1;
    
    for (let hora = horaInicio; hora <= horaFimLimite; hora++) {
      const minutoInicial = hora === horaInicio ? minutoInicio : 0;
      let minutoFinal = 60;
      if (hora === horaFim && minutoFim > 0 && minutoFim < 60) minutoFinal = minutoFim;
      for (let minuto = minutoInicial; minuto < minutoFinal; minuto += 30) {
        const horaStr = `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
        horarios.push(horaStr);
      }
    }

    window.horarioEdicaoSelecionado = null;

    container.innerHTML = horarios.map(hora => {
      const indisponivel = horariosOcupadosSet.has(hora);
      return `<div class="horario-item ${indisponivel ? 'indisponivel' : ''}" data-hora="${hora}" onclick="${indisponivel ? '' : `selecionarHorarioEdicao('${hora}')`}">${hora}</div>`;
    }).join('');
  } catch (error) {
    container.innerHTML = '<p>Erro ao carregar horários</p>';
  }
}

function selecionarHorarioEdicao(hora) {
  window.horarioEdicaoSelecionado = hora;
  document.querySelectorAll('#horarios-editar-grid .horario-item').forEach(el => {
    el.classList.toggle('selected', el.dataset.hora === hora);
  });
}

function renderServicosEdicaoCliente(servicosAtuais) {
  const container = document.getElementById('edit-servicos-cliente-grid');
  if (!container) return;
  
  container.innerHTML = servicos.map(s => {
    const isSelected = window.servicosEdicaoClienteSelecionados.includes(s.id);
    return `<div class="servico-item ${isSelected ? 'selected' : ''}" data-id="${s.id}" onclick="toggleServicoEdicaoCliente(${s.id})"><h4>${s.nome}</h4><p class="preco">R$ ${parseFloat(s.preco).toFixed(2)}</p><p class="duracao">${s.duracao_minutos} min</p></div>`;
  }).join('');
}

function toggleServicoEdicaoCliente(servicoId) {
  const index = window.servicosEdicaoClienteSelecionados.indexOf(servicoId);
  if (index > -1) {
    window.servicosEdicaoClienteSelecionados.splice(index, 1);
  } else {
    window.servicosEdicaoClienteSelecionados.push(servicoId);
  }
  
  document.querySelectorAll('#edit-servicos-cliente-grid .servico-item').forEach(el => {
    const id = parseInt(el.dataset.id);
    el.classList.toggle('selected', window.servicosEdicaoClienteSelecionados.includes(id));
  });
}

async function salvarEdicaoCliente(agendamentoId) {
  const telefone = document.getElementById('edit-telefone-cliente').value.trim();
  const observacoes = document.getElementById('edit-observacoes-cliente').value;

  if (!telefone) {
    showToast('Telefone é obrigatório', 'warning');
    return;
  }

  if (window.servicosEdicaoClienteSelecionados.length === 0) {
    showToast('Selecione pelo menos um serviço', 'warning');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/agendamentos/cliente/${agendamentoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telefone,
        servicosIds: window.servicosEdicaoClienteSelecionados,
        observacoes
      })
    });

    const data = await response.json();
    if (response.ok) {
      showToast('Agendamento atualizado!', 'success');
      closeModal();
      buscarHistorico();
    } else {
      showToast(data.error || 'Erro ao atualizar agendamento', 'error');
    }
  } catch (error) {
    showToast('Erro ao atualizar agendamento', 'error');
  }
}

window.editarAgendamentoCliente = editarAgendamentoCliente;
window.salvarEdicaoCliente = salvarEdicaoCliente;
window.toggleServicoEdicaoCliente = toggleServicoEdicaoCliente;
window.selecionarHorarioEdicao = selecionarHorarioEdicao;

async function excluirAgendamentoCliente(agendamentoId) {
  const telefone = document.getElementById('historico-telefone').value.trim();
  
  if (!telefone) {
    showToast('Digite seu telefone para confirmar', 'warning');
    return;
  }
  
  if (!confirm('Tem certeza que deseja excluir este agendamento?')) {
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/agendamentos/cliente/${agendamentoId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefone })
    });
    
    const data = await response.json();
    if (response.ok) {
      showToast('Agendamento excluído!', 'success');
      buscarHistorico();
    } else {
      showToast(data.error || 'Erro ao excluir agendamento', 'error');
    }
  } catch (error) {
    showToast('Erro ao excluir agendamento', 'error');
  }
}

window.excluirAgendamentoCliente = excluirAgendamentoCliente;
