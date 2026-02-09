-- AgroFocus - Seed Data
-- Dados iniciais para desenvolvimento e testes

-- ============================================
-- INSERIR USUÁRIOS
-- Senha padrão: admin123 (hash bcrypt)
-- ============================================
INSERT INTO usuarios (email, senha_hash, nome, telefone, perfil, ativo) VALUES
('admin@agrofocus.com', '$2b$10$Mee.5cGtcKmyXZe75/tQd.LRmUXa3d4mjRICssstn4NnL0eIrElcm', 'Administrador', '(16) 99999-0000', 'admin', true),
('gerente@agrofocus.com', '$2b$10$Mee.5cGtcKmyXZe75/tQd.LRmUXa3d4mjRICssstn4NnL0eIrElcm', 'João Gerente', '(16) 99999-1111', 'gerente', true),
('operador@agrofocus.com', '$2b$10$Mee.5cGtcKmyXZe75/tQd.LRmUXa3d4mjRICssstn4NnL0eIrElcm', 'Maria Operadora', '(16) 99999-2222', 'operador', true),
('especialista@agrofocus.com', '$2b$10$Mee.5cGtcKmyXZe75/tQd.LRmUXa3d4mjRICssstn4NnL0eIrElcm', 'Dr. Carlos Silva', '(16) 99999-3333', 'gerente', true)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- INSERIR FAZENDAS
-- ============================================
INSERT INTO fazendas (nome, municipio, estado, area_total, car, proprietario_id, geometria, centroide) VALUES
('Fazenda São João', 'Ribeirão Preto', 'SP', 150.5, 'SP-123456', 1, 
 ST_GeomFromText('POLYGON((-47.15 -21.15, -47.10 -21.15, -47.10 -21.10, -47.15 -21.10, -47.15 -21.15))', 4326),
 ST_GeomFromText('POINT(-47.125 -21.125)', 4326)),
('Fazenda Boa Vista', 'Uberaba', 'MG', 320.0, 'MG-789012', 2,
 ST_GeomFromText('POLYGON((-47.90 -19.72, -47.87 -19.72, -47.87 -19.70, -47.90 -19.70, -47.90 -19.72))', 4326),
 ST_GeomFromText('POINT(-47.885 -19.71)', 4326))
ON CONFLICT DO NOTHING;

-- ============================================
-- INSERIR PERMISSÕES DE FAZENDAS
-- ============================================
INSERT INTO permissoes_fazendas (fazenda_id, usuario_id, permissao, convidado_por) VALUES
(1, 2, 'gerente', 1),
(1, 3, 'operador', 1),
(2, 1, 'visualizador', 2)
ON CONFLICT (fazenda_id, usuario_id) DO NOTHING;

-- ============================================
-- INSERIR SAFRAS
-- ============================================
INSERT INTO safras (nome, cultura, ano_inicio, ano_fim, status, fazenda_id, data_inicio, data_fim) VALUES
('Safra 2024/25', 'Soja', 2024, 2025, 'em_andamento', 1, '2024-09-15', '2025-03-15'),
('Safra 2023/24', 'Milho', 2023, 2024, 'finalizada', 1, '2023-10-01', '2024-02-28'),
('Safra 2024/25', 'Cana-de-açúcar', 2024, 2025, 'em_andamento', 2, '2024-03-01', '2025-03-01')
ON CONFLICT DO NOTHING;

-- ============================================
-- INSERIR TALHÕES (com geometria real)
-- ============================================
INSERT INTO talhoes (nome, area_hectares, tipo_solo, fazenda_id, safra_id, geometria, centroide, coordenadas, status) VALUES
-- Fazenda São João
('Talhão A1', 45.5, 'Latossolo Vermelho', 1, 1,
 ST_GeomFromText('POLYGON((-47.14 -21.14, -47.12 -21.14, -47.12 -21.12, -47.14 -21.12, -47.14 -21.14))', 4326),
 ST_GeomFromText('POINT(-47.13 -21.13)', 4326),
 '{"type":"Polygon","coordinates":[[[-47.14,-21.14],[-47.12,-21.14],[-47.12,-21.12],[-47.14,-21.12],[-47.14,-21.14]]]}'::jsonb,
 'plantado'),

