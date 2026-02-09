-- =============================================
-- AGROFOCUS - SCHEMA COMPLETO DO BANCO DE DADOS
-- PostgreSQL + PostGIS
-- =============================================

-- Habilitar extensão PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. TABELAS DE CADASTRO
-- =============================================

-- Fazendas
CREATE TABLE fazendas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    codigo_car VARCHAR(50),
    endereco TEXT,
    cidade VARCHAR(100),
    estado VARCHAR(2),
    cep VARCHAR(10),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    area_total DECIMAL(15, 4),
    geom GEOMETRY(POLYGON, 4326),
    proprietario_nome VARCHAR(255),
    proprietario_cpf_cnpj VARCHAR(20),
    proprietario_telefone VARCHAR(20),
    proprietario_email VARCHAR(255),
    status VARCHAR(20) DEFAULT 'ativo',
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fazendas_geom ON fazendas USING GIST(geom);
CREATE INDEX idx_fazendas_status ON fazendas(status);

-- Safras
CREATE TABLE safras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    nome VARCHAR(50) NOT NULL,
    ano_inicio INTEGER NOT NULL,
    ano_fim INTEGER NOT NULL,
    data_inicio DATE,
    data_fim DATE,
    status VARCHAR(20) DEFAULT 'planejada',
    cultura_principal VARCHAR(100),
    area_plantada DECIMAL(15, 4),
    produtividade_estimada DECIMAL(10, 2),
    produtividade_realizada DECIMAL(10, 2),
    custo_total DECIMAL(15, 2),
    receita_total DECIMAL(15, 2),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_safras_fazenda ON safras(fazenda_id);
CREATE INDEX idx_safras_status ON safras(status);

-- Talhões
CREATE TABLE talhoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    safra_id UUID REFERENCES safras(id) ON DELETE SET NULL,
    codigo VARCHAR(50) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    cultura VARCHAR(100),
    variedade VARCHAR(100),
    area_hectares DECIMAL(10, 4) NOT NULL,
    geom GEOMETRY(POLYGON, 4326),
    solo_tipo VARCHAR(100),
    solo_ph DECIMAL(4, 2),
    irrigacao BOOLEAN DEFAULT FALSE,
    data_plantio DATE,
    data_colheita_prevista DATE,
    data_colheita_real DATE,
    status VARCHAR(20) DEFAULT 'ativo',
    produtividade_estimada DECIMAL(10, 2),
    produtividade_realizada DECIMAL(10, 2),
    coordenadas_centro_y DECIMAL(10, 8),
    coordenadas_centro_x DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_talhoes_geom ON talhoes USING GIST(geom);
CREATE INDEX idx_talhoes_fazenda ON talhoes(fazenda_id);
CREATE INDEX idx_talhoes_safra ON talhoes(safra_id);

-- Operadores
CREATE TABLE operadores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(14),
    telefone VARCHAR(20),
    email VARCHAR(255),
    funcao VARCHAR(100),
    data_contratacao DATE,
    salario DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'ativo',
    certificacoes TEXT,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_operadores_fazenda ON operadores(fazenda_id);

-- Equipamentos
CREATE TABLE equipamentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(100) NOT NULL,
    marca VARCHAR(100),
    modelo VARCHAR(100),
    ano INTEGER,
    numero_serie VARCHAR(100),
    placa VARCHAR(20),
    horimetro_inicial DECIMAL(10, 2),
    horimetro_atual DECIMAL(10, 2),
    custo_hora DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'disponivel',
    data_aquisicao DATE,
    valor_aquisicao DECIMAL(12, 2),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_equipamentos_fazenda ON equipamentos(fazenda_id);

-- Tipos de Atividades
CREATE TABLE tipos_atividades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    descricao TEXT,
    cor VARCHAR(7) DEFAULT '#3788d8',
    icone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir tipos padrão
INSERT INTO tipos_atividades (nome, categoria, descricao, cor) VALUES
('Plantio', 'operacao', 'Atividade de plantio de sementes', '#28a745'),
('Pulverização', 'operacao', 'Aplicação de defensivos agrícolas', '#dc3545'),
('Adubação', 'operacao', 'Aplicação de fertilizantes', '#ffc107'),
('Colheita', 'operacao', 'Colheita da cultura', '#6f42c1'),
('Irrigação', 'operacao', 'Manejo de irrigação', '#17a2b8'),
('Scouting', 'monitoramento', 'Vistoria de campo', '#fd7e14'),
('Calibragem', 'manutencao', 'Calibragem de equipamentos', '#6c757d'),
('Manutenção', 'manutencao', 'Manutenção preventiva/corretiva', '#343a40');

-- =============================================
-- 2. MONITORAMENTO
-- =============================================

