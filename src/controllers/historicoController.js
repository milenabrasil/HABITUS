const pool = require("../config/db"); 
const conquistaController = require('./conquistaController'); // Controlador importado corretamente

// Função auxiliar para obter a data atual formatada (YYYY-MM-DD)
const getTodayDate = () => {
    // Retorna a data no formato MySQL DATE
    return new Date().toISOString().split('T')[0]; 
};

// REGISTRAR CONCLUSÃO (Ação Principal de XP)
// Rota: POST /api/historico/concluir
exports.registrarConclusao = async (req, res) => {
    const id_usuario = req.userId;
    const { id_desafio } = req.body;
    const data_execucao = getTodayDate(); // Data de hoje
    
    // A checagem de obrigatoriedade é feita antes da transação
    if (!id_desafio) {
        return res.status(400).json({ message: "O ID do desafio é obrigatório." });
    }

    // Inicia a transação para garantir que o histórico e o XP sejam atualizados juntos
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // A. VERIFICAÇÃO DE DUPLICIDADE E PROPRIEDADE
        
        // 1. Verifica se o desafio já foi concluído hoje pelo usuário
        const [existingEntry] = await connection.query(
            "SELECT id_historico FROM historico_desafio WHERE id_desafio = ? AND id_usuario = ? AND data_execucao = ? AND status = 'concluido'",
            [id_desafio, id_usuario, data_execucao]
        );

        if (existingEntry.length > 0) {
            await connection.commit(); // Fecha a conexão, pois não há erro, apenas duplicidade
            return res.status(409).json({ message: "Desafio já concluído hoje." });
        }

        // 2. Obtém o XP e garante que o desafio pertence ao usuário
        const [desafio] = await connection.query(
            `SELECT d.xp_recompensa 
             FROM desafios d 
             JOIN objetivos o ON d.id_objetivo = o.id_objetivo 
             WHERE d.id_desafio = ? AND o.id_usuario = ?`,
            [id_desafio, id_usuario]
        );

        if (desafio.length === 0) {
            await connection.rollback(); // Desfaz se não for do usuário
            return res.status(404).json({ message: "Desafio não encontrado ou não pertence ao usuário." });
        }

        const xp_ganho = desafio[0].xp_recompensa;

        // B. REGISTRO E ATUALIZAÇÃO DO XP
        
        // 3. Insere a execução na tabela 'historico_desafio'
        await connection.query(
            `INSERT INTO historico_desafio 
                (id_usuario, id_desafio, data_execucao, status, xp_ganho) 
             VALUES (?, ?, ?, 'concluido', ?)`,
            [id_usuario, id_desafio, data_execucao, xp_ganho]
        );

        // 4. Atualiza o XP total do usuário na tabela 'usuarios'
        await connection.query(
            "UPDATE usuarios SET xp_total = xp_total + ? WHERE id_usuario = ?",
            [xp_ganho, id_usuario]
        );
        
        // C. VERIFICAÇÃO DE CONQUISTAS (A MODIFICAÇÃO ESTÁ AQUI)
        // 5. Chamada à função de verificação DENTRO da transação, após o XP ser atualizado
        const novasConquistas = await conquistaController.verificarEConcederConquistas(connection, id_usuario);
        
        // D. FINALIZAÇÃO
        
        // 6. Confirma todas as operações no banco de dados
        await connection.commit();
        
        // 7. Retorna a resposta com as novas conquistas para o frontend
        return res.status(201).json({ 
            message: "Desafio concluído! XP concedido e conquistas verificadas.", 
            xp_ganho: xp_ganho,
            novas_conquistas: novasConquistas // Retorna a lista de novas conquistas!
        });

    } catch (error) {
        // Se qualquer passo falhar (incluindo a concessão da conquista), desfaz tudo
        await connection.rollback();
        console.error("Erro registrarConclusao:", error);
        return res.status(500).json({ message: "Erro ao registrar conclusão do desafio.", error });
    } finally {
        // Libera a conexão com o pool
        connection.release();
    }
};

// 2. LISTAR HISTÓRICO DIÁRIO (Continua o mesmo)
exports.listarHistoricoDiario = async (req, res) => {
    const id_usuario = req.userId;
    const data_alvo = req.query.data || getTodayDate(); 

    try {
        const [rows] = await pool.query(
            `SELECT 
                hd.data_execucao, hd.xp_ganho, hd.status,
                d.nome_desafio, d.tipo_desafio
             FROM historico_desafio hd
             JOIN desafios d ON hd.id_desafio = d.id_desafio
             WHERE hd.id_usuario = ? AND hd.data_execucao = ?
             ORDER BY hd.id_historico DESC`,
            [id_usuario, data_alvo]
        );

        return res.json(rows);

    } catch (error) {
        console.error("Erro listarHistoricoDiario:", error);
        return res.status(500).json({ message: "Erro ao listar histórico diário." });
    }
};

// 3. LISTAR HISTÓRICO POR DESAFIO (Continua o mesmo)
exports.listarHistoricoPorDesafio = async (req, res) => {
    const id_usuario = req.userId;
    const { id } = req.params; 

    try {
        const [ownerCheck] = await pool.query(
            `SELECT 1 FROM desafios d JOIN objetivos o ON d.id_objetivo = o.id_objetivo WHERE d.id_desafio = ? AND o.id_usuario = ?`,
            [id, id_usuario]
        );

        if (ownerCheck.length === 0) {
            return res.status(404).json({ message: "Desafio não encontrado ou acesso negado." });
        }
        
        const [rows] = await pool.query(
            `SELECT data_execucao, status, xp_ganho 
             FROM historico_desafio 
             WHERE id_desafio = ? AND id_usuario = ?
             ORDER BY data_execucao DESC`,
            [id, id_usuario]
        );

        return res.json(rows);

    } catch (error) {
        console.error("Erro listarHistoricoPorDesafio:", error);
        return res.status(500).json({ message: "Erro ao listar histórico do desafio." });
    }
};