('Talhão A2', 38.0, 'Argissolo', 1, 1,
 ST_GeomFromText('POLYGON((-47.12 -21.14, -47.10 -21.14, -47.10 -21.12, -47.12 -21.12, -47.12 -21.14))', 4326),
 ST_GeomFromText('POINT(-47.11 -21.13)', 4326),
 '{"type":"Polygon","coordinates":[[[-47.12,-21.14],[-47.10,-21.14],[-47.10,-21.12],[-47.12,-21.12],[-47.12,-21.14]]]}'::jsonb,
 'plantado'),

('Talhão A3', 25.5, 'Latossolo Vermelho', 1, 2,
 ST_GeomFromText('POLYGON((-47.14 -21.12, -47.13 -21.12, -47.13 -21.11, -47.14 -21.11, -47.14 -21.12))', 4326),
 ST_GeomFromText('POINT(-47.135 -21.115)', 4326),
 '{"type":"Polygon","coordinates":[[[-47.14,-21.12],[-47.13,-21.12],[-47.13,-21.11],[-47.14,-21.11],[-47.14,-21.12]]]}'::jsonb,
 'colhido'),

-- Fazenda Boa Vista
('Talhão B1', 52.0, 'Latossolo Vermelho-Amarelo', 2, 3,
 ST_GeomFromText('POLYGON((-47.895 -19.715, -47.875 -19.715, -47.875 -19.705, -47.895 -19.705, -47.895 -19.715))', 4326),
 ST_GeomFromText('POINT(-47.885 -19.71)', 4326),
 '{"type":"Polygon","coordinates":[[[-47.895,-19.715],[-47.875,-19.715],[-47.875,-19.705],[-47.895,-19.705],[-47.895,-19.715]]]}'::jsonb,
 'plantado'),

('Talhão B2', 48.5, 'Nitossolo', 2, 3,
 ST_GeomFromText('POLYGON((-47.895 -19.705, -47.875 -19.705, -47.875 -19.695, -47.895 -19.695, -47.895 -19.705))', 4326),
 ST_GeomFromText('POINT(-47.885 -19.70)', 4326),
 '{"type":"Polygon","coordinates":[[[-47.895,-19.705],[-47.875,-19.705],[-47.875,-19.695],[-47.895,-19.695],[-47.895,-19.705]]]}'::jsonb,
 'em_preparo')

ON CONFLICT DO NOTHING;

-- ============================================
-- INSERIR OPERADORES
-- ============================================
INSERT INTO operadores (nome, funcao, telefone, email, ativo, fazenda_id, usuario_id) VALUES
('João Silva', 'Tratorista', '(16) 99999-1111', 'joao@email.com', true, 1, 3),
('Maria Santos', 'Aplicadora', '(16) 99999-2222', 'maria@email.com', true, 1, NULL),
('Pedro Costa', 'Colhedor', '(34) 99999-3333', 'pedro@email.com', true, 2, NULL)
ON CONFLICT DO NOTHING;

-- ============================================
-- INSERIR EQUIPAMENTOS
-- ============================================
INSERT INTO equipamentos (nome, tipo, marca, modelo, ano, status, fazenda_id) VALUES
('Trator John Deere 8R', 'Trator', 'John Deere', '8R 370', 2022, 'disponivel', 1),
('Pulverizador Autopropelido', 'Pulverizador', 'Stara', 'Imperador 3100', 2021, 'em_uso', 1),
('Colheitadeira', 'Colheitadeira', 'Case', 'Axial-Flow 250', 2020, 'disponivel', 2)
ON CONFLICT DO NOTHING;

-- ============================================
-- INSERIR INSUMOS
-- ============================================
INSERT INTO insumos (nome, tipo, quantidade, unidade, preco_medio, estoque_minimo, fazenda_id) VALUES
('Glifosato', 'Herbicida', 500, 'L', 45.50, 100, 1),
('Semente Soja', 'Semente', 80, 'kg', 120.00, 50, 1),
('Fungicida', 'Fungicida', 200, 'L', 85.00, 40, 1),
('Adubo NPK 20-10-10', 'Adubo', 5000, 'kg', 2.50, 1000, 2)
ON CONFLICT DO NOTHING;

-- ============================================
-- INSERIR ATIVIDADES
-- ============================================
INSERT INTO atividades (descricao, data_atividade, tipo, status, talhao_id, talhao_nome, fazenda_id, operador_id, custo_total) VALUES
('Aplicação de Herbicida', '2025-02-08', 'Aplicação', 'concluida', 1, 'Talhão A1', 1, 1, 1250.00),
('Plantio de Soja', '2025-02-10', 'Plantio', 'em_andamento', 2, 'Talhão A2', 1, 2, 3500.00),
('Adubação de Cobertura', '2025-02-05', 'Adubação', 'concluida', 4, 'Talhão B1', 2, 3, 2100.00)
ON CONFLICT DO NOTHING;