-- Imagens de Satélite (Metadados)
CREATE TABLE imagens_satelite (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    talhao_id UUID NOT NULL REFERENCES talhoes(id) ON DELETE CASCADE,
    safra_id UUID REFERENCES safras(id) ON DELETE SET NULL,
    data_imagem DATE NOT NULL,
    fonte VARCHAR(50) DEFAULT 'sentinel-2',
    cloud_cover DECIMAL(5, 2),
    ndvi_min DECIMAL(5, 4),
    ndvi_max DECIMAL(5, 4),
    ndvi_mean DECIMAL(5, 4),
    ndre_min DECIMAL(5, 4),
    ndre_max DECIMAL(5, 4),
    ndre_mean DECIMAL(5, 4),
    msavi_min DECIMAL(5, 4),
    msavi_max DECIMAL(5, 4),
    msavi_mean DECIMAL(5, 4),
    gee_image_id VARCHAR(255),
    url_thumbnail TEXT,
    url_tile_ndvi TEXT,
    url_tile_ndre TEXT,
    url_tile_msavi TEXT,
    processado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_imagens_talhao ON imagens_satelite(talhao_id);
CREATE INDEX idx_imagens_data ON imagens_satelite(data_imagem);

-- =============================================
-- 3. CONTROLE FINANCEIRO
-- =============================================

-- Categorias de Despesas
CREATE TABLE categorias_despesas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    descricao TEXT,
    cor VARCHAR(7) DEFAULT '#6c757d'
);

INSERT INTO categorias_despesas (nome, tipo, descricao, cor) VALUES
('Sementes', 'insumo', 'Compra de sementes', '#28a745'),
('Fertilizantes', 'insumo', 'Compra de fertilizantes', '#ffc107'),
('Defensivos', 'insumo', 'Compra de defensivos agrícolas', '#dc3545'),
('Combustível', 'operacional', 'Combustível para máquinas', '#fd7e14'),
('Lubrificantes', 'operacional', 'Óleos e lubrificantes', '#6c757d'),
('Peças', 'manutencao', 'Peças de reposição', '#343a40'),
('Mão de Obra', 'operacional', 'Salários e encargos', '#17a2b8'),
('Serviços Terceiros', 'operacional', 'Serviços contratados', '#6f42c1'),
('Energia', 'operacional', 'Energia elétrica', '#20c997'),
('Impostos', 'administrativo', 'Taxas e impostos', '#e83e8c'),
('Outros', 'outros', 'Outras despesas', '#adb5bd');

-- Despesas
CREATE TABLE despesas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    safra_id UUID REFERENCES safras(id) ON DELETE SET NULL,
    talhao_id UUID REFERENCES talhoes(id) ON DELETE SET NULL,
    categoria_id UUID NOT NULL REFERENCES categorias_despesas(id),
    descricao TEXT NOT NULL,
    valor DECIMAL(12, 2) NOT NULL,
    data_despesa DATE NOT NULL,
    fornecedor VARCHAR(255),
    numero_documento VARCHAR(100),
    quantidade DECIMAL(10, 3),
    unidade_medida VARCHAR(20),
    valor_unitario DECIMAL(10, 2),
    forma_pagamento VARCHAR(50),
    parcelas INTEGER DEFAULT 1,
    observacoes TEXT,
    comprovante_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_despesas_fazenda ON despesas(fazenda_id);
CREATE INDEX idx_despesas_safra ON despesas(safra_id);
CREATE INDEX idx_despesas_categoria ON despesas(categoria_id);
CREATE INDEX idx_despesas_data ON despesas(data_despesa);

-- Receitas
CREATE TABLE receitas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    safra_id UUID REFERENCES safras(id) ON DELETE SET NULL,
    talhao_id UUID REFERENCES talhoes(id) ON DELETE SET NULL,
    descricao TEXT NOT NULL,
    valor DECIMAL(12, 2) NOT NULL,
    data_receita DATE NOT NULL,
    comprador VARCHAR(255),
    quantidade_kg DECIMAL(12, 2),
    preco_por_kg DECIMAL(8, 2),
    tipo_cultura VARCHAR(100),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_receitas_fazenda ON receitas(fazenda_id);
CREATE INDEX idx_receitas_safra ON receitas(safra_id);

-- =============================================
-- 4. CONTROLE DE ATIVIDADES
-- =============================================

