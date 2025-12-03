const pool = require("../config/db"); 

// LISTAR CATÁLOGO DE DESAFIOS (Templates prontos)
exports.listarCatalogoDesafios = async (req, res) => {
    try {
        // Busca todos os modelos de desafio para o usuário escolher
        const [rows] = await pool.query(
            "SELECT id_catalogo_desafio, nome_modelo, tipo_desafio, xp_base, descricao_modelo FROM catalogo_desafios ORDER BY tipo_desafio"
        );
        return res.json(rows);
    } catch (error) {
        console.error("Erro listarCatalogoDesafios:", error);
        return res.status(500).json({ message: "Erro ao listar modelos de desafio." });
    }
};

// BUSCAR OPÇÕES DE PERSONALIZAÇÃO (Regras de ajuste)
exports.buscarOpcoesPersonalizacao = async (req, res) => {
    const { tipo } = req.params; // Ex: 'LEITURA', 'EXERCICIO'

    try {
        // Busca os campos de personalização definidos no catálogo_opcoes para o TIPO específico
        const [rows] = await pool.query(
            "SELECT nome_campo, tipo_entrada, valores_permitidos FROM catalogo_opcoes WHERE tipo_desafio_fk = ?",
            [tipo]
        );
        
        // O frontend usa esses dados para montar o formulário de ajuste (ex: campo 'number' para duração)
        return res.json(rows);
    } catch (error) {
        console.error("Erro buscarOpcoesPersonalizacao:", error);
        return res.status(500).json({ message: "Erro ao buscar opções de personalização." });
    }
};


// CRIAR DESAFIO INSTANCIADO (Copia o template e salva a personalização do usuário)
// Rota: POST /api/desafios
exports.criarDesafioInstanciado = async (req, res) => {
    const id_usuario = req.userId; // ID do usuário logado
    
    const { 
        id_objetivo,            
        id_catalogo_desafio,    
        frequencia,             
        personalizacao          // Objeto JSON do frontend (Ex: {duracao_minutos: 45, tipo_livro: 'Ficção'})
    } = req.body; 

    if (!id_objetivo || !id_catalogo_desafio || !frequencia || !personalizacao) {
        return res.status(400).json({ message: "Dados essenciais do desafio estão faltando." });
    }

    try {
        // A. Verifica se o objetivo pertence ao usuário (Segurança)
        const [obj] = await pool.query(
            "SELECT id_objetivo FROM objetivos WHERE id_objetivo = ? AND id_usuario = ?", 
            [id_objetivo, id_usuario]
        );
        if (obj.length === 0) {
             return res.status(404).json({ message: "Objetivo não encontrado ou não pertence ao usuário." });
        }
        
        // B. Busca dados do template no catálogo para preencher a instância
        const [modelo] = await pool.query(
            "SELECT nome_modelo, tipo_desafio, xp_base FROM catalogo_desafios WHERE id_catalogo_desafio = ?",
            [id_catalogo_desafio]
        );
        if (!modelo.length) {
            return res.status(404).json({ message: "Modelo de desafio não encontrado." });
        }
        
        const { nome_modelo, tipo_desafio, xp_base } = modelo[0];

        // C. Insere a instância do desafio na tabela 'desafios'
        const [result] = await pool.query(
            `INSERT INTO desafios 
                (id_objetivo, nome_desafio, tipo_desafio, xp_recompensa, frequencia, config_json) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                id_objetivo, 
                nome_modelo, 
                tipo_desafio, 
                xp_base, 
                frequencia, 
                JSON.stringify(personalizacao) // Salva a personalização como string JSON
            ]
        );

        return res.status(201).json({ 
            message: "Desafio personalizado criado com sucesso.", 
            id_desafio: result.insertId 
        });

    } catch (error) {
        console.error("Erro criarDesafioInstanciado:", error);
        return res.status(500).json({ message: "Erro ao criar desafio instanciado.", error });
    }
};

//  LISTAR DESAFIOS DO USUÁRIO (Instâncias Ativas)
// Rota: GET /api/desafios
exports.listarDesafiosDoUsuario = async (req, res) => {
    const id_usuario = req.userId;
    
    try {
        // Lista desafios ativos do usuário, juntando com o nome do objetivo
        const [rows] = await pool.query(
            `SELECT 
                d.id_desafio, d.nome_desafio, d.tipo_desafio, d.frequencia, d.xp_recompensa, d.config_json, 
                o.nome_objetivo, o.id_objetivo
             FROM desafios d
             JOIN objetivos o ON d.id_objetivo = o.id_objetivo
             WHERE o.id_usuario = ? AND o.status = 'ativo'
             ORDER BY d.id_desafio DESC`,
            [id_usuario]
        );
        
        // Parseia o campo JSON antes de enviar ao frontend
        const desafios = rows.map(row => ({
            ...row,
            config_json: JSON.parse(row.config_json)
        }));

        return res.json(desafios);

    } catch (error) {
        console.error("Erro listarDesafiosDoUsuario:", error);
        return res.status(500).json({ message: "Erro ao listar desafios." });
    }
};

// 5. ATUALIZAR DESAFIO (Atualiza frequência ou personalização)
// Rota: PUT /api/desafios/:id
exports.atualizarDesafio = async (req, res) => {
    const id_usuario = req.userId;
    const { id } = req.params;
    const { frequencia, xp_recompensa, personalizacao } = req.body;
    
    const fields = [];
    const params = [];
    
    if (frequencia !== undefined) { fields.push("frequencia = ?"); params.push(frequencia); }
    if (xp_recompensa !== undefined) { fields.push("xp_recompensa = ?"); params.push(xp_recompensa); }
    if (personalizacao !== undefined) { fields.push("config_json = ?"); params.push(JSON.stringify(personalizacao)); }

    if (fields.length === 0) {
        return res.status(400).json({ message: "Nenhum campo para atualizar." });
    }

    params.push(id, id_usuario);

    try {
        // Atualiza somente se o desafio pertencer ao objetivo do usuário logado (Segurança)
        const sql = `
            UPDATE desafios d
            JOIN objetivos o ON d.id_objetivo = o.id_objetivo
            SET ${fields.join(", ")} 
            WHERE d.id_desafio = ? AND o.id_usuario = ?
        `;
        const [result] = await pool.query(sql, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Desafio não encontrado ou não pertence ao usuário." });
        }

        return res.json({ message: "Desafio atualizado com sucesso." });
    } catch (error) {
        console.error("Erro atualizarDesafio:", error);
        return res.status(500).json({ message: "Erro ao atualizar desafio." });
    }
};

// 6. DELETAR DESAFIO
// Rota: DELETE /api/desafios/:id
exports.deletarDesafio = async (req, res) => {
    const id_usuario = req.userId;
    const { id } = req.params;

    try {
        // Deleta somente se o desafio pertencer ao objetivo do usuário logado (Segurança)
        const [result] = await pool.query(`
            DELETE d FROM desafios d
            JOIN objetivos o ON d.id_objetivo = o.id_objetivo
            WHERE d.id_desafio = ? AND o.id_usuario = ?
        `, [id, id_usuario]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Desafio não encontrado ou não pertence ao usuário." });
        }

        return res.json({ message: "Desafio deletado com sucesso." });
    } catch (error) {
        console.error("Erro deletarDesafio:", error);
        return res.status(500).json({ message: "Erro ao deletar desafio." });
    }
};