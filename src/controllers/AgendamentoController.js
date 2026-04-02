const Agendamento = require('../models/Agendamento');
const Cliente = require('../models/Cliente');
const Servico = require('../models/Servico');

class AgendamentoController {
  static async create(req, res) {
    try {
      const { clienteId, dataHora, servicosIds, observacoes, ignoreSameWeek } = req.body;

      if (!clienteId || !dataHora) {
        return res.status(400).json({ error: 'Cliente e data/hora são obrigatórios' });
      }

      const cliente = await Cliente.findById(clienteId);
      if (!cliente) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      const dataAgendamento = new Date(dataHora);
      const agora = new Date();
      if (dataAgendamento < agora) {
        return res.status(400).json({ error: 'Não é possível agendar para uma data passada' });
      }

      if (!ignoreSameWeek) {
        const sameWeekAgendamentos = await Agendamento.checkSameWeekAgendamento(clienteId, dataHora);

        if (sameWeekAgendamentos.length > 0) {
          const existingAgendamento = await Agendamento.findById(sameWeekAgendamentos[0].id);
          return res.status(200).json({
            message: `Atenção: Você já possui agendamento essa semana. Considere unificar os serviços para uma única visita.`,
            existingAgendamento,
            suggested: true
          });
        }
      }

      const agendamento = await Agendamento.create(clienteId, dataHora, servicosIds, observacoes);

      res.status(201).json(agendamento);
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      res.status(500).json({ error: 'Erro ao criar agendamento' });
    }
  }

  static async findAll(req, res) {
    try {
      const agendamentos = await Agendamento.findAll();
      res.json(agendamentos);
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
      res.status(500).json({ error: 'Erro ao buscar agendamentos' });
    }
  }

  static async findById(req, res) {
    try {
      const { id } = req.params;
      const agendamento = await Agendamento.findById(id);

      if (!agendamento) {
        return res.status(404).json({ error: 'Agendamento não encontrado' });
      }

      res.json(agendamento);
    } catch (error) {
      console.error('Erro ao buscar agendamento:', error);
      res.status(500).json({ error: 'Erro ao buscar agendamento' });
    }
  }