-- Atividades / Operações
CREATE TABLE atividades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    safra_id UUID REFERENCES safras(id) ON DELETE SET NULL,
    talhao_id UUID REFERENCES talhoes(id) ON DELETE SET NULL,
    tipo_atividade_id UUID REFERENCES tipos_atividades(id),
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    data_inicio TIMESTAMP NOT NULL,
    data_fim TIMESTAMP,
    data_prevista TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pendente',
    prioridade VARCHAR(20) DEFAULT 'media',
    operador_id UUID REFERENCES operadores(id) ON DELETE SET NULL,
    equipamento_id UUID REFERENCES equipamentos(id) ON DELETE SET NULL,
    area_trabalhada DECIMAL(10, 4),
    horas_trabalhadas DECIMAL(6, 2),
    custo_total DECIMAL(12, 2),
    insumos_utilizados JSONB,
    produtividade_apontada DECIMAL(10, 2),
    observacoes TEXT,
    latitude_inicio DECIMAL(10, 8),
    longitude_inicio DECIMAL(11, 8),
    latitude_fim DECIMAL(10, 8),
    longitude_fim DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_atividades_fazenda ON atividades(fazenda_id);
CREATE INDEX idx_atividades_safra ON atividades(safra_id);
CREATE INDEX idx_atividades_talhao ON atividades(talhao_id);
CREATE INDEX idx_atividades_data ON atividades(data_inicio);

-- =============================================
-- 5. INSPEÇÃO DE CAMPO
-- =============================================

-- Ocorrências / Scouting
CREATE TABLE ocorrencias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    safra_id UUID REFERENCES safras(id) ON DELETE SET NULL,
    talhao_id UUID REFERENCES talhoes(id) ON DELETE SET NULL,
    atividade_id UUID REFERENCES atividades(id) ON DELETE SET NULL,
    operador_id UUID REFERENCES operadores(id) ON DELETE SET NULL,
    
    -- Classificação
    categoria VARCHAR(50) NOT NULL,
    tipo VARCHAR(100) NOT NULL,
    severidade VARCHAR(20) DEFAULT 'media',
    
    -- Localização
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    geom GEOMETRY(POINT, 4326),
    
    -- Descrição
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    
    -- Imagens
    foto_url_1 TEXT,
    foto_url_2 TEXT,
    foto_url_3 TEXT,
    
    -- Análise IA
    ia_analise TEXT,
    ia_probabilidade DECIMAL(5, 4),
    ia_recomendacao TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'aberta',
    data_identificacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_resolucao TIMESTAMP,
    tratamento_aplicado TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ocorrencias_fazenda ON ocorrencias(fazenda_id);
CREATE INDEX idx_ocorrencias_talhao ON ocorrencias(talhao_id);
CREATE INDEX idx_ocorrencias_geom ON ocorrencias USING GIST(geom);
CREATE INDEX idx_ocorrencias_categoria ON ocorrencias(categoria);

-- =============================================
-- 6. ESTOQUE
-- =============================================

-- Insumos
CREATE TABLE insumos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    codigo VARCHAR(50),
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    descricao TEXT,
    unidade_medida VARCHAR(20) NOT NULL,
    quantidade_atual DECIMAL(12, 3) DEFAULT 0,
    quantidade_minima DECIMAL(12, 3) DEFAULT 0,
    preco_medio DECIMAL(10, 2),
    fornecedor_padrao VARCHAR(255),
    observacoes TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_insumos_fazenda ON insumos(fazenda_id);
CREATE INDEX idx_insumos_tipo ON insumos(tipo);

-- Movimentações de Estoque
CREATE TABLE movimentacoes_estoque (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    insumo_id UUID NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL,
    quantidade DECIMAL(12, 3) NOT NULL,
    quantidade_anterior DECIMAL(12, 3) NOT NULL,
    quantidade_nova DECIMAL(12, 3) NOT NULL,
    valor_unitario DECIMAL(10, 2),
    valor_total DECIMAL(12, 2),
    data_movimentacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    referencia_id UUID,
    referencia_tipo VARCHAR(50),
    motivo TEXT,
    operador_id UUID REFERENCES operadores(id),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_movimentacoes_insumo ON movimentacoes_estoque(insumo_id);
CREATE INDEX idx_movimentacoes_data ON movimentacoes_estoque(data_movimentacao);

-- =============================================
-- 7. METEOROLOGIA
-- =============================================

-- Dados Meteorológicos Diários
CREATE TABLE dados_meteorologicos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    talhao_id UUID REFERENCES talhoes(id) ON DELETE SET NULL,
    data DATE NOT NULL,
    
    -- Temperaturas
    temp_max DECIMAL(5, 2),
    temp_min DECIMAL(5, 2),
    temp_media DECIMAL(5, 2),
    
    -- Umidade
    umidade_max DECIMAL(5, 2),
    umidade_min DECIMAL(5, 2),
    umidade_media DECIMAL(5, 2),
    
    -- Precipitação
    precipitacao DECIMAL(6, 2),
    
    -- Vento
    vento_velocidade DECIMAL(5, 2),
    vento_direcao INTEGER,
    
    -- Radiação
    radiacao_solar DECIMAL(8, 2),
    
    -- Cálculos
    gdd_dia DECIMAL(6, 2),
    gdd_acumulado DECIMAL(8, 2),
    
    -- Fonte
    fonte VARCHAR(50) DEFAULT 'openweather',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(fazenda_id, talhao_id, data)
);

