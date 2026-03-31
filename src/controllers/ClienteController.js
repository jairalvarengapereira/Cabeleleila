const Cliente = require('../models/Cliente');

class ClienteController {
    static async create(req, res) {
        try {
            const { nome, telefone, email } = req.body;
            
            if (!nome || !telefone) {
                return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
            }
            
            const existingCliente = await Cliente.findByTelefone(telefone);
            if (existingCliente) {
                return res.status(409).json({ error: 'Cliente com este telefone já existe', cliente: existingCliente });
            }
            
            const cliente = await Cliente.create(nome, telefone, email);
            res.status(201).json(cliente);
        } catch (error) {
            console.error('Erro ao criar cliente:', error);
            res.status(500).json({ error: 'Erro ao criar cliente' });
        }
    }

    static async findAll(req, res) {
        try {
            const clientes = await Cliente.findAll();
            res.json(clientes);
        } catch (error) {
            console.error('Erro ao buscar clientes:', error);
            res.status(500).json({ error: 'Erro ao buscar clientes' });
        }
    }

    static async findById(req, res) {
        try {
            const { id } = req.params;
            const cliente = await Cliente.findById(id);
            
            if (!cliente) {
                return res.status(404).json({ error: 'Cliente não encontrado' });
            }
            
            res.json(cliente);
        } catch (error) {
            console.error('Erro ao buscar cliente:', error);
            res.status(500).json({ error: 'Erro ao buscar cliente' });
        }
    }

    static async findByTelefone(req, res) {
        try {
            const { telefone } = req.query;
            
            if (!telefone) {
                return res.status(400).json({ error: 'Telefone é obrigatório' });
            }
            
            const cliente = await Cliente.findByTelefone(telefone);
            
            if (!cliente) {
                return res.status(404).json({ error: 'Cliente não encontrado' });
            }
            
            res.json(cliente);
        } catch (error) {
            console.error('Erro ao buscar cliente por telefone:', error);
            res.status(500).json({ error: 'Erro ao buscar cliente' });
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            const { nome, telefone, email } = req.body;
            
            const existingCliente = await Cliente.findById(id);
            if (!existingCliente) {
                return res.status(404).json({ error: 'Cliente não encontrado' });
            }
            
            const cliente = await Cliente.update(id, nome, telefone, email);
            res.json(cliente);
        } catch (error) {
            console.error('Erro ao atualizar cliente:', error);
            res.status(500).json({ error: 'Erro ao atualizar cliente' });
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            
            const existingCliente = await Cliente.findById(id);
            if (!existingCliente) {
                return res.status(404).json({ error: 'Cliente não encontrado' });
            }
            
            await Cliente.delete(id);
            res.json({ message: 'Cliente deletado com sucesso' });
        } catch (error) {
            console.error('Erro ao deletar cliente:', error);
            res.status(500).json({ error: 'Erro ao deletar cliente' });
        }
    }
}

module.exports = ClienteController;