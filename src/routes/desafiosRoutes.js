const express = require('express');
const router = express.Router();
const {listarCatalogoDesafios,buscarOpcoesPersonalizacao,criarDesafioInstanciado,listarDesafiosDoUsuario,atualizarDesafio,deletarDesafio} = require('../controllers/desafioController');
const authMiddleware = require('../middleware/authMiddleware'); 

// Aplica o middleware de autenticação a TODAS as rotas neste roteador.
// Isso garante que req.userId estará disponível no controlador.
router.use(authMiddleware);

// --- Rotas de Catálogo (Busca de Modelos e Opções) ---

// 1. GET /api/desafios/catalogo
// Lista todos os modelos prontos (templates) de desafios para o usuário escolher.
router.get('/catalogo',listarCatalogoDesafios);

// 2. GET /api/desafios/opcoes/:tipo
// Busca as regras de personalização para um tipo de desafio (Ex: 'LEITURA')
router.get('/opcoes/:tipo',buscarOpcoesPersonalizacao);


// --- Rotas de Instância (CRUD de Desafios do Usuário) ---

// 3. POST /api/desafios
// Cria um novo desafio instanciado/personalizado a partir de um modelo do catálogo.
router.post('/',criarDesafioInstanciado);

// 4. GET /api/desafios
// Lista todos os desafios ativos do usuário logado.
router.get('/',listarDesafiosDoUsuario);

// 5. PUT /api/desafios/:id
// Atualiza dados de um desafio (Ex: frequência, XP, ou objeto de personalização JSON).
router.put('/:id',atualizarDesafio);

// 6. DELETE /api/desafios/:id
// Deleta um desafio específico do usuário.
router.delete('/:id',deletarDesafio);

module.exports = router;