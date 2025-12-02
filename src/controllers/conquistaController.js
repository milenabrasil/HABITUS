// controllers/conquistaController.js
const pool = require("../config/db"); 

// Função auxiliar para converter strings de data MySQL (YYYY-MM-DD) para objetos Date
const parseDate = (dateString) => {
    // Adiciona "T00:00:00" para garantir que o objeto Date seja criado em UTC 
    // e evitar problemas com fuso horário na comparação.
    return new Date(dateString + 'T00:00:00'); 
};


// ----------------------------------------------------
// 1. LISTAR CATÁLOGO DE CONQUISTAS (Templates)
// Rota: GET /api/conquistas/catalogo
// ----------------------------------------------------
exports.listarCatalogoConquistas = async (req, res) => {
    try {
        // Retorna todos os modelos de conquistas disponíveis no sistema
        const [rows] = await pool.query(
            "SELECT id_conquista, nome_conquista, descricao, url_emblema, requisito FROM conquistas ORDER BY nome_conquista"
        );
        return res.json(rows);
    } catch (error) {
        console.error("Erro listarCatalogoConquistas:", error);
        return res.status(500).json({ message: "Erro ao listar catálogo de conquistas." });
    }
};

// ----------------------------------------------------
// 2. LISTAR CONQUISTAS DO USUÁRIO (O que ele já ganhou)
// Rota: GET /api/conquistas/usuario
// ----------------------------------------------------
exports.listarConquistasDoUsuario = async (req, res) => {
    const id_usuario = req.userId;

    try {
        // Junta as tabelas para mostrar os detalhes do emblema que o usuário ganhou
        const [rows] = await pool.query(
            `SELECT 
                c.nome_conquista, c.descricao, c.url_emblema, uc.data_conquista
             FROM usuario_conquista uc
             JOIN conquistas c ON uc.id_conquista = c.id_conquista
             WHERE uc.id_usuario = ?
             ORDER BY uc.data_conquista DESC`,
            [id_usuario]
        );

        return res.json(rows);

    } catch (error) {
        console.error("Erro listarConquistasDoUsuario:", error);
        return res.status(500).json({ message: "Erro ao listar conquistas do usuário." });
    }
};

// ----------------------------------------------------
// 3. FUNÇÃO AUXILIAR: VERIFICA E CONCEDE CONQUISTAS
// Chamada DENTRO da transação do historicoController.js
// ----------------------------------------------------
exports.verificarEConcederConquistas = async (connection, id_usuario) => {
    let novasConquistas = [];

    // 1. Buscar todas as conquistas disponíveis
    const [allConquests] = await connection.query(
        "SELECT id_conquista, nome_conquista, requisito FROM conquistas"
    );

    // 2. Buscar XP total do usuário e conquistas já ganhas
    const [userStats] = await connection.query(
        "SELECT xp_total FROM usuarios WHERE id_usuario = ?", 
        [id_usuario]
    );
    
    // Obter IDs das conquistas já ganhas para pular a verificação
    const [achievedIds] = await connection.query(
        "SELECT id_conquista FROM usuario_conquista WHERE id_usuario = ?", 
        [id_usuario]
    );
    const achievedSet = new Set(achievedIds.map(row => row.id_conquista));

    const xp_total = userStats[0]?.xp_total || 0;

    // 3. Iterar sobre cada conquista e verificar o requisito
    for (const conquest of allConquests) {
        if (achievedSet.has(conquest.id_conquista)) {
            continue; // Já ganhou, pula a checagem
        }

        const req = conquest.requisito;
        let isMet = false;

        // --- Lógica: Total de Desafios ---
        if (req.includes('desafios total')) {
            const N = parseInt(req.match(/\d+/)[0]);
            const [total] = await connection.query(
                "SELECT COUNT(*) AS count FROM historico_desafio WHERE id_usuario = ? AND status = 'concluido'", 
                [id_usuario]
            );
            if (total[0].count >= N) {
                isMet = true;
            }

        // --- Lógica: Streak (Dias Seguidos) ---
        } else if (req.includes('dias seguidos')) {
            const N = parseInt(req.match(/\d+/)[0]);
            
            // Busca os N dias distintos mais recentes de conclusão
            const [recentDays] = await connection.query(`
                SELECT DISTINCT data_execucao
                FROM historico_desafio
                WHERE id_usuario = ? AND status = 'concluido'
                ORDER BY data_execucao DESC
                LIMIT ?
            `, [id_usuario, N]);

            // Só verifica se o número de dias for pelo menos N
            if (recentDays.length >= N) {
                let isConsecutive = true;
                for (let i = 0; i < N - 1; i++) {
                    const currentDay = parseDate(recentDays[i].data_execucao);
                    const previousDay = parseDate(recentDays[i + 1].data_execucao);
                    
                    // Diferença em milissegundos
                    const diffTime = currentDay.getTime() - previousDay.getTime();
                    // Checa se a diferença é exatamente 1 dia (86400000 ms)
                    if (diffTime !== (24 * 60 * 60 * 1000)) {
                         isConsecutive = false;
                         break;
                    }
                }
                if (isConsecutive) {
                    isMet = true;
                }
            }
            
        // --- Lógica: Acumular XP ---
        } else if (req.includes('Acumular') && req.includes('XP')) {
            const N = parseInt(req.match(/\d+/)[0]);
            if (xp_total >= N) {
                isMet = true;
            }

        // --- Lógica: Desafios por Tipo ---
        } else if (req.includes('desafios tipo')) {
            const parts = req.split(' ');
            const N = parseInt(parts[1]);
            const type = parts[parts.length - 1]; // Ex: LEITURA
            
            const [typeCount] = await connection.query(`
                SELECT COUNT(hd.id_historico) AS count
                FROM historico_desafio hd
                JOIN desafios d ON hd.id_desafio = d.id_desafio
                WHERE hd.id_usuario = ? AND hd.status = 'concluido' AND d.tipo_desafio = ?
            `, [id_usuario, type]);

            if (typeCount[0].count >= N) {
                isMet = true;
            }
        }
        
        // --- CONCESSÃO: Insere a conquista se o requisito foi atendido ---
        if (isMet) {
            try {
                // Insere na tabela 'usuario_conquista'.
                await connection.query(
                    "INSERT INTO usuario_conquista (id_usuario, id_conquista) VALUES (?, ?)",
                    [id_usuario, conquest.id_conquista]
                );
                novasConquistas.push(conquest.nome_conquista);
            } catch (e) {
                // ER_DUP_ENTRY (código 1062 no MySQL) significa que o usuário já tinha a conquista.
                if (e.code !== 'ER_DUP_ENTRY') {
                    throw e; 
                }
            }
        }
    }

    return novasConquistas; // Retorna a lista de conquistas recém-adquiridas
};