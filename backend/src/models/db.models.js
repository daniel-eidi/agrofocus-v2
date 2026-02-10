/**
 * AgroFocus - Database Models
 * Acesso ao banco PostgreSQL
 */

const { query, transaction } = require('../config/database');

// ============================================
// USUÁRIOS
// ============================================
const UsuarioModel = {
    async findAll() {
        const result = await query('SELECT id, email, nome, telefone, perfil, ativo, avatar_url, ultimo_acesso, created_at FROM usuarios');
        return result.rows;
    },

    async findById(id) {
        const result = await query(
            'SELECT id, email, nome, telefone, perfil, ativo, avatar_url, ultimo_acesso, created_at FROM usuarios WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    },

    async findByEmail(email) {
        const result = await query(
            'SELECT * FROM usuarios WHERE email = $1 AND ativo = true',
            [email]
        );
        return result.rows[0] || null;
    },

    async create({ email, senha_hash, nome, telefone, perfil = 'operador' }) {
        const result = await query(
            `INSERT INTO usuarios (email, senha_hash, nome, telefone, perfil) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id, email, nome, telefone, perfil, ativo, created_at`,
            [email, senha_hash, nome, telefone, perfil]
        );
        return result.rows[0];
    },

    async update(id, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) {
                fields.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }

        if (fields.length === 0) return null;

        values.push(id);
        const result = await query(
            `UPDATE usuarios SET ${fields.join(', ')} WHERE id = $${paramCount} 
             RETURNING id, email, nome, telefone, perfil, ativo, avatar_url, ultimo_acesso`,
            values
        );
        return result.rows[0] || null;
    },

    async updateUltimoAcesso(id) {
        await query('UPDATE usuarios SET ultimo_acesso = CURRENT_TIMESTAMP WHERE id = $1', [id]);
    }
};

// ============================================
// FAZENDAS
// ============================================
const FazendaModel = {
    async findAll() {
        const result = await query('SELECT * FROM v_fazendas_resumo ORDER BY nome');
        return result.rows;
    },

    async findById(id) {
        const result = await query('SELECT * FROM v_fazendas_resumo WHERE id = $1', [id]);
        return result.rows[0] || null;
    },

    async findByProprietario(proprietarioId) {
        const result = await query(
            `SELECT f.*, u.nome as proprietario_nome,
                    COUNT(t.id) as total_talhoes,
                    COALESCE(SUM(t.area_hectares), 0) as area_talhoes
             FROM fazendas f
             LEFT JOIN usuarios u ON f.proprietario_id = u.id
             LEFT JOIN talhoes t ON t.fazenda_id = f.id
             WHERE f.proprietario_id = $1
             GROUP BY f.id, u.nome
             ORDER BY f.nome`,
            [proprietarioId]
        );
        return result.rows;
    },

    async findByUsuario(usuarioId) {
        // Fazendas onde é dono + fazendas compartilhadas
        const result = await query(
            `SELECT f.*, u.nome as proprietario_nome,
                    CASE WHEN f.proprietario_id = $1 THEN 'dono' ELSE pf.permissao END as minha_permissao,
                    CASE WHEN f.proprietario_id = $1 THEN false ELSE true END as compartilhada,
                    COUNT(t.id) as total_talhoes,
                    COALESCE(SUM(t.area_hectares), 0) as area_talhoes
             FROM fazendas f
             LEFT JOIN usuarios u ON f.proprietario_id = u.id
             LEFT JOIN talhoes t ON t.fazenda_id = f.id
             LEFT JOIN permissoes_fazendas pf ON pf.fazenda_id = f.id AND pf.usuario_id = $1
             WHERE f.proprietario_id = $1 OR pf.usuario_id = $1
             GROUP BY f.id, u.nome, pf.permissao
             ORDER BY f.nome`,
            [usuarioId]
        );
        return result.rows;
    },

    async create({ nome, municipio, estado, area_total, car, proprietario_id, geometria }) {
        let sql, params;
        
        if (geometria) {
            sql = `INSERT INTO fazendas (nome, municipio, estado, area_total, car, proprietario_id, geometria, centroide) 
                   VALUES ($1, $2, $3, $4, $5, $6, ST_GeomFromGeoJSON($7), ST_Centroid(ST_GeomFromGeoJSON($7)))
                   RETURNING *`;
            params = [nome, municipio, estado, area_total, car, proprietario_id, JSON.stringify(geometria)];
        } else {
            sql = `INSERT INTO fazendas (nome, municipio, estado, area_total, car, proprietario_id) 
                   VALUES ($1, $2, $3, $4, $5, $6) 
                   RETURNING *`;
            params = [nome, municipio, estado, area_total, car, proprietario_id];
        }
        
        const result = await query(sql, params);
        return result.rows[0];
    },

    async update(id, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined && key !== 'geometria') {
                fields.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }

        if (updates.geometria) {
            fields.push(`geometria = ST_GeomFromGeoJSON($${paramCount})`);
            fields.push(`centroide = ST_Centroid(ST_GeomFromGeoJSON($${paramCount}))`);
            values.push(JSON.stringify(updates.geometria));
            paramCount++;
        }

        if (fields.length === 0) return null;

        values.push(id);
        const result = await query(
            `UPDATE fazendas SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
            values
        );
        return result.rows[0] || null;
    },

    async delete(id) {
        await query('DELETE FROM fazendas WHERE id = $1', [id]);
    }
};

// ============================================
// TALHÕES
// ============================================
const TalhaoModel = {
    async findAll(filters = {}) {
        let sql = 'SELECT * FROM v_talhoes_completos';
        const conditions = [];
        const values = [];

        if (filters.fazenda_id) {
            values.push(filters.fazenda_id);
            conditions.push(`fazenda_id = $${values.length}`);
        }

        if (filters.safra_id) {
            values.push(filters.safra_id);
            conditions.push(`safra_id = $${values.length}`);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY nome';
        
        const result = await query(sql, values);
        return result.rows;
    },

    async findById(id) {
        const result = await query('SELECT * FROM v_talhoes_completos WHERE id = $1', [id]);
        return result.rows[0] || null;
    },

    async findByFazenda(fazendaId) {
        const result = await query(
            `SELECT t.*, f.nome as fazenda_nome, f.municipio, f.estado,
                    s.nome as safra_nome, s.cultura,
                    ST_AsGeoJSON(t.geometria) as geojson,
                    json_build_object(
                        'lat', ST_Y(t.centroide),
                        'lng', ST_X(t.centroide)
                    ) as centroide
             FROM talhoes t
             LEFT JOIN fazendas f ON t.fazenda_id = f.id
             LEFT JOIN safras s ON t.safra_id = s.id
             WHERE t.fazenda_id = $1
             ORDER BY t.nome`,
            [fazendaId]
        );
        return result.rows;
    },

    async create({ nome, area_hectares, tipo_solo, fazenda_id, safra_id, geometria, coordenadas, status = 'ativo' }) {
        let sql, params;
        
        if (geometria) {
            // geometria é um objeto GeoJSON
            const geoJsonStr = JSON.stringify(geometria);
            sql = `INSERT INTO talhoes (nome, area_hectares, tipo_solo, fazenda_id, safra_id, geometria, coordenadas, status, centroide) 
                   VALUES ($1, $2, $3, $4, $5, ST_GeomFromGeoJSON($6), $7, $8, ST_Centroid(ST_GeomFromGeoJSON($6)))
                   RETURNING *, ST_AsGeoJSON(geometria) as geojson`;
            params = [nome, area_hectares, tipo_solo, fazenda_id, safra_id, geoJsonStr, JSON.stringify(coordenadas), status];
        } else {
            sql = `INSERT INTO talhoes (nome, area_hectares, tipo_solo, fazenda_id, safra_id, coordenadas, status) 
                   VALUES ($1, $2, $3, $4, $5, $6, $7)
                   RETURNING *`;
            params = [nome, area_hectares, tipo_solo, fazenda_id, safra_id, JSON.stringify(coordenadas), status];
        }
        
        const result = await query(sql, params);
        return result.rows[0];
    },

    async update(id, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined && key !== 'geometria' && key !== 'coordenadas') {
                fields.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }

        if (updates.coordenadas) {
            fields.push(`coordenadas = $${paramCount}`);
            values.push(JSON.stringify(updates.coordenadas));
            paramCount++;
        }

        if (updates.geometria) {
            fields.push(`geometria = ST_GeomFromGeoJSON($${paramCount})`);
            fields.push(`centroide = ST_Centroid(ST_GeomFromGeoJSON($${paramCount}))`);
            values.push(JSON.stringify(updates.geometria));
            paramCount++;
        }

        if (fields.length === 0) return null;

        values.push(id);
        const result = await query(
            `UPDATE talhoes SET ${fields.join(', ')} WHERE id = $${paramCount} 
             RETURNING *, ST_AsGeoJSON(geometria) as geojson`,
            values
        );
        return result.rows[0] || null;
    },

    async delete(id) {
        await query('DELETE FROM talhoes WHERE id = $1', [id]);
    },

    // Buscar talhões dentro de um raio (em metros)
    async findWithinRadius(lat, lng, radiusMeters) {
        const result = await query(
            `SELECT t.*, f.nome as fazenda_nome,
                    ST_Distance(t.centroide::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as distancia
             FROM talhoes t
             LEFT JOIN fazendas f ON t.fazenda_id = f.id
             WHERE ST_DWithin(t.centroide::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
             ORDER BY distancia`,
            [lng, lat, radiusMeters]
        );
        return result.rows;
    }
};

// ============================================
// SAFRAS
// ============================================
const SafraModel = {
    async findAll(filters = {}) {
        let sql = `SELECT s.*, f.nome as fazenda_nome 
                   FROM safras s 
                   LEFT JOIN fazendas f ON s.fazenda_id = f.id`;
        const conditions = [];
        const values = [];

        if (filters.fazenda_id) {
            values.push(filters.fazenda_id);
            conditions.push(`s.fazenda_id = $${values.length}`);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY s.ano_inicio DESC';
        
        const result = await query(sql, values);
        return result.rows;
    },

    async findById(id) {
        const result = await query(
            'SELECT s.*, f.nome as fazenda_nome FROM safras s LEFT JOIN fazendas f ON s.fazenda_id = f.id WHERE s.id = $1',
            [id]
        );
        return result.rows[0] || null;
    },

    async create({ nome, cultura, ano_inicio, ano_fim, status, fazenda_id, data_inicio, data_fim }) {
        const result = await query(
            `INSERT INTO safras (nome, cultura, ano_inicio, ano_fim, status, fazenda_id, data_inicio, data_fim) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [nome, cultura, ano_inicio, ano_fim, status, fazenda_id, data_inicio, data_fim]
        );
        return result.rows[0];
    },

    async update(id, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) {
                fields.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }

        if (fields.length === 0) return null;

        values.push(id);
        const result = await query(
            `UPDATE safras SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
            values
        );
        return result.rows[0] || null;
    },

    async delete(id) {
        await query('DELETE FROM safras WHERE id = $1', [id]);
    }
};

// ============================================
// OCORRÊNCIAS
// ============================================
const OcorrenciaModel = {
    async findAll(filters = {}) {
        let sql = 'SELECT * FROM v_ocorrencias_completas';
        const conditions = [];
        const values = [];

        if (filters.talhao_id) {
            values.push(filters.talhao_id);
            conditions.push(`talhao_id = $${values.length}`);
        }

        if (filters.fazenda_id) {
            values.push(filters.fazenda_id);
            conditions.push(`fazenda_id = $${values.length}`);
        }

        if (filters.status) {
            values.push(filters.status);
            conditions.push(`status = $${values.length}`);
        }

        if (filters.categoria) {
            values.push(filters.categoria);
            conditions.push(`categoria = $${values.length}`);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY data_ocorrencia DESC';
        
        const result = await query(sql, values);
        return result.rows;
    },

    async findById(id) {
        const result = await query('SELECT * FROM v_ocorrencias_completas WHERE id = $1', [id]);
        return result.rows[0] || null;
    },

    async create(data) {
        const {
            tipo, categoria, titulo, descricao, severidade, status = 'aberta',
            talhao_id, fazenda_id, talhao_nome, fazenda_nome,
            operador_id, operador_nome, latitude, longitude,
            area_afetada, metodo_analise = 'manual', ia_analise, ia_confianca,
            foto_url_1, foto_url_2, foto_url_3
        } = data;

        const result = await query(
            `INSERT INTO ocorrencias (
                tipo, categoria, titulo, descricao, severidade, status,
                talhao_id, fazenda_id, talhao_nome, fazenda_nome,
                operador_id, operador_nome, latitude, longitude, localizacao,
                area_afetada, metodo_analise, ia_analise, ia_confianca,
                foto_url_1, foto_url_2, foto_url_3
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 
                      ST_SetSRID(ST_MakePoint($14, $13), 4326), $15, $16, $17, $18, $19, $20, $21)
             RETURNING *`,
            [tipo, categoria, titulo, descricao, severidade, status,
             talhao_id, fazenda_id, talhao_nome, fazenda_nome,
             operador_id, operador_nome, latitude, longitude,
             area_afetada, metodo_analise, ia_analise, ia_confianca,
             foto_url_1, foto_url_2, foto_url_3]
        );
        return result.rows[0];
    },

    async update(id, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) {
                fields.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }

        if (fields.length === 0) return null;

        values.push(id);
        const result = await query(
            `UPDATE ocorrencias SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
            values
        );
        return result.rows[0] || null;
    },

    async delete(id) {
        await query('DELETE FROM ocorrencias WHERE id = $1', [id]);
    },

    async countByStatus(fazendaId) {
        const result = await query(
            'SELECT status, COUNT(*) as total FROM ocorrencias WHERE fazenda_id = $1 GROUP BY status',
            [fazendaId]
        );
        return result.rows;
    }
};

// ============================================
// INSPEÇÕES
// ============================================
const InspecaoModel = {
    async findAll(filters = {}) {
        let sql = `SELECT i.*, t.nome as talhao_nome_real, f.nome as fazenda_nome_real 
                   FROM inspecoes i
                   LEFT JOIN talhoes t ON i.talhao_id = t.id
                   LEFT JOIN fazendas f ON i.fazenda_id = f.id`;
        const conditions = [];
        const values = [];

        if (filters.status) {
            values.push(filters.status);
            conditions.push(`i.status = $${values.length}`);
        }

        if (filters.talhao_id) {
            values.push(filters.talhao_id);
            conditions.push(`i.talhao_id = $${values.length}`);
        }

        if (filters.fazenda_id) {
            values.push(filters.fazenda_id);
            conditions.push(`i.fazenda_id = $${values.length}`);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY i.data_criacao DESC';
        
        const result = await query(sql, values);
        return result.rows;
    },

    async findById(id) {
        const result = await query(
            `SELECT i.*, t.nome as talhao_nome_real, f.nome as fazenda_nome_real 
             FROM inspecoes i
             LEFT JOIN talhoes t ON i.talhao_id = t.id
             LEFT JOIN fazendas f ON i.fazenda_id = f.id
             WHERE i.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    },

    async findPendentes() {
        const result = await query('SELECT * FROM v_inspecoes_pendentes ORDER BY data_criacao DESC');
        return result.rows;
    },

    async create(data) {
        const {
            fotos, cultura, talhao_id, talhao_nome, fazenda_id, fazenda_nome,
            latitude, longitude, operador_id, operador_nome, observacoes
        } = data;

        const result = await query(
            `INSERT INTO inspecoes (
                fotos, cultura, talhao_id, talhao_nome, fazenda_id, fazenda_nome,
                latitude, longitude, localizacao, operador_id, operador_nome, observacoes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 
                      ST_SetSRID(ST_MakePoint($8, $7), 4326), $9, $10, $11)
             RETURNING *`,
            [fotos, cultura, talhao_id, talhao_nome, fazenda_id, fazenda_nome,
             latitude, longitude, operador_id, operador_nome, observacoes]
        );
        return result.rows[0];
    },

    async analisar(id, analise) {
        const {
            tipo, categoria, severidade, confianca, descricao, recomendacao,
            sintomas, estagio, danos, produtosSugeridos, prazoAcao, observacoesEspecialista
        } = analise;

        const result = await query(
            `UPDATE inspecoes SET 
                status = 'analisada',
                data_analise = CURRENT_TIMESTAMP,
                analise_tipo = $1,
                analise_categoria = $2,
                analise_severidade = $3,
                analise_confianca = $4,
                analise_descricao = $5,
                analise_recomendacao = $6,
                analise_sintomas = $7,
                analise_estagio = $8,
                analise_danos = $9,
                analise_produtos_sugeridos = $10,
                analise_prazo_acao = $11,
                analise_observacoes = $12,
                analista_nome = 'Especialista AgroFocus'
             WHERE id = $13
             RETURNING *`,
            [tipo, categoria, severidade, confianca, descricao, recomendacao,
             sintomas, estagio, danos, produtosSugeridos, prazoAcao, observacoesEspecialista, id]
        );
        return result.rows[0];
    },

    async rejeitar(id, motivo) {
        const result = await query(
            `UPDATE inspecoes SET status = 'rejeitada', motivo_rejeicao = $1 WHERE id = $2 RETURNING *`,
            [motivo, id]
        );
        return result.rows[0];
    },

    async delete(id) {
        await query('DELETE FROM inspecoes WHERE id = $1', [id]);
    }
};

// ============================================
// PERMISSÕES FAZENDAS
// ============================================
const PermissaoModel = {
    async findByFazenda(fazendaId) {
        const result = await query(
            `SELECT pf.*, u.nome as usuario_nome, u.email as usuario_email,
                    c.nome as convidado_por_nome
             FROM permissoes_fazendas pf
             JOIN usuarios u ON pf.usuario_id = u.id
             LEFT JOIN usuarios c ON pf.convidado_por = c.id
             WHERE pf.fazenda_id = $1`,
            [fazendaId]
        );
        return result.rows;
    },

    async findByUsuario(usuarioId) {
        const result = await query(
            'SELECT * FROM permissoes_fazendas WHERE usuario_id = $1',
            [usuarioId]
        );
        return result.rows;
    },

    async getPermissao(usuarioId, fazendaId) {
        // Verificar se é dono
        const fazendaResult = await query(
            'SELECT proprietario_id FROM fazendas WHERE id = $1',
            [fazendaId]
        );
        
        if (fazendaResult.rows[0]?.proprietario_id === parseInt(usuarioId)) {
            return 'dono';
        }

        // Verificar permissão de compartilhamento
        const result = await query(
            'SELECT permissao FROM permissoes_fazendas WHERE fazenda_id = $1 AND usuario_id = $2',
            [fazendaId, usuarioId]
        );
        
        return result.rows[0]?.permissao || null;
    },

    async create({ fazenda_id, usuario_id, permissao, convidado_por }) {
        const result = await query(
            `INSERT INTO permissoes_fazendas (fazenda_id, usuario_id, permissao, convidado_por) 
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (fazenda_id, usuario_id) 
             DO UPDATE SET permissao = $3, updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [fazenda_id, usuario_id, permissao, convidado_por]
        );
        return result.rows[0];
    },

    async update(id, permissao) {
        const result = await query(
            'UPDATE permissoes_fazendas SET permissao = $1 WHERE id = $2 RETURNING *',
            [permissao, id]
        );
        return result.rows[0];
    },

    async delete(fazendaId, usuarioId) {
        await query(
            'DELETE FROM permissoes_fazendas WHERE fazenda_id = $1 AND usuario_id = $2',
            [fazendaId, usuarioId]
        );
    }
};

// ============================================
// OPERADORES
// ============================================
const OperadorModel = {
    async findAll(filters = {}) {
        let sql = 'SELECT * FROM operadores WHERE ativo = true';
        const values = [];

        if (filters.fazenda_id) {
            values.push(filters.fazenda_id);
            sql += ` AND fazenda_id = $${values.length}`;
        }

        sql += ' ORDER BY nome';
        
        const result = await query(sql, values);
        return result.rows;
    },

    async findById(id) {
        const result = await query('SELECT * FROM operadores WHERE id = $1', [id]);
        return result.rows[0] || null;
    },

    async create(data) {
        const { nome, funcao, telefone, email, fazenda_id, usuario_id } = data;
        const result = await query(
            'INSERT INTO operadores (nome, funcao, telefone, email, fazenda_id, usuario_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [nome, funcao, telefone, email, fazenda_id, usuario_id]
        );
        return result.rows[0];
    },

    async update(id, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) {
                fields.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }

        if (fields.length === 0) return null;

        values.push(id);
        const result = await query(
            `UPDATE operadores SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
            values
        );
        return result.rows[0] || null;
    },

    async delete(id) {
        await query('UPDATE operadores SET ativo = false WHERE id = $1', [id]);
    }
};

// ============================================
// EQUIPAMENTOS
// ============================================
const EquipamentoModel = {
    async findAll(filters = {}) {
        let sql = 'SELECT * FROM equipamentos';
        const conditions = [];
        const values = [];

        if (filters.fazenda_id) {
            values.push(filters.fazenda_id);
            conditions.push(`fazenda_id = $${values.length}`);
        }

        if (filters.status) {
            values.push(filters.status);
            conditions.push(`status = $${values.length}`);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY nome';
        
        const result = await query(sql, values);
        return result.rows;
    },

    async findById(id) {
        const result = await query('SELECT * FROM equipamentos WHERE id = $1', [id]);
        return result.rows[0] || null;
    },

    async create(data) {
        const { nome, tipo, marca, modelo, ano, status, fazenda_id, custo_hora } = data;
        const result = await query(
            'INSERT INTO equipamentos (nome, tipo, marca, modelo, ano, status, fazenda_id, custo_hora) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [nome, tipo, marca, modelo, ano, status, fazenda_id, custo_hora]
        );
        return result.rows[0];
    },

    async update(id, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) {
                fields.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }

        if (fields.length === 0) return null;

        values.push(id);
        const result = await query(
            `UPDATE equipamentos SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
            values
        );
        return result.rows[0] || null;
    },

    async delete(id) {
        await query('DELETE FROM equipamentos WHERE id = $1', [id]);
    }
};

// ============================================
// INSUMOS
// ============================================
const InsumoModel = {
    async findAll(filters = {}) {
        let sql = 'SELECT * FROM insumos';
        const values = [];

        if (filters.fazenda_id) {
            values.push(filters.fazenda_id);
            sql += ` WHERE fazenda_id = $${values.length}`;
        }

        sql += ' ORDER BY nome';
        
        const result = await query(sql, values);
        return result.rows;
    },

    async findById(id) {
        const result = await query('SELECT * FROM insumos WHERE id = $1', [id]);
        return result.rows[0] || null;
    }
};

// ============================================
// DESPESAS
// ============================================
const DespesaModel = {
    async findAll(filters = {}) {
        let sql = 'SELECT * FROM despesas';
        const conditions = [];
        const values = [];

        if (filters.fazenda_id) {
            values.push(filters.fazenda_id);
            conditions.push(`fazenda_id = $${values.length}`);
        }

        if (filters.talhao_id) {
            values.push(filters.talhao_id);
            conditions.push(`talhao_id = $${values.length}`);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY data_despesa DESC';
        
        const result = await query(sql, values);
        return result.rows;
    },

    async findById(id) {
        const result = await query('SELECT * FROM despesas WHERE id = $1', [id]);
        return result.rows[0] || null;
    }
};

// ============================================
// ATIVIDADES
// ============================================
const AtividadeModel = {
    async findAll(filters = {}) {
        let sql = `
            SELECT a.*, 
                   t.nome as talhao_nome,
                   a.data_atividade as data
            FROM atividades a
            LEFT JOIN talhoes t ON a.talhao_id = t.id
        `;
        const conditions = [];
        const values = [];

        if (filters.fazenda_id) {
            values.push(filters.fazenda_id);
            conditions.push(`a.fazenda_id = $${values.length}`);
        }

        if (filters.talhao_id) {
            values.push(filters.talhao_id);
            conditions.push(`a.talhao_id = $${values.length}`);
        }

        if (filters.status) {
            values.push(filters.status);
            conditions.push(`a.status = $${values.length}`);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY a.data_atividade DESC';
        
        const result = await query(sql, values);
        return result.rows;
    },

    async findById(id) {
        const result = await query('SELECT * FROM atividades WHERE id = $1', [id]);
        return result.rows[0] || null;
    },

    async create(data) {
        const {
            descricao, tipo, data_atividade, status = 'pendente',
            talhao_id, fazenda_id, operador_id, equipamento_id,
            custo_total, observacoes
        } = data;

        const result = await query(
            `INSERT INTO atividades (
                descricao, tipo, data_atividade, status,
                talhao_id, fazenda_id, operador_id, equipamento_id,
                custo_total, observacoes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [descricao, tipo, data_atividade, status,
             talhao_id, fazenda_id, operador_id, equipamento_id,
             custo_total, observacoes]
        );
        return result.rows[0];
    },

    async update(id, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) {
                fields.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }

        if (fields.length === 0) return null;

        values.push(id);
        const result = await query(
            `UPDATE atividades SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
            values
        );
        return result.rows[0] || null;
    },

    async delete(id) {
        await query('DELETE FROM atividades WHERE id = $1', [id]);
    }
};

module.exports = {
    Usuario: UsuarioModel,
    Fazenda: FazendaModel,
    Talhao: TalhaoModel,
    Safra: SafraModel,
    Ocorrencia: OcorrenciaModel,
    Inspecao: InspecaoModel,
    Permissao: PermissaoModel,
    Operador: OperadorModel,
    Equipamento: EquipamentoModel,
    Insumo: InsumoModel,
    Despesa: DespesaModel,
    Atividade: AtividadeModel
};
