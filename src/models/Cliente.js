const pool = require('../config/db');

class Cliente {
    static async create(nome, telefone, email) {
        const query = `
            INSERT INTO clientes (nome, telefone, email)
            VALUES ($1, $2, $3)
            RETURNING *`;
        const result = await pool.query(query, [nome, telefone, email]);
        return result.rows[0];
    }

    static async findAll() {
        const query = 'SELECT * FROM clientes ORDER BY nome';
        const result = await pool.query(query);
        return result.rows;
    }

    static async findById(id) {
        const query = 'SELECT * FROM clientes WHERE id = $1';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    static async findByTelefone(telefone) {
        const query = 'SELECT * FROM clientes WHERE telefone = $1';
        const result = await pool.query(query, [telefone]);
        return result.rows[0];
    }

    static async update(id, nome, telefone, email) {
        const query = `
            UPDATE clientes 
            SET nome = $1, telefone = $2, email = $3
            WHERE id = $4
            RETURNING *`;
        const result = await pool.query(query, [nome, telefone, email, id]);
        return result.rows[0];
    }

    static async delete(id) {
        const query = 'DELETE FROM clientes WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }
}

module.exports = Cliente;