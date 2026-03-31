const pool = require('../config/db');

class Servico {
    static async create(nome, descricao, preco, duracaoMinutos) {
        const query = `
            INSERT INTO servicos (nome, descricao, preco, duracao_minutos)
            VALUES ($1, $2, $3, $4)
            RETURNING *`;
        const result = await pool.query(query, [nome, descricao, preco, duracaoMinutos]);
        return result.rows[0];
    }

    static async findAll() {
        const query = 'SELECT * FROM servicos ORDER BY nome';
        const result = await pool.query(query);
        return result.rows;
    }

    static async findById(id) {
        const query = 'SELECT * FROM servicos WHERE id = $1';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    static async findByIds(ids) {
        const query = 'SELECT * FROM servicos WHERE id = ANY($1)';
        const result = await pool.query(query, [ids]);
        return result.rows;
    }

    static async update(id, nome, descricao, preco, duracaoMinutos) {
        const query = `
            UPDATE servicos 
            SET nome = $1, descricao = $2, preco = $3, duracao_minutos = $4
            WHERE id = $5
            RETURNING *`;
        const result = await pool.query(query, [nome, descricao, preco, duracaoMinutos, id]);
        return result.rows[0];
    }

    static async delete(id) {
        const query = 'DELETE FROM servicos WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }
}

module.exports = Servico;