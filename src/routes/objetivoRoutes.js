const express = require('express');
const router = express.Router();
const {listarCatalogo,selecionarObjetivoCatalogo,criarObjetivo,listarObjetivos,atualizarObjetivo,deletarObjetivo} = require('../controllers/objetivoController');
const authMiddleware = require('../middleware/authMiddleware'); 

// Todas as rotas de objetivo exigem que o usuário esteja logado
router.use(authMiddleware);

// Rotas do Catálogo (Busca de modelos)
router.get('/catalogo',listarCatalogo);
router.post('/catalogo/selecionar',selecionarObjetivoCatalogo); // Cria a instância a partir do catálogo

// Rotas de Instância (CRUD do Usuário)
router.post('/',criarObjetivo); // Cria objetivo personalizado (manual)
router.get('/',listarObjetivos); // Lista objetivos ativos do usuário
router.put('/:id',atualizarObjetivo); // Atualiza status ou dados
router.delete('/:id',deletarObjetivo);

module.exports = router;