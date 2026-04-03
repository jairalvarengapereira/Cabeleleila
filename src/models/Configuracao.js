const pool = require('../config/db');

class Configuracao {
  static async get(chave) {
    const result = await pool.query('SELECT valor FROM configuracoes WHERE chave = $1', [chave]);
    return result.rows[0]?.valor;
  }

  static async set(chave, valor) {
    const result = await pool.query(
      `INSERT INTO configuracoes (chave, valor, updated_at) 
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (chave) DO UPDATE SET valor = $2, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [chave, valor]
    );
    return result.rows[0];
  }

  static async getAll() {
    const result = await pool.query('SELECT chave, valor FROM configuracoes');
    const config = {};
    result.rows.forEach(row => {
      config[row.chave] = row.valor;
    });
    return config;
  }
}

module.exports = Configuracao;