CREATE INDEX idx_meteo_fazenda ON dados_meteorologicos(fazenda_id);
CREATE INDEX idx_meteo_data ON dados_meteorologicos(data);

-- Previsão do Tempo
CREATE TABLE previsao_tempo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    data_previsao DATE NOT NULL,
    hora_previsao TIMESTAMP,
    temp_max DECIMAL(5, 2),
    temp_min DECIMAL(5, 2),
    umidade DECIMAL(5, 2),
    precipitacao_probabilidade DECIMAL(5, 2),
    precipitacao_volume DECIMAL(6, 2),
    descricao VARCHAR(255),
    icone VARCHAR(50),
    vento_velocidade DECIMAL(5, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_previsao_fazenda ON previsao_tempo(fazenda_id);

-- =============================================
-- 8. PRODUTIVIDADE E DELINEAMENTO
-- =============================================

-- Modelos de ML
CREATE TABLE modelos_ml (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    cultura VARCHAR(100),
    versao VARCHAR(20),
    acuracia DECIMAL(5, 4),
    parametros JSONB,
    arquivo_modelo_url TEXT,
    status VARCHAR(20) DEFAULT 'ativo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Predições de Produtividade
CREATE TABLE predicoes_produtividade (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    modelo_id UUID REFERENCES modelos_ml(id),
    talhao_id UUID NOT NULL REFERENCES talhoes(id) ON DELETE CASCADE,
    safra_id UUID REFERENCES safras(id) ON DELETE SET NULL,
    
    -- Dados de entrada
    ndvi_medio DECIMAL(5, 4),
    ndre_medio DECIMAL(5, 4),
    msavi_medio DECIMAL(5, 4),
    gdd_acumulado DECIMAL(8, 2),
    precipitacao_acumulada DECIMAL(8, 2),
    
    -- Predição
    produtividade_predita DECIMAL(10, 2),
    confianca DECIMAL(5, 4),
    
    -- Comparação
    produtividade_real DECIMAL(10, 2),
    erro_absoluto DECIMAL(10, 2),
    
    data_predicao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Delineamentos (Zonas de Manejo)
CREATE TABLE delineamentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    talhao_id UUID NOT NULL REFERENCES talhoes(id) ON DELETE CASCADE,
    safra_id UUID REFERENCES safras(id) ON DELETE SET NULL,
    nome VARCHAR(255) NOT NULL,
    
    -- Configuração
    metodo VARCHAR(50) NOT NULL,
    num_zonas INTEGER DEFAULT 3,
    indice_base VARCHAR(20) DEFAULT 'ndvi',
    
    -- Geometria
    geom GEOMETRY(MULTIPOLYGON, 4326),
    
    -- Estatísticas
    estatisticas_zonas JSONB,
    
    -- Status
    processado BOOLEAN DEFAULT FALSE,
    url_visualizacao TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_delineamentos_talhao ON delineamentos(talhao_id);
CREATE INDEX idx_delineamentos_geom ON delineamentos USING GIST(geom);

-- =============================================
-- 9. USUÁRIOS E AUTENTICAÇÃO
-- =============================================

CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    avatar_url TEXT,
    perfil VARCHAR(20) DEFAULT 'operador',
    ativo BOOLEAN DEFAULT TRUE,
    ultimo_acesso TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE usuarios_fazendas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    permissao VARCHAR(20) DEFAULT 'leitura',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(usuario_id, fazenda_id)
);

-- =============================================
-- TRIGGERS PARA ATUALIZAR updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_fazendas_updated_at BEFORE UPDATE ON fazendas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_safras_updated_at BEFORE UPDATE ON safras FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_talhoes_updated_at BEFORE UPDATE ON talhoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_operadores_updated_at BEFORE UPDATE ON operadores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_equipamentos_updated_at BEFORE UPDATE ON equipamentos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_despesas_updated_at BEFORE UPDATE ON despesas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_receitas_updated_at BEFORE UPDATE ON receitas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_atividades_updated_at BEFORE UPDATE ON atividades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ocorrencias_updated_at BEFORE UPDATE ON ocorrencias FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_insumos_updated_at BEFORE UPDATE ON insumos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_delineamentos_updated_at BEFORE UPDATE ON delineamentos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