  static async findByCliente(req, res) {
    try {
      const { clienteId } = req.params;
      const agendamentos = await Agendamento.findByClienteId(clienteId);
      res.json(agendamentos);
    } catch (error) {
      console.error('Erro ao buscar agendamentos do cliente:', error);
      res.status(500).json({ error: 'Erro ao buscar agendamentos' });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const { dataHora, status, observacoes, servicosIds } = req.body;

      const existingAgendamento = await Agendamento.findById(id);
      if (!existingAgendamento) {
        return res.status(404).json({ error: 'Agendamento não encontrado' });
      }

      if (dataHora && status === undefined) {
        const dataAgendamentoOriginal = new Date(existingAgendamento.data_hora);
        const agora = new Date();
        const doisDiasMs = 2 * 24 * 60 * 60 * 1000;

        if (dataAgendamentoOriginal.getTime() - agora.getTime() < doisDiasMs) {
          return res.status(403).json({
            error: 'Alteração permitida apenas via telefone (31) XXXX-XXXX',
            message: 'Agendamentos com menos de 48h de antecedência só podem ser alterados por telefone.'
          });
        }
      }

      const agendamento = await Agendamento.update(id, dataHora, status, observacoes, servicosIds);
      res.json(agendamento);
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error);
      res.status(500).json({ error: 'Erro ao atualizar agendamento' });
    }
  }

  static async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ['pendente', 'confirmado', 'concluido', 'cancelado'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Status inválido' });
      }

      const existingAgendamento = await Agendamento.findById(id);
      if (!existingAgendamento) {
        return res.status(404).json({ error: 'Agendamento não encontrado' });
      }

      const agendamento = await Agendamento.updateStatus(id, status);
      res.json(agendamento);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      res.status(500).json({ error: 'Erro ao atualizar status' });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;

      const existingAgendamento = await Agendamento.findById(id);
      if (!existingAgendamento) {
        return res.status(404).json({ error: 'Agendamento não encontrado' });
      }

      const dataAgendamento = new Date(existingAgendamento.data_hora);
      const agora = new Date();
      const doisDiasMs = 2 * 24 * 60 * 60 * 1000;

      if (dataAgendamento.getTime() - agora.getTime() < doisDiasMs) {
        return res.status(403).json({
          error: 'Cancelamento permitido apenas via telefone (31) XXXX-XXXX',
          message: 'Agendamentos com menos de 48h de antecedência só podem ser cancelados por telefone.'
        });
      }

      await Agendamento.delete(id);
      res.json({ message: 'Agendamento deletado com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar agendamento:', error);
      res.status(500).json({ error: 'Erro ao deletar agendamento' });
    }
  }

  static async deleteByCliente(req, res) {
    try {
      const { agendamentoId } = req.params;
      const { telefone } = req.body;

      const agendamento = await Agendamento.findById(agendamentoId);
      if (!agendamento) {
        return res.status(404).json({ error: 'Agendamento não encontrado' });
      }

      if (agendamento.status === 'confirmado') {
        return res.status(403).json({
          error: 'Agendamento já confirmado',
          message: 'Entre em contato por telefone para cancelar.'
        });
      }

      const cliente = await Cliente.findById(agendamento.cliente_id);
      if (cliente.telefone !== telefone) {
        return res.status(403).json({ error: 'Telefone não confere' });
      }

      const dataAgendamento = new Date(agendamento.data_hora);
      const agora = new Date();
      const doisDiasMs = 2 * 24 * 60 * 60 * 1000;

      if (dataAgendamento.getTime() - agora.getTime() < doisDiasMs) {
        return res.status(403).json({
          error: 'Alteração permitida apenas via telefone (31) XXXX-XXXX',
          message: 'Agendamentos com menos de 48h de antecedência só podem ser alterados por telefone.'
        });
      }

      await Agendamento.delete(agendamentoId);
      res.json({ message: 'Agendamento removido com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar agendamento:', error);
      res.status(500).json({ error: 'Erro ao deletar agendamento' });
    }
  }

  static async updateByCliente(req, res) {
    try {
      const { agendamentoId } = req.params;
      const { telefone, dataHora, servicosIds, observacoes } = req.body;

      const agendamento = await Agendamento.findById(agendamentoId);
      if (!agendamento) {
        return res.status(404).json({ error: 'Agendamento não encontrado' });
      }

      if (agendamento.status === 'confirmado') {
        return res.status(403).json({
          error: 'Agendamento já confirmado',
          message: 'Entre em contato por telefone para alterar.'
        });
      }

      const cliente = await Cliente.findById(agendamento.cliente_id);
      if (cliente.telefone !== telefone) {
        return res.status(403).json({ error: 'Telefone não confere' });
      }

      const dataAgendamento = new Date(dataHora || agendamento.data_hora);
      const agora = new Date();
      const doisDiasMs = 2 * 24 * 60 * 60 * 1000;

      if (dataAgendamento.getTime() - agora.getTime() < doisDiasMs) {
        return res.status(403).json({
          error: 'Alteração permitida apenas via telefone (31) XXXX-XXXX',
          message: 'Agendamentos com menos de 48h de antecedência só podem ser alterados por telefone.'
        });
      }

      const updated = await Agendamento.update(agendamentoId, dataHora, undefined, observacoes, servicosIds);
      res.json(updated);
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error);
      res.status(500).json({ error: 'Erro ao atualizar agendamento' });
    }
  }

  static async dashboard(req, res) {
    try {
      const dashboardData = await Agendamento.getDashboardData();
      const dailyStats = await Agendamento.getDailyStats(7);

      res.json({
        ...dashboardData,
        dailyStats
      });
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
      res.status(500).json({ error: 'Erro ao buscar dados do dashboard' });
    }
  }
}

module.exports = AgendamentoController;