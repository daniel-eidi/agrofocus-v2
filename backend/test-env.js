// Script de teste para verificar variáveis de ambiente
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('=== TESTE DE VARIÁVEIS ===');
console.log('GEE_PROJECT_ID:', process.env.GEE_PROJECT_ID);
console.log('GEE_CLIENT_EMAIL:', process.env.GEE_CLIENT_EMAIL);
console.log('GEE_PRIVATE_KEY existe:', !!process.env.GEE_PRIVATE_KEY);
console.log('OPENAI_API_KEY existe:', !!process.env.OPENAI_API_KEY);

// Testar se o serviço detecta corretamente
const geeService = require('./src/services/gee.service.js');
console.log('\nEstado do serviço GEE:');
console.log('modoSimulacao:', geeService.modoSimulacao);
console.log('projectId existe:', !!geeService.projectId);
console.log('privateKey existe:', !!geeService.privateKey);
console.log('clientEmail existe:', !!geeService.clientEmail);