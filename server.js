// =================================================================
//                 ARQUIVO COMPLETO: server.js// =================================================================

//
 //1. Importações Essenciais
// ==========================
const express = require('express');
const sql = require('mssql'); // Biblioteca para conectar ao SQL Server
const cors = require('cors');     // Para permitir que o app se conecte ao servidor

const app = express();

// 2. Middlewares (Tradutores)
// =================================
app.use(cors());          // Habilita o CORS para todas as rotas
app.use(express.json());  // Habilita o "tradutor" de JSON para o req.body

// 3. Configuração do Banco de Dados
// ===================================
// Este bloco lê as credenciais secretas que o Railway fornece.
// Quando você roda localmente, ele pode dar erro se você não criar um arquivo .env,
// mas não se preocupe, o importante é que vai funcionar na nuvem.
const dbConfig = {
    user: process.env.MYSQLUSER || 'sa', // Usa a variável do Railway ou 'sa' como padrão
    password: process.env.MYSQLPASSWORD || 'SUA_SENHA_LOCAL', // Coloque sua senha real do SQL Server local aqui
    server: process.env.MYSQLHOST || 'localhost',
    database: process.env.MYSQLDATABASE || 'PimDatabase',
    port: parseInt(process.env.MYSQLPORT || '1433', 10),
    options: {
        trustServerCertificate: true // Importante para conexão local e na nuvem
    }
};

// =================================================================
//
// 4. ROTAS DA API (O Coração da Aplicação)
// =================================================================

// 4.1 Rota para CRIAR um novo chamado
// ------------------------------------
app.post('/chamados', async (req, res) => {
    const { question, category, userEmail } = req.body;

    if (!question ||!category || !userEmail) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    try {
        let pool = await sql.connect(dbConfig);

        // Lógica para gerar o próximo ID        const maxIdResult = await pool.request().query('SELECT MAX(id) as maxId FROM chamados');
        let nextId = 1;
        if (maxIdResult.recordset.length > 0 && maxIdResult.recordset[0].maxId) {
            nextId = maxIdResult.recordset[0].maxId + 1;
        }

        // Lógica para buscar a resposta simulada
        const simulatedResult = await pool.request()
            .input('categoryParam', sql.VarChar, category)
            .query('SELECT answer FROM simulated_answers WHERE category = @categoryParam');
        
        let aiAnswer = "Sua dúvida foi registrada. Nossa IA está analisando e responderá em breve.";
        if (simulatedResult.recordset.length > 0) {
            aiAnswer = simulatedResult.recordset[0].answer;
        }

        // Lógica para inserir o novo chamado
        await pool.request()
            .input('idParam', sql.Int, nextId)
            .input('questionParam', sql.Text, question)
            .input('answerParam', sql.Text, aiAnswer)
            .input('categoryParamInsert', sql.VarChar, category)
            .input('userEmailParam', sql.VarChar, userEmail)
            .input('createdAtParam', sql.DateTime, new Date()) // Gera a data atual
            .query('INSERT INTO chamados (id, question, answer, category, user_email, created_at) VALUES (@idParam, @questionParam, @answerParam, @categoryParamInsert, @userEmailParam, @createdAtParam)');

        res.status(201).json({ message: 'Chamado criado com sucesso!', id: nextId });

    } catch (error) {
        console.error('Erro ao criar chamado:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });    }
});


// 4.2 Rota para BUSCAR os chamados de um usuário
// ------------------------------------------------
app.get('/chamados', async (req, res) => {
    const { userEmail } = req.query;

    if (!userEmail) {        return res.status(400).json({ error: 'O e-mail do usuário é obrigatório.' });
    }

    try {
        let pool = await sql.connect(dbConfig);
        
        const result = await pool.request()
            .input('userEmailParam', sql.VarChar, userEmail)
            .query('SELECT * FROM chamados WHERE user_email = @userEmailParam ORDER BY created_at DESC');

        res.status(200).json(result.recordset);
        
    } catch (error) {
        console.error('Erro ao buscar chamados:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

// =================================================================
// 5. Iniciar o Servidor
// =================================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});