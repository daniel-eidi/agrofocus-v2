-- AgroFocus - Schema Completo PostgreSQL com PostGIS
-- Criado: 2025-02-09

-- Habilitar extensão PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================
-- TABELA: usuarios
-- ============================================
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    telefone VARCHAR(50),
    perfil VARCHAR(50) DEFAULT 'operador' CHECK (perfil IN ('admin', 'gerente', 'operador', 'visualizador')),
    ativo BOOLEAN DEFAULT true,
    avatar_url TEXT,
    ultimo_acesso TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABELA: fazendas
-- ============================================
CREATE TABLE IF NOT EXISTS fazendas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    municipio VARCHAR(255),
    estado VARCHAR(2),
    area_total DECIMAL(10, 2),
    car VARCHAR(50),
    geometria GEOMETRY(Polygon, 4326),
    centroide GEOMETRY(Point, 4326),
    proprietario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABELA: permissoes_fazendas
-- ============================================
CREATE TABLE IF NOT EXISTS permissoes_fazendas (
    id SERIAL PRIMARY KEY,
    fazenda_id INTEGER REFERENCES fazendas(id) ON DELETE CASCADE,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    permissao VARCHAR(50) NOT NULL CHECK (permissao IN ('dono', 'gerente', 'operador', 'visualizador')),
    convidado_por INTEGER REFERENCES usuarios(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(fazenda_id, usuario_id)
);

-- ============================================
-- TABELA: safras
-- ============================================
CREATE TABLE IF NOT EXISTS safras (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cultura VARCHAR(100),
    ano_inicio INTEGER,
    ano_fim INTEGER,
    status VARCHAR(50) DEFAULT 'planejada' CHECK (status IN ('planejada', 'em_andamento', 'finalizada', 'cancelada')),
    fazenda_id INTEGER REFERENCES fazendas(id) ON DELETE CASCADE,
    data_inicio DATE,
    data_fim DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABELA: talhoes
-- ============================================
CREATE TABLE IF NOT EXISTS talhoes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    area_hectares DECIMAL(10, 2),
    tipo_solo VARCHAR(100),
    fazenda_id INTEGER REFERENCES fazendas(id) ON DELETE CASCADE,
    safra_id INTEGER REFERENCES safras(id) ON DELETE SET NULL,
    geometria GEOMETRY(Polygon, 4326),
    centroide GEOMETRY(Point, 4326),
    coordenadas JSON,
    altitude_media DECIMAL(8, 2),
    inclinacao_media DECIMAL(5, 2),
    status VARCHAR(50) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'em_preparo', 'plantado', 'colhido')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABELA: ocorrencias
-- ============================================
CREATE TABLE IF NOT EXISTS ocorrencias (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(100) NOT NULL,
    categoria VARCHAR(50) CHECK (categoria IN ('praga', 'doenca', 'nutricional', 'fisiologico', 'mecanico', 'climatico', 'outro')),
    titulo VARCHAR(255),
    descricao TEXT,
    data_ocorrencia TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    severidade VARCHAR(50) CHECK (severidade IN ('baixa', 'media', 'alta', 'critica')),
    status VARCHAR(50) DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_tratamento', 'resolvida', 'cancelada')),
    talhao_id INTEGER REFERENCES talhoes(id) ON DELETE SET NULL,
    fazenda_id INTEGER REFERENCES fazendas(id) ON DELETE SET NULL,
    talhao_nome VARCHAR(255),
    fazenda_nome VARCHAR(255),
    operador_id INTEGER REFERENCES usuarios(id),
    operador_nome VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    localizacao GEOMETRY(Point, 4326),
    area_afetada DECIMAL(10, 2),
    metodo_analise VARCHAR(50) DEFAULT 'manual' CHECK (metodo_analise IN ('manual', 'ia', 'especialista', 'sensor')),
    ia_analise TEXT,
    ia_confianca DECIMAL(5, 2),
    foto_url_1 TEXT,
    foto_url_2 TEXT,
    foto_url_3 TEXT,
    tratamento_aplicado TEXT,
    data_resolucao TIMESTAMP,
    custo_tratamento DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABELA: inspecoes
-- ============================================
CREATE TABLE IF NOT EXISTS inspecoes (
    id SERIAL PRIMARY KEY,
    fotos TEXT[] NOT NULL,
    cultura VARCHAR(100),
    talhao_id INTEGER REFERENCES talhoes(id) ON DELETE SET NULL,
    talhao_nome VARCHAR(255),
    fazenda_id INTEGER REFERENCES fazendas(id) ON DELETE SET NULL,
    fazenda_nome VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    localizacao GEOMETRY(Point, 4326),
    operador_id INTEGER REFERENCES usuarios(id),
    operador_nome VARCHAR(255),
    observacoes TEXT,
    status VARCHAR(50) DEFAULT 'pendente' CHECK (status IN ('pendente', 'analisada', 'rejeitada', 'cancelada')),
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_analise TIMESTAMP,
    
    -- Campos de análise do especialista
    analise_tipo VARCHAR(100),
    analise_categoria VARCHAR(50),
    analise_severidade VARCHAR(50),
    analise_confianca DECIMAL(5, 2),
    analise_descricao TEXT,
    analise_recomendacao TEXT,
    analise_sintomas TEXT[],
    analise_estagio VARCHAR(100),
    analise_danos TEXT,
    analise_produtos_sugeridos TEXT[],
    analise_prazo_acao VARCHAR(100),
    analise_observacoes TEXT,
    analista_nome VARCHAR(255),
    motivo_rejeicao TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABELA: atividades
-- ============================================
CREATE TABLE IF NOT EXISTS atividades (
    id SERIAL PRIMARY KEY,
    descricao TEXT NOT NULL,
    data_atividade DATE DEFAULT CURRENT_DATE,
    tipo VARCHAR(100),
    status VARCHAR(50) DEFAULT 'planejada' CHECK (status IN ('planejada', 'em_andamento', 'concluida', 'cancelada')),
    talhao_id INTEGER REFERENCES talhoes(id) ON DELETE SET NULL,
    talhao_nome VARCHAR(255),
    fazenda_id INTEGER REFERENCES fazendas(id) ON DELETE SET NULL,
    operador_id INTEGER REFERENCES usuarios(id),
    equipamento_id INTEGER,
    custo_total DECIMAL(10, 2),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABELA: operadores
-- ============================================
CREATE TABLE IF NOT EXISTS operadores (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    funcao VARCHAR(100),
    telefone VARCHAR(50),
    email VARCHAR(255),
    ativo BOOLEAN DEFAULT true,
    fazenda_id INTEGER REFERENCES fazendas(id) ON DELETE SET NULL,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABELA: equipamentos
-- ============================================
CREATE TABLE IF NOT EXISTS equipamentos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(100),
    marca VARCHAR(100),
    modelo VARCHAR(100),
    ano INTEGER,
    status VARCHAR(50) DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'em_uso', 'manutencao', 'inativo')),
    fazenda_id INTEGER REFERENCES fazendas(id) ON DELETE SET NULL,
    custo_hora DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABELA: insumos
-- ============================================
CREATE TABLE IF NOT EXISTS insumos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(100),
    quantidade DECIMAL(10, 2),
    unidade VARCHAR(20),
    preco_medio DECIMAL(10, 2),
    estoque_minimo DECIMAL(10, 2),
    fazenda_id INTEGER REFERENCES fazendas(id) ON DELETE SET NULL,
    fornecedor VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABELA: despesas
-- ============================================
CREATE TABLE IF NOT EXISTS despesas (
    id SERIAL PRIMARY KEY,
    descricao TEXT NOT NULL,
    valor DECIMAL(10, 2) NOT NULL,
    data_despesa DATE DEFAULT CURRENT_DATE,
    categoria VARCHAR(100),
    talhao_id INTEGER REFERENCES talhoes(id) ON DELETE SET NULL,
    talhao_nome VARCHAR(255),
    fazenda_id INTEGER REFERENCES fazendas(id) ON DELETE SET NULL,
    comprovante_url TEXT,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABELA: notificacoes
-- ============================================
CREATE TABLE IF NOT EXISTS notificacoes (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    mensagem TEXT NOT NULL,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    fazenda_id INTEGER REFERENCES fazendas(id) ON DELETE SET NULL,
    talhao_id INTEGER REFERENCES talhoes(id) ON DELETE SET NULL,
    inspecao_id INTEGER REFERENCES inspecoes(id) ON DELETE SET NULL,
    lida BOOLEAN DEFAULT false,
    data_leitura TIMESTAMP,
    dados_adicionais JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- FUNÇÃO: Atualizar updated_at automaticamente
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- TRIGGERS: updated_at para todas as tabelas
-- ============================================
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fazendas_updated_at BEFORE UPDATE ON fazendas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_permissoes_fazendas_updated_at BEFORE UPDATE ON permissoes_fazendas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_safras_updated_at BEFORE UPDATE ON safras
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_talhoes_updated_at BEFORE UPDATE ON talhoes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ocorrencias_updated_at BEFORE UPDATE ON ocorrencias
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inspecoes_updated_at BEFORE UPDATE ON inspecoes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_atividades_updated_at BEFORE UPDATE ON atividades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_operadores_updated_at BEFORE UPDATE ON operadores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipamentos_updated_at BEFORE UPDATE ON equipamentos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_insumos_updated_at BEFORE UPDATE ON insumos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_despesas_updated_at BEFORE UPDATE ON despesas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ÍNDICES para melhor performance
-- ============================================
CREATE INDEX idx_fazendas_proprietario ON fazendas(proprietario_id);
CREATE INDEX idx_fazendas_geometria ON fazendas USING GIST(geometria);
CREATE INDEX idx_talhoes_fazenda ON talhoes(fazenda_id);
CREATE INDEX idx_talhoes_safra ON talhoes(safra_id);
CREATE INDEX idx_talhoes_geometria ON talhoes USING GIST(geometria);
CREATE INDEX idx_permissoes_fazenda_usuario ON permissoes_fazendas(fazenda_id, usuario_id);
CREATE INDEX idx_ocorrencias_talhao ON ocorrencias(talhao_id);
CREATE INDEX idx_ocorrencias_fazenda ON ocorrencias(fazenda_id);
CREATE INDEX idx_ocorrencias_status ON ocorrencias(status);
CREATE INDEX idx_ocorrencias_data ON ocorrencias(data_ocorrencia);
CREATE INDEX idx_inspecoes_status ON inspecoes(status);
CREATE INDEX idx_inspecoes_talhao ON inspecoes(talhao_id);
CREATE INDEX idx_safras_fazenda ON safras(fazenda_id);
CREATE INDEX idx_atividades_talhao ON atividades(talhao_id);
CREATE INDEX idx_notificacoes_usuario ON notificacoes(usuario_id);
CREATE INDEX idx_notificacoes_lida ON notificacoes(lida);

-- ============================================
-- VIEWS úteis
-- ============================================

-- View: fazendas com contagem de talhões
CREATE OR REPLACE VIEW v_fazendas_resumo AS
SELECT 
    f.*,
    u.nome as proprietario_nome,
    COUNT(t.id) as total_talhoes,
    COALESCE(SUM(t.area_hectares), 0) as area_talhoes
FROM fazendas f
LEFT JOIN usuarios u ON f.proprietario_id = u.id
LEFT JOIN talhoes t ON t.fazenda_id = f.id
GROUP BY f.id, u.nome;

-- View: talhões com dados completos
CREATE OR REPLACE VIEW v_talhoes_completos AS
SELECT 
    t.*,
    f.nome as fazenda_nome,
    f.municipio,
    f.estado,
    s.nome as safra_nome,
    s.cultura,
    s.status as safra_status,
    ST_AsGeoJSON(t.geometria) as geojson,
    ST_AsGeoJSON(t.centroide) as centroide_geojson
FROM talhoes t
LEFT JOIN fazendas f ON t.fazenda_id = f.id
LEFT JOIN safras s ON t.safra_id = s.id;

-- View: ocorrências com dados relacionados
CREATE OR REPLACE VIEW v_ocorrencias_completas AS
SELECT 
    o.*,
    t.nome as talhao_nome_original,
    f.nome as fazenda_nome_original,
    u.nome as operador_nome_completo
FROM ocorrencias o
LEFT JOIN talhoes t ON o.talhao_id = t.id
LEFT JOIN fazendas f ON o.fazenda_id = f.id
LEFT JOIN usuarios u ON o.operador_id = u.id;

-- View: inspeções pendentes
CREATE OR REPLACE VIEW v_inspecoes_pendentes AS
SELECT 
    i.*,
    t.nome as talhao_nome_real,
    f.nome as fazenda_nome_real
FROM inspecoes i
LEFT JOIN talhoes t ON i.talhao_id = t.id
LEFT JOIN fazendas f ON i.fazenda_id = f.id
WHERE i.status = 'pendente';

-- ============================================
-- Comentários nas tabelas
-- ============================================
COMMENT ON TABLE usuarios IS 'Usuários do sistema AgroFocus';
COMMENT ON TABLE fazendas IS 'Fazendas cadastradas';
COMMENT ON TABLE talhoes IS 'Talhões agrícolas com geometria geoespacial';
COMMENT ON TABLE safras IS 'Safras agrícolas';
COMMENT ON TABLE ocorrencias IS 'Registro de pragas, doenças e outros problemas';
COMMENT ON TABLE inspecoes IS 'Inspeções para análise por especialista';
COMMENT ON TABLE permissoes_fazendas IS 'Controle de acesso às fazendas';

SELECT 'Schema AgroFocus criado com sucesso!' as status;
