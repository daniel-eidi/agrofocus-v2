const { query, pool } = require('./src/config/database');
require('dotenv').config({ path: './.env' });

async function fixSequence() {
  try {
    console.log('Fixing sequence for atividades_id_seq...');
    await query("SELECT setval('atividades_id_seq', (SELECT MAX(id) FROM atividades))");
    console.log('Sequence fixed!');
  } catch (err) {
    console.error('Error fixing sequence:', err);
  } finally {
    pool.end();
  }
}

fixSequence();
