// routes/historicoRoutes.js
const express = require('express');
const router = express.Router();
const {registrarConclusao,listarHistoricoDiario,listarHistoricoPorDesafio} = require('../controllers/historicoController');
const authMiddleware = require('../middleware/authMiddleware'); 

// Aplica o middleware de autenticação a TODAS as rotas de histórico.
router.use(authMiddleware);

// POST /api/historico/concluir - A principal rota para registrar o progresso e XP.
router.post('/concluir',registrarConclusao);

// GET /api/historico/diario - Lista o histórico de um dia específico (ou hoje) para o dashboard.
router.get('/diario',listarHistoricoDiario);

// GET /api/historico/desafio/:id - Lista o histórico completo de um desafio específico.
router.get('/desafio/:id',listarHistoricoPorDesafio);

module.exports = router;