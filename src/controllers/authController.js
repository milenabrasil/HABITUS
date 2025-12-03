const pool = require("../config/db"); 
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require('google-auth-library');
const googleConfig = require('../config/google');
const client = new OAuth2Client(googleConfig.GOOGLE_CLIENT_ID);

const JWT_EXPIRES_IN = "8h";
const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || "segredo_local";

// Função para gerar o token JWT (usada tanto no login tradicional quanto no social)
const generateToken = (id_usuario) => {
    return jwt.sign({ id_usuario }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

//REGISTER: Cadastro de Novo Usuário (Sign Up)
exports.registerUser = async (req, res) => {
    try {
        const { nome, email, senha } = req.body;
        
        if (!nome || !email || !senha) {
            return res.status(400).json({ message: "Nome, Email e senha são obrigatórios" });
        }

        const [exist] = await pool.query("SELECT id_usuario FROM usuarios WHERE email = ?", [email]);
        if (exist.length) {
            return res.status(409).json({ message: "Email já cadastrado" });
        }

        const salt = await bcrypt.genSalt(SALT_ROUNDS);
        const senha_hash = await bcrypt.hash(senha, salt);

        const [result] = await pool.query(
            "INSERT INTO usuarios (nome, email, senha_hash) VALUES (?,?,?)",
            [nome, email, senha_hash]
        );
        
        // Opcional: Gerar token após o registro para autenticar o usuário imediatamente
        const id_usuario = result.insertId;
        const token = generateToken(id_usuario);

        return res.status(201).json({ 
            message: "Usuário registrado com sucesso", 
            id_usuario: id_usuario,
            token: token
        });
    } catch (error) {
        console.error("Erro registerUser:", error);
        return res.status(500).json({ message: "Erro ao registrar usuário", error });
    }
};

// LOGIN: Login Tradicional (Sign In)
exports.loginUser = async (req, res) => {
    try {
        const { email, senha } = req.body;
        if (!email || !senha) return res.status(400).json({ message: "Email e senha são obrigatórios" });

        const [rows] = await pool.query(
            "SELECT id_usuario, nome, senha_hash, xp_total, foto_url, email_verificado FROM usuarios WHERE email = ?", 
            [email]
        );
        
        const user = rows[0];
        
        // Verifica se o usuário existe E se tem uma senha tradicional (excluindo logins sociais)
        if (!user || !user.senha_hash) {
            return res.status(401).json({ message: "Credenciais inválidas ou use o Login Social" });
        }

        const senhaValida = await bcrypt.compare(senha, user.senha_hash);
        if (!senhaValida) return res.status(401).json({ message: "Credenciais inválidas" });

        const token = generateToken(user.id_usuario);

        return res.json({ 
            message: "Autenticado com sucesso", 
            token, 
            nome: user.nome, 
            id_usuario: user.id_usuario,
            xp_total: user.xp_total,
            foto_url: user.foto_url,
            email_verificado: user.email_verificado
        });
    } catch (error) {
        console.error("Erro loginUser:", error);
        return res.status(500).json({ message: "Erro ao realizar login", error });
    }
};

// LOGIN GOOGLE: Autenticação Social (Sign In)
exports.loginGoogle = async (req, res) => {
    const { id_token } = req.body; // O frontend envia o ID Token do Google

    if (!id_token) {
        return res.status(400).json({ message: "ID Token do Google é obrigatório." });
    }

    let payload;
    try {
        // VERIFICAÇÃO E DECODIFICAÇÃO DO TOKEN
        const ticket = await client.verifyIdToken({
            idToken: id_token,
            audience: googleConfig.GOOGLE_CLIENT_ID,
        });
        payload = ticket.getPayload(); // Dados do usuário fornecidos pelo Google
    } catch (e) {
        console.error("Erro na validação do token do Google:", e);
        return res.status(401).json({ message: "Token do Google inválido ou expirado." });
    }

    const { sub: google_id, email, name, picture: foto_url, email_verified } = payload;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // BUSCAR USUÁRIO EXISTENTE
        const [existingUser] = await connection.query(
            "SELECT id_usuario, nome, xp_total, foto_url FROM usuarios WHERE google_id = ? OR email = ?",
            [google_id, email]
        );

        let id_usuario, nome, xp_total, userFotoUrl;

        if (existingUser.length > 0) {
            // Usuário encontrado (via Google ID ou Email)
            const user = existingUser[0];
            id_usuario = user.id_usuario;
            nome = user.nome;
            xp_total = user.xp_total;
            userFotoUrl = user.foto_url;

            // Se o usuário existia apenas com email, mas agora fez login com Google,
            // vinculamos o google_id e atualizamos nome/foto se estiverem vazios/desatualizados
            await connection.query(
                "UPDATE usuarios SET google_id = ?, nome = IFNULL(nome, ?), foto_url = IFNULL(foto_url, ?) WHERE id_usuario = ?",
                [google_id, name, foto_url, id_usuario]
            );

        } else {
            //NOVO USUÁRIO: CRIAR CONTA
            const [result] = await connection.query(
                `INSERT INTO usuarios (google_id, email, nome, foto_url, email_verificado, xp_total) 
                 VALUES (?, ?, ?, ?, ?, 0)`,
                [google_id, email, name, foto_url, email_verified]
            );
            id_usuario = result.insertId;
            nome = name;
            xp_total = 0;
            userFotoUrl = foto_url;
        }

        // GERAR E RETORNAR O JWT
        const token = generateToken(id_usuario);
        
        await connection.commit();

        return res.json({
            message: "Login com Google realizado com sucesso.",
            token,
            id_usuario,
            nome,
            xp_total,
            foto_url: userFotoUrl,
            email_verificado: email_verified
        });

    } catch (error) {
        await connection.rollback();
        console.error("Erro loginGoogle:", error);
        return res.status(500).json({ message: "Erro ao processar login com Google.", error });
    } finally {
        connection.release();
    }
};