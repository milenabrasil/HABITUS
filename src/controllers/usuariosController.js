const pool = require("../config/db"); // Adapte o caminho
const bcrypt = require('bcryptjs'); // Necessário para alterar a senha
const SALT_ROUNDS = 10; 

// ----------------------------------------------------
// 1. BUSCAR PERFIL DO USUÁRIO LOGADO
// Rota: GET /api/usuarios/perfil
// ----------------------------------------------------
exports.buscarPerfil = async (req, res) => {
    const id_usuario = req.userId; // ID do token

    try {
        const [rows] = await pool.query(
            // Seleciona todos os campos de perfil relevantes, excluindo a senha_hash
            `SELECT 
                id_usuario, nome, email, xp_total, foto_url, 
                data_cadastro, email_verificado 
             FROM usuarios 
             WHERE id_usuario = ?`,
            [id_usuario]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Usuário não encontrado." });
        }

        return res.json(rows[0]);

    } catch (error) {
        console.error("Erro buscarPerfil:", error);
        return res.status(500).json({ message: "Erro ao buscar dados do perfil." });
    }
};

// ----------------------------------------------------
// 2. ATUALIZAR DADOS BÁSICOS DO PERFIL
// Rota: PUT /api/usuarios/perfil
// ----------------------------------------------------
exports.atualizarPerfil = async (req, res) => {
    const id_usuario = req.userId;
    // Permite que o usuário atualize nome e foto_url
    const { nome, foto_url } = req.body; 

    if (!nome) {
        return res.status(400).json({ message: "O nome não pode ser vazio." });
    }

    try {
        await pool.query(
            "UPDATE usuarios SET nome = ?, foto_url = ? WHERE id_usuario = ?",
            [nome, foto_url, id_usuario]
        );

        return res.json({ message: "Perfil atualizado com sucesso." });

    } catch (error) {
        console.error("Erro atualizarPerfil:", error);
        return res.status(500).json({ message: "Erro ao atualizar dados do perfil." });
    }
};

// ----------------------------------------------------
// 3. ALTERAR SENHA (Requer senha antiga)
// Rota: PUT /api/usuarios/senha
// ----------------------------------------------------
exports.alterarSenha = async (req, res) => {
    const id_usuario = req.userId;
    const { senha_antiga, senha_nova } = req.body;

    if (!senha_antiga || !senha_nova) {
        return res.status(400).json({ message: "Senha antiga e nova senha são obrigatórias." });
    }

    try {
        // 1. Busca a senha hash atual
        const [rows] = await pool.query(
            "SELECT senha_hash FROM usuarios WHERE id_usuario = ?",
            [id_usuario]
        );

        const user = rows[0];
        
        // Se o usuário não tem senha (login social), ele não pode usar esta rota
        if (!user || !user.senha_hash) {
            return res.status(403).json({ 
                message: "Você não tem uma senha tradicional configurada. Use o Login Social." 
            });
        }

        // 2. Compara a senha antiga fornecida com o hash no DB
        const senhaValida = await bcrypt.compare(senha_antiga, user.senha_hash);
        
        if (!senhaValida) {
            return res.status(401).json({ message: "Senha antiga incorreta." });
        }

        // 3. Gera o novo hash para a nova senha
        const novoHash = await bcrypt.hash(senha_nova, SALT_ROUNDS);

        // 4. Atualiza a senha no banco de dados
        await pool.query(
            "UPDATE usuarios SET senha_hash = ? WHERE id_usuario = ?",
            [novoHash, id_usuario]
        );

        return res.json({ message: "Senha alterada com sucesso." });

    } catch (error) {
        console.error("Erro alterarSenha:", error);
        return res.status(500).json({ message: "Erro ao alterar a senha." });
    }
};