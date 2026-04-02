const pool = require('../config/db');

class Agendamento {
  static async create(clienteId, dataHora, servicosIds, observacoes) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const agendamentoQuery = `
        INSERT INTO agendamentos (cliente_id, data_hora, observacoes)
        VALUES ($1, $2, $3)
        RETURNING *`;
      const agendamentoResult = await client.query(agendamentoQuery, [clienteId, dataHora, observacoes]);
      const agendamento = agendamentoResult.rows[0];

      if (servicosIds && servicosIds.length > 0) {
        for (const servicoId of servicosIds) {
          await client.query(
            'INSERT INTO agendamento_servicos (agendamento_id, servico_id) VALUES ($1, $2)',
            [agendamento.id, servicoId]
          );
        }
      }

      await client.query('COMMIT');
      return await this.findById(agendamento.id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async findAll() {
    const query = `
      SELECT 
        a.id, a.data_hora, a.status, a.observacoes, a.created_at, a.updated_at,
        c.id as cliente_id, c.nome as cliente_nome, c.telefone as cliente_telefone, c.email as cliente_email,
        COALESCE(
          (SELECT json_agg(s_data) FROM (
            SELECT DISTINCT s.id, s.nome, s.preco, s.duracao_minutos
            FROM servicos s
            JOIN agendamento_servicos ast2 ON s.id = ast2.servico_id
            WHERE ast2.agendamento_id = a.id
          ) s_data),
          '[]'
        ) as servicos
      FROM agendamentos a
      LEFT JOIN clientes c ON a.cliente_id = c.id
      GROUP BY a.id, c.id
      ORDER BY a.data_hora DESC`;
    const result = await pool.query(query);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      SELECT 
        a.id, a.data_hora, a.status, a.observacoes, a.created_at, a.updated_at,
        c.id as cliente_id, c.nome as cliente_nome, c.telefone as cliente_telefone, c.email as cliente_email,
        COALESCE(
          (SELECT json_agg(s_data) FROM (
            SELECT DISTINCT s.id, s.nome, s.preco, s.duracao_minutos
            FROM servicos s
            JOIN agendamento_servicos ast2 ON s.id = ast2.servico_id
            WHERE ast2.agendamento_id = a.id
          ) s_data),
          '[]'
        ) as servicos
      FROM agendamentos a
      LEFT JOIN clientes c ON a.cliente_id = c.id
      WHERE a.id = $1
      GROUP BY a.id, c.id
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByClienteId(clienteId) {
    const query = `
      SELECT 
        a.id, a.data_hora, a.status, a.observacoes, a.created_at, a.updated_at,
        COALESCE(
          (SELECT json_agg(s_data) FROM (
            SELECT DISTINCT s.id, s.nome, s.preco, s.duracao_minutos
            FROM servicos s
            JOIN agendamento_servicos ast2 ON s.id = ast2.servico_id
            WHERE ast2.agendamento_id = a.id
          ) s_data),
          '[]'
        ) as servicos
      FROM agendamentos a
      WHERE a.cliente_id = $1
      GROUP BY a.id
      ORDER BY a.data_hora DESC`;
    const result = await pool.query(query, [clienteId]);
    return result.rows;
  }

  static async checkSameWeekAgendamento(clienteId, dataHora) {
    const query = `
      SELECT a.id, a.data_hora, a.status
      FROM agendamentos a
      WHERE a.cliente_id = $1
      AND a.data_hora >= $2::timestamp - INTERVAL '7 days'
      AND a.data_hora <= $2::timestamp + INTERVAL '7 days'
      AND a.status != 'cancelado'`;
    const result = await pool.query(query, [clienteId, dataHora]);
    return result.rows;
  }

  static async update(id, dataHora, status, observacoes, servicosIds) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let updateQuery = 'UPDATE agendamentos SET ';
      const params = [];
      let paramIndex = 1;

      if (dataHora !== undefined) {
        updateQuery += `data_hora = $${paramIndex++}, `;
        params.push(dataHora);
      }
      if (status !== undefined) {
        updateQuery += `status = $${paramIndex++}, `;
        params.push(status);
      }
      if (observacoes !== undefined) {
        updateQuery += `observacoes = $${paramIndex++}, `;
        params.push(observacoes);
      }

      updateQuery += `updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex++}`;
      params.push(id);

      await client.query(updateQuery, params);

      if (servicosIds !== undefined && servicosIds.length > 0) {
        const existingResult = await client.query(
          'SELECT servico_id FROM agendamento_servicos WHERE agendamento_id = $1',
          [id]
        );
        const existingIds = existingResult.rows.map(r => r.servico_id);

        for (const servicoId of servicosIds) {
          if (!existingIds.includes(servicoId)) {
            await client.query(
              'INSERT INTO agendamento_servicos (agendamento_id, servico_id) VALUES ($1, $2)',
              [id, servicoId]
            );
          }
        }
      }

      await client.query('COMMIT');
      return await this.findById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateStatus(id, status) {
    const query = `
      UPDATE agendamentos 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *`;
    const result = await pool.query(query, [status, id]);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM agendamentos WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async getDashboardData() {
    const query = `
      SELECT 
        COUNT(*) as total_agendamentos,
        COUNT(*) FILTER (WHERE status = 'confirmado') as confirmados,
        COUNT(*) FILTER (WHERE status = 'concluido') as concluidos,
        COUNT(*) FILTER (WHERE status = 'pendente') as pendentes,
        COALESCE(SUM(s.preco), 0) as faturamento_total
      FROM agendamentos a
      LEFT JOIN agendamento_servicos ast ON a.id = ast.agendamento_id
      LEFT JOIN servicos s ON ast.servico_id = s.id
      WHERE a.data_hora >= CURRENT_DATE - INTERVAL '7 days'
      AND a.status = 'concluido'`;
    const result = await pool.query(query);
    return result.rows[0];
  }

  static async getDailyStats(days = 7) {
    const query = `
      SELECT 
        DATE(a.data_hora) as data,
        COUNT(*) as total_agendamentos,
        COUNT(*) FILTER (WHERE a.status = 'concluido') as concluidos,
        COALESCE(SUM(s.preco), 0) as faturamento
      FROM agendamentos a
      LEFT JOIN agendamento_servicos ast ON a.id = ast.agendamento_id
      LEFT JOIN servicos s ON ast.servico_id = s.id
      WHERE a.data_hora >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(a.data_hora)
      ORDER BY data`;
    const result = await pool.query(query);
    return result.rows;
  }
}

module.exports = Agendamento;