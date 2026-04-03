const express = require('express');
const router = express.Router();

const ClienteController = require('../controllers/ClienteController');
const ServicoController = require('../controllers/ServicoController');
const AgendamentoController = require('../controllers/AgendamentoController');
const ConfiguracaoController = require('../controllers/ConfiguracaoController');

router.get('/', (req, res) => {
  res.json({ message: 'API Cabeleleila Leila funcionando!' });
});

router.get('/configuracoes', ConfiguracaoController.getAll);
router.put('/configuracoes', ConfiguracaoController.update);

router.post('/clientes', ClienteController.create);
router.get('/clientes', ClienteController.findAll);
router.get('/clientes/telefone', ClienteController.findByTelefone);
router.get('/clientes/:id', ClienteController.findById);
router.put('/clientes/:id', ClienteController.update);
router.delete('/clientes/:id', ClienteController.delete);

router.post('/servicos', ServicoController.create);
router.get('/servicos', ServicoController.findAll);
router.get('/servicos/:id', ServicoController.findById);
router.put('/servicos/:id', ServicoController.update);
router.delete('/servicos/:id', ServicoController.delete);

router.post('/agendamentos', AgendamentoController.create);
router.get('/agendamentos', AgendamentoController.findAll);
router.get('/agendamentos/ocupados', AgendamentoController.getOcupados);
router.get('/agendamentos/:id', AgendamentoController.findById);
router.get('/agendamentos/cliente/:clienteId', AgendamentoController.findByCliente);
router.put('/agendamentos/:id', AgendamentoController.update);
router.patch('/agendamentos/:id/status', AgendamentoController.updateStatus);
router.delete('/agendamentos/:id', AgendamentoController.delete);

router.delete('/agendamentos/cliente/:agendamentoId', AgendamentoController.deleteByCliente);
router.put('/agendamentos/cliente/:agendamentoId', AgendamentoController.updateByCliente);

router.get('/dashboard', AgendamentoController.dashboard);

module.exports = router;