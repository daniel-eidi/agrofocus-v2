// Mock database para deploy rápido
// PostgreSQL será configurado em atualização futura

const testConnection = async () => {
  console.log('🔄 Modo MOCK - PostgreSQL será configurado posteriormente');
  return false; // Retorna false para não bloquear o servidor
};

const query = async () => ({ rows: [] });
const transaction = async (cb) => cb({ query });
const pool = { query, end: async () => {} };

module.exports = { pool, query, transaction, testConnection };
