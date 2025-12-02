// controllers/objetivoController.js
const pool = require("../config/db"); // Adapte o caminho
const { response } = require("express");

// --- FUNÇÕES DE CATÁLOGO (templates) ---

// 1. LISTAR CATÁLOGO (Templates)
exports.listarCatalogo = async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT id_catalogo, nome_modelo, descricao_modelo, tipo_sugerido FROM catalogo_objetivos ORDER BY nome_modelo"
        );
        return res.json(rows);
    } catch (error) {
        console.error("Erro listarCatalogo:", error);
        return res.status(500).json({ message: "Erro ao listar catálogo." });
    }
};

// 2. SELECIONAR DO CATÁLOGO (Cria a instância do usuário a partir do template)
exports.selecionarObjetivoCatalogo = async (req, res) => {
    const id_usuario = req.userId; 
    const { id_catalogo, data_conclusao, descricao_custom } = req.body; 

    try {
        const [catalogRows] = await pool.query(
            "SELECT nome_modelo, descricao_modelo FROM catalogo_objetivos WHERE id_catalogo = ?",
            [id_catalogo]
        );

        if (catalogRows.length === 0) {
            return res.status(404).json({ message: "Modelo de objetivo não encontrado." });
        }
        
        const { nome_modelo, descricao_modelo } = catalogRows[0];

        // Insere os dados do modelo na tabela de objetivos do usuário, permitindo customização
        const [result] = await pool.query(
            `INSERT INTO objetivos 
                (id_usuario, nome_objetivo, descricao, data_conclusao) 
             VALUES (?, ?, ?, ?)`,
            [id_usuario, nome_modelo, descricao_custom || descricao_modelo, data_conclusao || null]
        );

        return res.status(201).json({ 
            message: "Objetivo selecionado e criado com sucesso.", 
            id_objetivo: result.insertId 
        });

    } catch (error) {
        console.error("Erro selecionarObjetivoCatalogo:", error);
        return res.status(500).json({ message: "Erro ao criar objetivo a partir do catálogo.", error });
    }
};


// --- FUNÇÕES DE INSTÂNCIA (CRUD do Usuário) ---

// 3. CRIAR OBJETIVO PERSONALIZADO (Manual)
exports.criarObjetivo = async (req, res) => {
    const id_usuario = req.userId; 
    const { nome_objetivo, descricao, data_conclusao } = req.body;
    
    if (!nome_objetivo) {
        return res.status(400).json({ message: "O nome do objetivo é obrigatório." });
    }

    try {
        const [result] = await pool.query(
            `INSERT INTO objetivos 
                (id_usuario, nome_objetivo, descricao, data_conclusao) 
             VALUES (?, ?, ?, ?)`,
            [id_usuario, nome_objetivo, descricao || null, data_conclusao || null]
        );

        return res.status(201).json({ 
            message: "Objetivo criado com sucesso.", 
            id_objetivo: result.insertId 
        });

    } catch (error) {
        console.error("Erro criarObjetivo:", error);
        return res.status(500).json({ message: "Erro ao criar objetivo.", error });
    }
};

// 4. LISTAR OBJETIVOS DO USUÁRIO
exports.listarObjetivos = async (req, res) => {
    const id_usuario = req.userId;

    try {
        const [rows] = await pool.query(
            `SELECT 
                id_objetivo, nome_objetivo, descricao, data_conclusao, status 
             FROM objetivos 
             WHERE id_usuario = ? 
             ORDER BY status DESC, data_criacao DESC`, 
            [id_usuario]
        );

        return res.json(rows);

    } catch (error) {
        console.error("Erro listarObjetivos:", error);
        return res.status(500).json({ message: "Erro ao listar objetivos." });
    }
};

// 5. ATUALIZAR OBJETIVO
exports.atualizarObjetivo = async (req, res) => {
    const id_usuario = req.userId;
    const { id } = req.params;
    const { nome_objetivo, descricao, data_conclusao, status } = req.body;
    
    const fields = [];
    const params = [];
    
    if (nome_objetivo !== undefined) { fields.push("nome_objetivo = ?"); params.push(nome_objetivo); }
    if (descricao !== undefined) { fields.push("descricao = ?"); params.push(descricao); }
    if (data_conclusao !== undefined) { fields.push("data_conclusao = ?"); params.push(data_conclusao); }
    if (status !== undefined) { fields.push("status = ?"); params.push(status); }

    if (fields.length === 0) {
        return res.status(400).json({ message: "Nenhum campo para atualizar." });
    }

    params.push(id, id_usuario);

    try {
        const sql = `UPDATE objetivos SET ${fields.join(", ")} WHERE id_objetivo = ? AND id_usuario = ?`;
        const [result] = await pool.query(sql, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Objetivo não encontrado ou não pertence ao usuário." });
        }

        return res.json({ message: "Objetivo atualizado com sucesso." });
    } catch (error) {
        console.error("Erro atualizarObjetivo:", error);
        return res.status(500).json({ message: "Erro ao atualizar objetivo." });
    }
};

// 6. DELETAR OBJETIVO
exports.deletarObjetivo = async (req, res) => {
    const id_usuario = req.userId;
    const { id } = req.params;

    try {
        // DELETE CASCADE cuidará dos desafios vinculados
        const [result] = await pool.query("DELETE FROM objetivos WHERE id_objetivo = ? AND id_usuario = ?", [id, id_usuario]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Objetivo não encontrado ou não pertence ao usuário." });
        }

        return res.json({ message: "Objetivo e seus desafios vinculados deletados com sucesso." });
    } catch (error) {
        console.error("Erro deletarObjetivo:", error);
        return res.status(500).json({ message: "Erro ao deletar objetivo." });
    }
};