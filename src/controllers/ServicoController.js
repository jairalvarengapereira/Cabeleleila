const Servico = require('../models/Servico');

class ServicoController {
    static async create(req, res) {
        try {
            const { nome, descricao, preco, duracaoMinutos } = req.body;
            
            if (!nome || !preco || !duracaoMinutos) {
                return res.status(400).json({ error: 'Nome, preço e duração são obrigatórios' });
            }
            
            const servico = await Servico.create(nome, descricao, preco, duracaoMinutos);
            res.status(201).json(servico);
        } catch (error) {
            console.error('Erro ao criar serviço:', error);
            res.status(500).json({ error: 'Erro ao criar serviço' });
        }
    }

    static async findAll(req, res) {
        try {
            const servicos = await Servico.findAll();
            res.json(servicos);
        } catch (error) {
            console.error('Erro ao buscar serviços:', error);
            res.status(500).json({ error: 'Erro ao buscar serviços' });
        }
    }

    static async findById(req, res) {
        try {
            const { id } = req.params;
            const servico = await Servico.findById(id);
            
            if (!servico) {
                return res.status(404).json({ error: 'Serviço não encontrado' });
            }
            
            res.json(servico);
        } catch (error) {
            console.error('Erro ao buscar serviço:', error);
            res.status(500).json({ error: 'Erro ao buscar serviço' });
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            const { nome, descricao, preco, duracaoMinutos } = req.body;
            
            const existingServico = await Servico.findById(id);
            if (!existingServico) {
                return res.status(404).json({ error: 'Serviço não encontrado' });
            }
            
            const servico = await Servico.update(id, nome, descricao, preco, duracaoMinutos);
            res.json(servico);
        } catch (error) {
            console.error('Erro ao atualizar serviço:', error);
            res.status(500).json({ error: 'Erro ao atualizar serviço' });
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            
            const existingServico = await Servico.findById(id);
            if (!existingServico) {
                return res.status(404).json({ error: 'Serviço não encontrado' });
            }
            
            await Servico.delete(id);
            res.json({ message: 'Serviço deletado com sucesso' });
        } catch (error) {
            console.error('Erro ao deletar serviço:', error);
            res.status(500).json({ error: 'Erro ao deletar serviço' });
        }
    }
}

module.exports = ServicoController;