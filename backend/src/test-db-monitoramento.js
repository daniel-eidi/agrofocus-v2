const { query } = require('./config/database');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

(async () => {
    try {
        console.log('--- TESTANDO TALHÕES ---');
        const talhoes = await query(`
            SELECT id, nome, ST_AsText(centroide) as centroide_wkt, 
            json_build_object('lat', ST_Y(centroide), 'lng', ST_X(centroide)) as centroide_json 
            FROM talhoes
        `);
        console.log(JSON.stringify(talhoes.rows, null, 2));

        console.log('--- TESTANDO INSPEÇÕES ---');
        const inspecoes = await query(`
            SELECT id, latitude, longitude FROM inspecoes
        `);
        console.log(JSON.stringify(inspecoes.rows, null, 2));
        
        console.log('--- TESTANDO MAQUINÁRIO ---');
        const equipamentos = await query(`
             SELECT id, nome, tipo, status FROM equipamentos WHERE status = 'em_uso'
        `);
        console.log(JSON.stringify(equipamentos.rows, null, 2));

    } catch (e) {
        console.error(e);
    }
})();
