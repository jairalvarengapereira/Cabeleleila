const Configuracao = require('../models/Configuracao');

class ConfiguracaoController {
  static async getAll(req, res) {
    try {
      const config = await Configuracao.getAll();
      res.json(config);
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      res.status(500).json({ error: 'Erro ao buscar configurações' });
    }
  }

  static async update(req, res) {
    try {
      const { chave, valor } = req.body;
      if (!chave || !valor) {
        return res.status(400).json({ error: 'Chave e valor são obrigatórios' });
      }
      const config = await Configuracao.set(chave, valor);
      res.json(config);
    } catch (error) {
      console.error('Erro ao atualizar configuração:', error);
      res.status(500).json({ error: 'Erro ao atualizar configuração' });
    }
  }
}

module.exports = ConfiguracaoController;
