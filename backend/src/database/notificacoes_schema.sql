-- Tabela para armazenar subscriptions de notificações push
-- Execute este SQL no PostgreSQL para criar a estrutura de notificações

CREATE TABLE IF NOT EXISTS notificacoes_subscriptions (
    id SERIAL PRIMARY KEY,
    usuario_id VARCHAR(50) NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh VARCHAR(255) NOT NULL,
    auth VARCHAR(255) NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_acesso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ativo BOOLEAN DEFAULT TRUE
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario_id ON notificacoes_subscriptions(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_ativo ON notificacoes_subscriptions(ativo);

-- Tabela para histórico de notificações enviadas
CREATE TABLE IF NOT EXISTS notificacoes_historico (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    corpo TEXT NOT NULL,
    url VARCHAR(500),
    usuario_ids TEXT, -- JSON array de usuários
    enviados INTEGER DEFAULT 0,
    falhas INTEGER DEFAULT 0,
    dados JSONB, -- dados adicionais
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_historico_data ON notificacoes_historico(criado_em DESC);

-- View para subscriptions ativas por usuário
CREATE OR REPLACE VIEW vw_subscriptions_ativas AS
SELECT 
    usuario_id,
    COUNT(*) as total_dispositivos,
    MAX(ultimo_acesso) as ultimo_acesso
FROM notificacoes_subscriptions
WHERE ativo = TRUE
GROUP BY usuario_id;

-- Comentários
COMMENT ON TABLE notificacoes_subscriptions IS 'Armazena as subscriptions de push notification dos usuários';
COMMENT ON TABLE notificacoes_historico IS 'Histórico de notificações push enviadas';