-- ============================================
-- INSERIR OCORRÊNCIAS
-- ============================================
INSERT INTO ocorrencias (tipo, categoria, titulo, descricao, data_ocorrencia, severidade, status, talhao_id, talhao_nome, fazenda_id, operador_id, operador_nome, latitude, longitude, localizacao, metodo_analise, ia_analise, ia_confianca) VALUES
('Lagarta', 'praga', 'Infestação leve na área norte', 'Detectado: Lagarta Helicoverpa armigera (91% confiança). Recomendação: Aplicar inseticida específico nas próximas 48h.', 
 '2025-02-05', 'media', 'aberta', 1, 'Talhão A1', 1, 3, 'Maria Operadora', -21.123456, -47.123456,
 ST_GeomFromText('POINT(-47.123456 -21.123456)', 4326), 'ia', 'Lagarta Helicoverpa armigera', 0.91),

('Ferrugem', 'doenca', 'Manchas identificadas no limbo foliar', 'Detectado: Ferrugem Asiática (87% confiança). Recomendação: Monitorar e aplicar fungicida preventivo.',
 '2025-02-07', 'baixa', 'resolvida', 2, 'Talhão A2', 1, 3, 'Maria Operadora', -21.234567, -47.234567,
 ST_GeomFromText('POINT(-47.234567 -21.234567)', 4326), 'ia', 'Ferrugem Asiática', 0.87),

('Deficiência de Nitrogênio', 'nutricional', 'Amarelecimento das folhas mais velhas', 'Planta apresenta sintomas clássicos de deficiência de N. Recomendada aplicação de ureia.',
 '2025-02-08', 'media', 'em_tratamento', 4, 'Talhão B1', 2, 3, 'Maria Operadora', -19.71, -47.885,
 ST_GeomFromText('POINT(-47.885 -19.71)', 4326), 'manual', NULL, NULL)

ON CONFLICT DO NOTHING;

-- ============================================
-- INSERIR DESPESAS
-- ============================================
INSERT INTO despesas (descricao, valor, data_despesa, categoria, talhao_id, talhao_nome, fazenda_id) VALUES
('Compra de combustível', 2500.00, '2025-02-01', 'Combustível', NULL, 'Geral', 1),
('Manutenção trator', 800.00, '2025-02-03', 'Manutenção', 1, 'Talhão A1', 1),
('Compra de sementes', 4800.00, '2025-01-15', 'Insumos', 1, 'Talhão A1', 1),
('Serviço de mão de obra', 1200.00, '2025-02-05', 'Mão de Obra', 2, 'Talhão A2', 1)
ON CONFLICT DO NOTHING;

-- ============================================
-- INSERIR INSPEÇÕES PENDENTES (exemplo)
-- ============================================
INSERT INTO inspecoes (fotos, cultura, talhao_id, talhao_nome, fazenda_id, fazenda_nome, latitude, longitude, localizacao, operador_id, operador_nome, observacoes, status) VALUES
(
 ARRAY['https://example.com/foto1.jpg', 'https://example.com/foto2.jpg'],
 'Soja',
 1,
 'Talhão A1',
 1,
 'Fazenda São João',
 -21.13,
 -47.13,
 ST_GeomFromText('POINT(-47.13 -21.13)', 4326),
 3,
 'Maria Operadora',
 'Manchas suspeitas nas folhas superiores',
 'pendente'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- Atualizar sequências
-- ============================================
SELECT setval('usuarios_id_seq', COALESCE((SELECT MAX(id) FROM usuarios), 1), false);
SELECT setval('fazendas_id_seq', COALESCE((SELECT MAX(id) FROM fazendas), 1), false);
SELECT setval('talhoes_id_seq', COALESCE((SELECT MAX(id) FROM talhoes), 1), false);
SELECT setval('safras_id_seq', COALESCE((SELECT MAX(id) FROM safras), 1), false);
SELECT setval('ocorrencias_id_seq', COALESCE((SELECT MAX(id) FROM ocorrencias), 1), false);
SELECT setval('inspecoes_id_seq', COALESCE((SELECT MAX(id) FROM inspecoes), 1), false);
SELECT setval('atividades_id_seq', COALESCE((SELECT MAX(id) FROM atividades), 1), false);

SELECT 'Seed data inserido com sucesso!' as status;
