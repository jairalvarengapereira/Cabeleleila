const API_URL = '/api';

let currentClienteId = null;
let servicos = [];
let servicosSelecionados = [];
let historicoTelefone = null;

document.addEventListener('DOMContentLoaded', () => {
  init();
});

async function init() {
  await loadServicos();
  setupEventListeners();
}

function setupEventListeners() {
  document.getElementById('btn-cliente').addEventListener('click', () => showArea('cliente'));
  document.getElementById('btn-admin').addEventListener('click', () => {
    if (window.adminAutenticado) {
      showArea('admin');
      loadDashboard();
    } else {
      document.getElementById('modal-titulo').textContent = 'Acesso Administrativo';
      document.getElementById('modal-body').innerHTML = `
          <div class="form-group">
            <label for="admin-senha">Digite a senha de acesso:</label>
            <input type="password" id="admin-senha" placeholder="Senha">
          </div>
        `;
      document.getElementById('modal-actions').innerHTML = `
          <button type="button" class="btn-primary" onclick="verificarSenhaAdmin()">Entrar</button>
          <button type="button" class="btn-secondary" onclick="closeModal()">Cancelar</button>
        `;
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
  document.getElementById('form-agendamento').addEventListener('submit', (e) => {
    e.preventDefault();
    criarAgendamento(e);
  });
  document.getElementById('btn-buscar-historico').addEventListener('click', buscarHistorico);

  document.getElementById('btn-novo-servico')?.addEventListener('click', showFormNovoServico);

  document.querySelector('.close-modal').addEventListener('click', closeModal);
}

function showArea(area) {
  document.querySelectorAll('.area-container').forEach(el => el.classList.remove('active'));
  document.getElementById('area-' + area).classList.add('active');
  
  if (area === 'cliente') {
    document.querySelectorAll('.tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tabs ~ .tab-content').forEach(el => el.classList.remove('active'));
    const primeiroTab = document.querySelector('.tabs .tab-btn');
    const primeiraAba = document.querySelector('.tabs ~ .tab-content');
    if (primeiroTab) primeiroTab.classList.add('active');
    if (primeiraAba) primeiraAba.classList.add('active');
  }
}

function showTab(tabId, tabsSelector) {
  document.querySelectorAll(`${tabsSelector} ~ .tab-content`).forEach(el => el.classList.remove('active'));
  document.querySelectorAll(`${tabsSelector} .tab-btn`).forEach(btn => btn.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  document.querySelector(`${tabsSelector} .tab-btn[data-tab="${tabId.replace('tab-', '')}"]`).classList.add('active');

  if (tabId === 'tab-gerenciar') {
    loadServicosAdmin();
  }
}

async function loadServicos() {
  try {
    const response = await fetch(`${API_URL}/servicos`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    servicos = await response.json();
    renderServicos();
  } catch (error) {
    console.error('Erro ao carregar serviços:', error);
  }
}

function renderServicos() {
  const container = document.getElementById('lista-servicos');
  container.innerHTML = servicos.map(servico => `
    <div class="servico-item" data-id="${servico.id}" onclick="toggleServico(${servico.id})">
      <h4>${servico.nome}</h4>
      <p class="preco">R$ ${parseFloat(servico.preco).toFixed(2)}</p>
      <p class="duracao">${servico.duracao_minutos} min</p>
    </div>
  `).join('');
}

function toggleServico(servicoId) {
  const index = servicosSelecionados.indexOf(servicoId);
  if (index > -1) {
    servicosSelecionados.splice(index, 1);
  } else {
    servicosSelecionados.push(servicoId);
  }
  renderServicosSelecionados();
}

function renderServicosSelecionados() {
  document.querySelectorAll('.servico-item').forEach(el => {
    const id = parseInt(el.dataset.id);
    el.classList.toggle('selected', servicosSelecionados.includes(id));
  });

  const container = document.getElementById('servicos-selecionados');
  const servicosObj = servicos.filter(s => servicosSelecionados.includes(s.id));

  if (servicosObj.length === 0) {
    container.innerHTML = '<p>Nenhum serviço selecionado</p>';
  } else {
    container.innerHTML = servicosObj.map(s => `
      <div class="servico-selecionado">
        <span>${s.nome}</span>
        <span>R$ ${parseFloat(s.preco).toFixed(2)}</span>
      </div>
    `).join('');
  }

  const total = servicosObj.reduce((acc, s) => acc + parseFloat(s.preco), 0);
  document.getElementById('valor-total').textContent = total.toFixed(2).replace('.', ',');
}

async function buscarCliente() {
  const telefone = document.getElementById('cliente-telefone').value.trim();
  if (!telefone) {
    showToast('Digite um telefone', 'warning');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/clientes/telefone?telefone=${encodeURIComponent(telefone)}`);

    if (response.ok) {
      const cliente = await response.json();
      currentClienteId = cliente.id;
      document.getElementById('cliente-nome').textContent = cliente.nome;
      document.getElementById('dados-cliente').style.display = 'block';
      document.getElementById('novo-cliente').style.display = 'none';
    } else {
      document.getElementById('dados-cliente').style.display = 'none';
      document.getElementById('novo-cliente').style.display = 'block';
    }
  } catch (error) {
    showToast('Erro ao buscar cliente', 'error');
  }
}

async function criarCliente() {
  const nome = document.getElementById('novo-nome').value.trim();
  const email = document.getElementById('novo-email').value.trim();
  const telefone = document.getElementById('cliente-telefone').value.trim();

  if (!nome) {
    showToast('Nome é obrigatório', 'warning');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/clientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, telefone, email })
    });

    if (response.ok) {
      const cliente = await response.json();
      currentClienteId = cliente.id;
      document.getElementById('cliente-nome').textContent = cliente.nome;
      document.getElementById('novo-cliente').style.display = 'none';
      document.getElementById('dados-cliente').style.display = 'block';
      showToast('Cliente cadastrado com sucesso!', 'success');
    } else {
      const data = await response.json();
      showToast(data.error || 'Erro ao criar cliente', 'error');
    }
  } catch (error) {
    showToast('Erro ao criar cliente', 'error');
  }
}

async function criarAgendamento(e) {
  e.preventDefault();

  if (!currentClienteId) {
    showToast('Busque ou cadastre um cliente primeiro', 'warning');
    return;
  }

  const dataHora = document.getElementById('agendamento-data').value;
  const observacoes = document.getElementById('agendamento-observacoes').value;

  if (!dataHora) {
    showToast('Selecione uma data e hora', 'warning');
    return;
  }

  if (servicosSelecionados.length === 0) {
    showToast('Selecione pelo menos um serviço', 'warning');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/agendamentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clienteId: currentClienteId,
        dataHora,
        servicosIds: servicosSelecionados,
        observacoes
      })
    });

    const data = await response.json();

    if (response.ok) {
      if (data.suggested && data.existingAgendamento) {
        showToast(data.message, 'warning');
        showModalAdicionarServicos(data.existingAgendamento, data.message);
      } else if (data.message) {
        showToast(data.message, 'warning');
        resetForm();
      } else {
        showToast('Agendamento realizado com sucesso!', 'success');
        resetForm();
      }
    } else {
      showToast(data.error || 'Erro ao criar agendamento', 'error');
    }
  } catch (error) {
    showToast('Erro ao criar agendamento', 'error');
  }
}

function resetForm() {
  servicosSelecionados = [];
  renderServicosSelecionados();
  document.getElementById('form-agendamento').reset();
  document.getElementById('dados-cliente').style.display = 'none';
  document.getElementById('novo-cliente').style.display = 'none';
  currentClienteId = null;
}

async function buscarHistorico() {
  const telefone = document.getElementById('historico-telefone').value.trim();
  historicoTelefone = telefone;

  if (!telefone) {
    showToast('Digite um telefone', 'warning');
    return;
  }

  try {
    const clienteResponse = await fetch(`${API_URL}/clientes/telefone?telefone=${encodeURIComponent(telefone)}`);

    if (!clienteResponse.ok) {
      showToast('Cliente não encontrado', 'warning');
      return;
    }

    const cliente = await clienteResponse.json();
    const response = await fetch(`${API_URL}/agendamentos/cliente/${cliente.id}`);
    const agendamentos = await response.json();

    renderHistorico(agendamentos);
  } catch (error) {
    showToast('Erro ao buscar histórico', 'error');
  }
}

function renderHistorico(agendamentos) {
  const container = document.getElementById('historico-resultado');

  if (agendamentos.length === 0) {
    container.innerHTML = '<p>Nenhum histórico encontrado</p>';
    return;
  }

  container.innerHTML = agendamentos.map(a => `
    <div class="historico-item">
      <div class="data">${formatDate(a.data_hora)}</div>
      <div class="servicos">
        ${a.servicos.map(s => `<span class="servico-tag">${s.nome}</span>`).join('')}
      </div>
      <div class="status">Status: <span class="status-badge ${a.status}">${a.status}</span></div>
      <div class="historico-actions">
        ${a.status === 'pendente' ? `
          <button type="button" class="btn-action btn-editar" onclick="editarAgendamentoCliente(${a.id})">Editar</button>
          <button type="button" class="btn-action btn-excluir" onclick="excluirAgendamentoCliente(${a.id})">Excluir</button>
        ` : ''}
      </div>
    </div>
  `).join('');
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
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
  }
}

async function loadAgendamentosAdmin() {
  try {
    const response = await fetch(`${API_URL}/agendamentos`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const agendamentos = await response.json();
    renderAgendamentosAdmin(agendamentos);
  } catch (error) {
    console.error('Erro:', error);
  }
}

function renderAgendamentosAdmin(agendamentos) {
  const listaAgenda = document.getElementById('lista-agendamentos-admin');
  const listaCompleta = document.getElementById('lista-agendamentos-completa');

  const renderCard = (a) => `
    <div class="agendamento-card ${a.status}">
      <div class="agendamento-header">
        <h4>${a.cliente_nome}</h4>
        <span class="status-badge ${a.status}">${a.status}</span>
      </div>
      <div class="agendamento-details">
        <p><strong>Data:</strong> ${formatDate(a.data_hora)}</p>
        <p><strong>Serviços:</strong> ${a.servicos.map(s => s.nome).join(', ') || 'Nenhum'}</p>
        <p><strong>Telefone:</strong> ${a.cliente_telefone}</p>
        ${a.observacoes ? `<p><strong>Obs:</strong> ${a.observacoes}</p>` : ''}
      </div>
      <div class="agendamento-actions">
        ${a.status !== 'concluido' ? `<button type="button" class="btn-action btn-editar" onclick="editarAgendamentoAdmin(${a.id})">Editar</button>` : ''}
        ${a.status === 'pendente' ? `<button type="button" class="btn-action btn-confirmar" onclick="updateStatus(${a.id}, 'confirmado')">Confirmar</button>` : ''}
        ${a.status === 'confirmado' ? `<button type="button" class="btn-action btn-concluir" onclick="updateStatus(${a.id}, 'concluido')">Concluir</button>` : ''}
        ${a.status !== 'cancelado' && a.status !== 'concluido' ? `<button type="button" class="btn-action btn-cancelar" onclick="updateStatus(${a.id}, 'cancelado')">Cancelar</button>` : ''}
      </div>
    </div>
  `;

  const proximos = agendamentos.filter(a => new Date(a.data_hora) >= new Date() && a.status !== 'cancelado');
  listaAgenda.innerHTML = proximos.map(renderCard).join('') || '<p>Nenhum agendamento próximo</p>';
  if (listaCompleta) {
    listaCompleta.innerHTML = agendamentos.map(renderCard).join('') || '<p>Nenhum agendamento</p>';
  }
}

async function updateStatus(id, status) {
  try {
    const response = await fetch(`${API_URL}/agendamentos/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });

    if (response.ok) {
      showToast(`Status atualizado para ${status}`, 'success');
      loadDashboard();
    } else {
      const data = await response.json();
      showToast(data.error || 'Erro ao atualizar status', 'error');
    }
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;

  if (window.toastTimeout) clearTimeout(window.toastTimeout);

  window.toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 5000);
}

function closeModal() {
  document.getElementById('modal').classList.remove('active');
}

function showModalAdicionarServicos(agendamento, message) {
  const modalBody = document.getElementById('modal-body');
  const servicosAtuais = agendamento.servicos.map(s => s.nome).join(', ');

  modalBody.innerHTML = `
    <p>${message}</p>
    <div class="agendamento-existente">
      <p><strong>Data:</strong> ${formatDate(agendamento.data_hora)}</p>
      <p><strong>Serviços:</strong> ${servicosAtuais || 'Nenhum'}</p>
      <p><strong>Status:</strong> ${agendamento.status}</p>
    </div>
    <div class="opcoes-unificacao">
      <button type="button" class="btn-primary" onclick="showFormAdicionarServicos(${agendamento.id})">Adicionar serviços a este agendamento</button>
      <button type="button" class="btn-secondary" onclick="fecharModalECriarNovo()">Criar novo agendamento mesmo assim</button>
    </div>
  `;

  document.getElementById('modal-titulo').textContent = 'Agendamento na mesma semana';
  document.getElementById('modal-actions').innerHTML = `
    <button type="button" class="btn-secondary" onclick="closeModal()">Fechar</button>
  `;

  document.getElementById('modal').classList.add('active');
  window.agendamentoAtualId = agendamento.id;
  window.servicosSelecionadosAdicionais = [];
  window.dadosAgendamentoPendente = {
    clienteId: currentClienteId,
    dataHora: document.getElementById('agendamento-data').value,
    servicosIds: [...servicosSelecionados],
    observacoes: document.getElementById('agendamento-observacoes').value
  };
}

function showFormAdicionarServicos(agendamentoId) {
  const modalBody = document.getElementById('modal-body');

  modalBody.innerHTML = `
    <p>Selecione serviços adicionais para adicionar ao agendamento:</p>
    <div id="servicos-adicionais-grid" class="servicos-grid"></div>
  `;

  renderServicosAdicionais();

  document.getElementById('modal-titulo').textContent = 'Adicionar Serviços';
  document.getElementById('modal-actions').innerHTML = `
    <button type="button" class="btn-primary" onclick="adicionarServicosAgendamento(${agendamentoId})">Adicionar</button>
    <button type="button" class="btn-secondary" onclick="closeModal()">Cancelar</button>
  `;
}

function fecharModalECriarNovo() {
  closeModal();
  showToast('Agende o novo horário normalmente', 'info');
  setTimeout(() => criarAgendamentoPendente(), 100);
}

async function criarAgendamentoPendente() {
  if (!window.dadosAgendamentoPendente) {
    console.log('Sem dados pendentes');
    return;
  }

  const { clienteId, dataHora, servicosIds, observacoes } = window.dadosAgendamentoPendente;
  console.log('Criando agendamento:', { clienteId, dataHora, servicosIds });

  try {
    const response = await fetch(`${API_URL}/agendamentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clienteId, dataHora, servicosIds, observacoes, ignoreSameWeek: true })
    });

    const data = await response.json();
    console.log('Resposta:', response.status, data);

    if (response.ok) {
      showToast('Agendamento realizado com sucesso!', 'success');
      resetForm();
      window.dadosAgendamentoPendente = null;
    } else {
      showToast(data.error || 'Erro ao criar agendamento', 'error');
    }
  } catch (error) {
    console.error('Erro:', error);
    showToast('Erro ao criar agendamento', 'error');
  }
}

function renderServicosAdicionais() {
  const container = document.getElementById('servicos-adicionais-grid');
  container.innerHTML = servicos.map(s => `
    <div class="servico-item" data-id="${s.id}" onclick="toggleServicoAdicional(${s.id})">
      <h4>${s.nome}</h4>
      <p class="preco">R$ ${parseFloat(s.preco).toFixed(2)}</p>
      <p class="duracao">${s.duracao_minutos} min</p>
    </div>
  `).join('');
}

function toggleServicoAdicional(servicoId) {
  const index = window.servicosSelecionadosAdicionais.indexOf(servicoId);
  if (index > -1) {
    window.servicosSelecionadosAdicionais.splice(index, 1);
  } else {
    window.servicosSelecionadosAdicionais.push(servicoId);
  }

  document.querySelectorAll('#servicos-adicionais-grid .servico-item').forEach(el => {
    const id = parseInt(el.dataset.id);
    el.classList.toggle('selected', window.servicosSelecionadosAdicionais.includes(id));
  });
}

async function adicionarServicosAgendamento(agendamentoId) {
  if (window.servicosSelecionadosAdicionais.length === 0) {
    showToast('Selecione pelo menos um serviço', 'warning');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/agendamentos/${agendamentoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ servicosIds: window.servicosSelecionadosAdicionais })
    });

    if (response.ok) {
      showToast('Serviços adicionados ao agendamento!', 'success');
      closeModal();
      resetForm();
      window.dadosAgendamentoPendente = null;
      window.servicosSelecionadosAdicionais = [];
      loadAgendamentosAdmin();
      loadDashboard();
    } else {
      const data = await response.json();
      showToast(data.error || 'Erro ao adicionar serviços', 'error');
    }
  } catch (error) {
    showToast('Erro ao adicionar serviços', 'error');
  }
}

window.toggleServicoAdicional = toggleServicoAdicional;
window.adicionarServicosAgendamento = adicionarServicosAgendamento;

window.updateStatus = updateStatus;

async function loadServicosAdmin() {
  try {
    const response = await fetch(`${API_URL}/servicos`);
    const servicos = await response.json();
    renderServicosAdmin(servicos);
  } catch (error) {
    showToast('Erro ao carregar serviços', 'error');
  }
}

function renderServicosAdmin(servicos) {
  const container = document.getElementById('lista-servicos-admin');

  if (servicos.length === 0) {
    container.innerHTML = '<p>Nenhum serviço cadastrado</p>';
    return;
  }

  container.innerHTML = servicos.map(s => `
    <div class="servico-admin-card">
      <div class="servico-admin-info">
        <h4>${s.nome}</h4>
        <p>${s.descricao || 'Sem descrição'}</p>
        <p><strong>Preço:</strong> R$ ${parseFloat(s.preco).toFixed(2)}</p>
        <p><strong>Duração:</strong> ${s.duracao_minutos} minutos</p>
      </div>
      <div class="servico-admin-actions">
        <button type="button" class="btn-action btn-editar" onclick="editarServico(${s.id})">Editar</button>
        <button type="button" class="btn-action btn-excluir" onclick="excluirServico(${s.id})">Excluir</button>
      </div>
    </div>
  `).join('');
}

function showFormNovoServico() {
  const modalBody = document.getElementById('modal-body');
  modalBody.innerHTML = `
    <form id="form-servico">
      <div class="form-group">
        <label for="servico-nome">Nome</label>
        <input type="text" id="servico-nome" name="nome" required>
      </div>
      <div class="form-group">
        <label for="servico-descricao">Descrição</label>
        <textarea id="servico-descricao" name="descricao"></textarea>
      </div>
      <div class="form-group">
        <label for="servico-preco">Preço (R$)</label>
        <input type="number" id="servico-preco" name="preco" step="0.01" required>
      </div>
      <div class="form-group">
        <label for="servico-duracao">Duração (minutos)</label>
        <input type="number" id="servico-duracao" name="duracao" required>
      </div>
    </form>
  `;

  document.getElementById('modal-titulo').textContent = 'Novo Serviço';
  document.getElementById('modal-actions').innerHTML = `
    <button type="button" class="btn-primary" onclick="salvarServico()">Salvar</button>
    <button type="button" class="btn-secondary" onclick="closeModal()">Cancelar</button>
  `;

  document.getElementById('modal').classList.add('active');
  window.modoEdicao = false;
  window.servicoEditandoId = null;
}

async function salvarServico() {
  const nome = document.getElementById('servico-nome').value;
  const descricao = document.getElementById('servico-descricao').value;
  const preco = document.getElementById('servico-preco').value;
  const duracaoMinutos = document.getElementById('servico-duracao').value;

  if (!nome || !preco || !duracaoMinutos) {
    showToast('Preencha todos os campos obrigatórios', 'warning');
    return;
  }

  try {
    const method = window.modoEdicao ? 'PUT' : 'POST';
    const url = window.modoEdicao
      ? `${API_URL}/servicos/${window.servicoEditandoId}`
      : `${API_URL}/servicos`;

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, descricao, preco: parseFloat(preco), duracaoMinutos: parseInt(duracaoMinutos) })
    });

    if (response.ok) {
      showToast(window.modoEdicao ? 'Serviço atualizado!' : 'Serviço criado!', 'success');
      closeModal();
      loadServicosAdmin();
      loadServicos();
    } else {
      const data = await response.json();
      showToast(data.error || 'Erro ao salvar serviço', 'error');
    }
  } catch (error) {
    showToast('Erro ao salvar serviço', 'error');
  }
}

async function editarServico(id) {
  try {
    const response = await fetch(`${API_URL}/servicos/${id}`);
    const servico = await response.json();

    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
      <form id="form-servico">
        <div class="form-group">
          <label for="servico-nome">Nome</label>
          <input type="text" id="servico-nome" name="nome" value="${servico.nome}" required>
        </div>
        <div class="form-group">
          <label for="servico-descricao">Descrição</label>
          <textarea id="servico-descricao" name="descricao">${servico.descricao || ''}</textarea>
        </div>
        <div class="form-group">
          <label for="servico-preco">Preço (R$)</label>
          <input type="number" id="servico-preco" name="preco" step="0.01" value="${servico.preco}" required>
        </div>
        <div class="form-group">
          <label for="servico-duracao">Duração (minutos)</label>
          <input type="number" id="servico-duracao" name="duracao" value="${servico.duracao_minutos}" required>
        </div>
      </form>
    `;

    document.getElementById('modal-titulo').textContent = 'Editar Serviço';
    document.getElementById('modal-actions').innerHTML = `
      <button type="button" class="btn-primary" onclick="salvarServico()">Salvar</button>
      <button type="button" class="btn-secondary" onclick="closeModal()">Cancelar</button>
    `;

    document.getElementById('modal').classList.add('active');
    window.modoEdicao = true;
    window.servicoEditandoId = id;
  } catch (error) {
    showToast('Erro ao carregar serviço', 'error');
  }
}

async function excluirServico(id) {
  if (!confirm('Tem certeza que deseja excluir este serviço?')) return;

  try {
    const response = await fetch(`${API_URL}/servicos/${id}`, { method: 'DELETE' });

    if (response.ok) {
      showToast('Serviço excluído!', 'success');
      loadServicosAdmin();
      loadServicos();
    } else {
      const data = await response.json();
      showToast(data.error || 'Erro ao excluir serviço', 'error');
    }
  } catch (error) {
    showToast('Erro ao excluir serviço', 'error');
  }
}

window.editarServico = editarServico;
window.excluirServico = excluirServico;
window.salvarServico = salvarServico;

window.editarAgendamentoCliente = editarAgendamentoCliente;
window.excluirAgendamentoCliente = excluirAgendamentoCliente;

async function editarAgendamentoCliente(agendamentoId) {
  const telefone = document.getElementById('historico-telefone').value.trim();
  if (!telefone) {
    showToast('Digite seu telefone primeiro', 'warning');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/agendamentos/${agendamentoId}`);
    const agendamento = await response.json();

    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
      <form id="form-editar-agendamento">
        <div class="form-group">
          <label for="edit-data">Data e Hora</label>
          <input type="datetime-local" id="edit-data" name="data" value="${agendamento.data_hora.slice(0, 16)}" required>
        </div>
        <div class="form-group">
          <label>Selecione os Serviços</label>
          <div id="edit-servicos-grid" class="servicos-grid"></div>
        </div>
        <div class="form-group">
          <label for="edit-observacoes">Observações</label>
          <textarea id="edit-observacoes" name="observacoes">${agendamento.observacoes || ''}</textarea>
        </div>
      </form>
    `;

    renderServicosEdicao(agendamento.servicos);

    document.getElementById('modal-titulo').textContent = 'Editar Agendamento';
    document.getElementById('modal-actions').innerHTML = `
      <button type="button" class="btn-primary" onclick="salvarEdicaoAgendamento(${agendamentoId}, '${telefone}')">Salvar</button>
      <button type="button" class="btn-secondary" onclick="closeModal()">Cancelar</button>
    `;

    document.getElementById('modal').classList.add('active');
  } catch (error) {
    showToast('Erro ao carregar agendamento', 'error');
  }
}

function renderServicosEdicao(servicosAtuais) {
  const container = document.getElementById('edit-servicos-grid');
  const idsAtuais = servicosAtuais.map(s => s.id);
  window.servicosEdicaoSelecionados = [...idsAtuais];

  container.innerHTML = servicos.map(s => `
    <div class="servico-item ${idsAtuais.includes(s.id) ? 'selected' : ''}" data-id="${s.id}" onclick="toggleServicoEdicao(${s.id})">
      <h4>${s.nome}</h4>
      <p class="preco">R$ ${parseFloat(s.preco).toFixed(2)}</p>
      <p class="duracao">${s.duracao_minutos} min</p>
    </div>
  `).join('');
}

function toggleServicoEdicao(servicoId) {
  const index = window.servicosEdicaoSelecionados.indexOf(servicoId);
  if (index > -1) {
    window.servicosEdicaoSelecionados.splice(index, 1);
  } else {
    window.servicosEdicaoSelecionados.push(servicoId);
  }

  document.querySelectorAll('#edit-servicos-grid .servico-item').forEach(el => {
    const id = parseInt(el.dataset.id);
    el.classList.toggle('selected', window.servicosEdicaoSelecionados.includes(id));
  });
}

async function salvarEdicaoAgendamento(agendamentoId, telefone) {
  const dataHora = document.getElementById('edit-data').value;
  const observacoes = document.getElementById('edit-observacoes').value;

  if (!dataHora) {
    showToast('Selecione uma data e hora', 'warning');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/agendamentos/cliente/${agendamentoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefone, dataHora, servicosIds: window.servicosEdicaoSelecionados, observacoes })
    });

    if (response.ok) {
      showToast('Agendamento atualizado!', 'success');
      closeModal();
      buscarHistorico();
    } else {
      const data = await response.json();
      showToast(data.error || data.message || 'Erro ao atualizar', 'error');
    }
  } catch (error) {
    showToast('Erro ao atualizar agendamento', 'error');
  }
}

async function excluirAgendamentoCliente(agendamentoId) {
  const telefone = document.getElementById('historico-telefone').value.trim();
  if (!telefone) {
    showToast('Digite seu telefone primeiro', 'warning');
    return;
  }

  if (!confirm('Tem certeza que deseja excluir este agendamento?')) return;

  try {
    const response = await fetch(`${API_URL}/agendamentos/cliente/${agendamentoId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefone })
    });

    if (response.ok) {
      showToast('Agendamento removido!', 'success');
      buscarHistorico();
    } else {
      const data = await response.json();
      showToast(data.error || data.message || 'Erro ao excluir', 'error');
    }
  } catch (error) {
    showToast('Erro ao excluir agendamento', 'error');
  }
}

window.toggleServicoEdicao = toggleServicoEdicao;
window.salvarEdicaoAgendamento = salvarEdicaoAgendamento;
window.verificarSenhaAdmin = verificarSenhaAdmin;

const SENHA_ADMIN = 'admin123';

function verificarSenhaAdmin() {
  const senha = document.getElementById('admin-senha').value;
  if (senha === SENHA_ADMIN) {
    window.adminAutenticado = true;
    closeModal();
    showArea('admin');
    loadDashboard();
  } else {
    showToast('Senha incorreta', 'error');
  }
}

window.sairAdmin = function () {
  window.adminAutenticado = false;
  showArea('cliente');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('btn-cliente').classList.add('active');
};

window.editarAgendamentoAdmin = async function (agendamentoId) {
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
            <option value="concluido" ${agendamento.status === 'concluido' ? 'selected' : ''}>Concluído</option>
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
};

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
      showToast(data.error || 'Erro ao atualizar', 'error');
    }
  } catch (error) {
    showToast('Erro ao atualizar agendamento', 'error');
  }
}

window.toggleServicoEdicaoAdmin = toggleServicoEdicaoAdmin;