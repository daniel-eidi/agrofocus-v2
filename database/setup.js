#!/usr/bin/env node
/**
 * AgroFocus - Script de setup do banco de dados
 * 
 * Uso:
 *   node database/setup.js        # Criar schema
 *   node database/setup.js --seed # Criar schema + dados iniciais
 */

const fs = require('fs');
const path = require('path');
const { pool, testConnection } = require('../backend/src/config/database');

const SCHEMA_FILE = path.join(__dirname, 'schema-completo.sql');
const SEED_FILE = path.join(__dirname, 'seed.sql');

async function runSqlFile(filePath) {
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Dividir em statements (ignorando comentários e blocos vazios)
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📄 Executando ${statements.length} statements de ${path.basename(filePath)}...`);
    
    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        try {
            await pool.query(stmt);
            process.stdout.write(`✅`);
        } catch (err) {
            process.stdout.write(`❌`);
            // Ignorar erros de "já existe"
            if (!err.message.includes('already exists') && 
                !err.message.includes('duplicate') &&
                !err.message.includes('existe')) {
                console.error(`\n⚠️  Erro no statement ${i + 1}:`, err.message.substring(0, 100));
            }
        }
        
        if ((i + 1) % 10 === 0) {
            process.stdout.write(` ${i + 1}/${statements.length}\n`);
        }
    }
    console.log('\n');
}

async function setup() {
    console.log('🌾 AgroFocus - Setup do Banco de Dados\n');
    
    // Testar conexão
    console.log('🔌 Testando conexão...');
    const connected = await testConnection();
    
    if (!connected) {
        console.error('❌ Não foi possível conectar ao banco de dados');
        console.log('\nVerifique se:');
        console.log('  1. PostgreSQL está rodando');
        console.log('  2. DATABASE_URL está configurado corretamente');
        console.log('  3. O banco "agrofocus" existe');
        process.exit(1);
    }
    
    // Criar schema
    console.log('\n📦 Criando schema...');
    await runSqlFile(SCHEMA_FILE);
    
    // Verificar se deve popular com dados
    const shouldSeed = process.argv.includes('--seed') || process.argv.includes('-s');
    
    if (shouldSeed) {
        console.log('🌱 Inserindo dados iniciais...');
        await runSqlFile(SEED_FILE);
    }
    
    console.log('✅ Setup concluído!');
    
    if (!shouldSeed) {
        console.log('\n💡 Para inserir dados de exemplo, execute:');
        console.log('   node database/setup.js --seed');
    }
    
    await pool.end();
}

setup().catch(err => {
    console.error('❌ Erro durante setup:', err);
    process.exit(1);
});
