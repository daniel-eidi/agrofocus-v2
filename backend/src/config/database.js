/**
 * AgroFocus - Configuração do Banco de Dados PostgreSQL
 */

const { Pool } = require('pg');

// Configuração da conexão
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/agrofocus',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20, // Máximo de conexões no pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Eventos do pool
pool.on('connect', () => {
    console.log('🔌 Nova conexão com PostgreSQL estabelecida');
});

pool.on('error', (err) => {
    console.error('❌ Erro inesperado no pool de conexões:', err);
});

// Helper para queries
const query = async (text, params) => {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('📊 Query executada:', { text: text.substring(0, 50), duration, rows: result.rowCount });
        return result;
    } catch (err) {
        console.error('❌ Erro na query:', err);
        throw err;
    }
};

// Helper para transações
const transaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

// Verificar conexão
const testConnection = async () => {
    try {
        const result = await pool.query('SELECT NOW() as now, version() as version');
        console.log('✅ Conexão PostgreSQL OK');
        console.log('📅 Server time:', result.rows[0].now);
        console.log('🗄️  Version:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
        return true;
    } catch (err) {
        console.error('❌ Falha ao conectar ao PostgreSQL:', err.message);
        return false;
    }
};

module.exports = {
    pool,
    query,
    transaction,
    testConnection
};
