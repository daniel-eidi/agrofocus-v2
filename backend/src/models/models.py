from sqlalchemy import Column, String, Integer, Float, DateTime, Date, Boolean, Text, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from src.config.database import Base

class Fazenda(Base):
    __tablename__ = "fazendas"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default="uuid_generate_v4()")
    nome = Column(String(255), nullable=False)
    codigo_car = Column(String(50))
    endereco = Column(Text)
    cidade = Column(String(100))
    estado = Column(String(2))
    cep = Column(String(10))
    latitude = Column(Float)
    longitude = Column(Float)
    area_total = Column(Float)
    geom = Column(Geometry('POLYGON', 4326))
    proprietario_nome = Column(String(255))
    proprietario_cpf_cnpj = Column(String(20))
    proprietario_telefone = Column(String(20))
    proprietario_email = Column(String(255))
    status = Column(String(20), default="ativo")
    observacoes = Column(Text)
    created_at = Column(DateTime, default="CURRENT_TIMESTAMP")
    updated_at = Column(DateTime, default="CURRENT_TIMESTAMP")
    
    safras = relationship("Safra", back_populates="fazenda")
    talhoes = relationship("Talhao", back_populates="fazenda")
    operadores = relationship("Operador", back_populates="fazenda")
    equipamentos = relationship("Equipamento", back_populates="fazenda")

class Safra(Base):
    __tablename__ = "safras"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    fazenda_id = Column(UUID(as_uuid=True), ForeignKey("fazendas.id", ondelete="CASCADE"), nullable=False)
    nome = Column(String(50), nullable=False)
    ano_inicio = Column(Integer, nullable=False)
    ano_fim = Column(Integer, nullable=False)
    data_inicio = Column(Date)
    data_fim = Column(Date)
    status = Column(String(20), default="planejada")
    cultura_principal = Column(String(100))
    area_plantada = Column(Float)
    produtividade_estimada = Column(Float)
    produtividade_realizada = Column(Float)
    custo_total = Column(Float)
    receita_total = Column(Float)
    observacoes = Column(Text)
    created_at = Column(DateTime, default="CURRENT_TIMESTAMP")
    updated_at = Column(DateTime, default="CURRENT_TIMESTAMP")
    
    fazenda = relationship("Fazenda", back_populates="safras")
    talhoes = relationship("Talhao", back_populates="safra")

class Talhao(Base):
    __tablename__ = "talhoes"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    fazenda_id = Column(UUID(as_uuid=True), ForeignKey("fazendas.id", ondelete="CASCADE"), nullable=False)
    safra_id = Column(UUID(as_uuid=True), ForeignKey("safras.id", ondelete="SET NULL"))
    codigo = Column(String(50), nullable=False)
    nome = Column(String(255), nullable=False)
    cultura = Column(String(100))
    variedade = Column(String(100))
    area_hectares = Column(Float, nullable=False)
    geom = Column(Geometry('POLYGON', 4326))
    solo_tipo = Column(String(100))
    solo_ph = Column(Float)
    irrigacao = Column(Boolean, default=False)
    data_plantio = Column(Date)
    data_colheita_prevista = Column(Date)
    data_colheita_real = Column(Date)
    status = Column(String(20), default="ativo")
    produtividade_estimada = Column(Float)
    produtividade_realizada = Column(Float)
    coordenadas_centro_y = Column(Float)
    coordenadas_centro_x = Column(Float)
    created_at = Column(DateTime, default="CURRENT_TIMESTAMP")
    updated_at = Column(DateTime, default="CURRENT_TIMESTAMP")
    
    fazenda = relationship("Fazenda", back_populates="talhoes")
    safra = relationship("Safra", back_populates="talhoes")

class Operador(Base):
    __tablename__ = "operadores"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    fazenda_id = Column(UUID(as_uuid=True), ForeignKey("fazendas.id", ondelete="CASCADE"), nullable=False)
    nome = Column(String(255), nullable=False)
    cpf = Column(String(14))
    telefone = Column(String(20))
    email = Column(String(255))
    funcao = Column(String(100))
    data_contratacao = Column(Date)
    salario = Column(Float)
    status = Column(String(20), default="ativo")
    certificacoes = Column(Text)
    observacoes = Column(Text)
    created_at = Column(DateTime, default="CURRENT_TIMESTAMP")
    updated_at = Column(DateTime, default="CURRENT_TIMESTAMP")
    
    fazenda = relationship("Fazenda", back_populates="operadores")

class Equipamento(Base):
    __tablename__ = "equipamentos"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    fazenda_id = Column(UUID(as_uuid=True), ForeignKey("fazendas.id", ondelete="CASCADE"), nullable=False)
    nome = Column(String(255), nullable=False)
    tipo = Column(String(100), nullable=False)
    marca = Column(String(100))
    modelo = Column(String(100))
    ano = Column(Integer)
    numero_serie = Column(String(100))
    placa = Column(String(20))
    horimetro_inicial = Column(Float)
    horimetro_atual = Column(Float)
    custo_hora = Column(Float)
    status = Column(String(20), default="disponivel")
    data_aquisicao = Column(Date)
    valor_aquisicao = Column(Float)
    observacoes = Column(Text)
    created_at = Column(DateTime, default="CURRENT_TIMESTAMP")
    updated_at = Column(DateTime, default="CURRENT_TIMESTAMP")
    
    fazenda = relationship("Fazenda", back_populates="equipamentos")

class TipoAtividade(Base):
    __tablename__ = "tipos_atividades"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    nome = Column(String(100), nullable=False)
    categoria = Column(String(50), nullable=False)
    descricao = Column(Text)
    cor = Column(String(7), default="#3788d8")
    icone = Column(String(50))
    created_at = Column(DateTime, default="CURRENT_TIMESTAMP")

class Atividade(Base):
    __tablename__ = "atividades"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    fazenda_id = Column(UUID(as_uuid=True), ForeignKey("fazendas.id", ondelete="CASCADE"), nullable=False)
    safra_id = Column(UUID(as_uuid=True), ForeignKey("safras.id", ondelete="SET NULL"))
    talhao_id = Column(UUID(as_uuid=True), ForeignKey("talhoes.id", ondelete="SET NULL"))
    tipo_atividade_id = Column(UUID(as_uuid=True), ForeignKey("tipos_atividades.id"))
    titulo = Column(String(255), nullable=False)
    descricao = Column(Text)
    data_inicio = Column(DateTime, nullable=False)
    data_fim = Column(DateTime)
    data_prevista = Column(DateTime)
    status = Column(String(20), default="pendente")
    prioridade = Column(String(20), default="media")
    operador_id = Column(UUID(as_uuid=True), ForeignKey("operadores.id", ondelete="SET NULL"))
    equipamento_id = Column(UUID(as_uuid=True), ForeignKey("equipamentos.id", ondelete="SET NULL"))
    area_trabalhada = Column(Float)
    horas_trabalhadas = Column(Float)
    custo_total = Column(Float)
    insumos_utilizados = Column(JSONB)
    produtividade_apontada = Column(Float)
    observacoes = Column(Text)
    latitude_inicio = Column(Float)
    longitude_inicio = Column(Float)
    latitude_fim = Column(Float)
    longitude_fim = Column(Float)
    created_at = Column(DateTime, default="CURRENT_TIMESTAMP")
    updated_at = Column(DateTime, default="CURRENT_TIMESTAMP")

class CategoriaDespesa(Base):
    __tablename__ = "categorias_despesas"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    nome = Column(String(100), nullable=False)
    tipo = Column(String(50), nullable=False)
    descricao = Column(Text)
    cor = Column(String(7), default="#6c757d")

class Despesa(Base):
    __tablename__ = "despesas"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    fazenda_id = Column(UUID(as_uuid=True), ForeignKey("fazendas.id", ondelete="CASCADE"), nullable=False)
    safra_id = Column(UUID(as_uuid=True), ForeignKey("safras.id", ondelete="SET NULL"))
    talhao_id = Column(UUID(as_uuid=True), ForeignKey("talhoes.id", ondelete="SET NULL"))
    categoria_id = Column(UUID(as_uuid=True), ForeignKey("categorias_despesas.id"), nullable=False)
    descricao = Column(Text, nullable=False)
    valor = Column(Float, nullable=False)
    data_despesa = Column(Date, nullable=False)
    fornecedor = Column(String(255))
    numero_documento = Column(String(100))
    quantidade = Column(Float)
    unidade_medida = Column(String(20))
    valor_unitario = Column(Float)
    forma_pagamento = Column(String(50))
    parcelas = Column(Integer, default=1)
    observacoes = Column(Text)
    comprovante_url = Column(Text)
    created_at = Column(DateTime, default="CURRENT_TIMESTAMP")
    updated_at = Column(DateTime, default="CURRENT_TIMESTAMP")

class Receita(Base):
    __tablename__ = "receitas"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    fazenda_id = Column(UUID(as_uuid=True), ForeignKey("fazendas.id", ondelete="CASCADE"), nullable=False)
    safra_id = Column(UUID(as_uuid=True), ForeignKey("safras.id", ondelete="SET NULL"))
    talhao_id = Column(UUID(as_uuid=True), ForeignKey("talhoes.id", ondelete="SET NULL"))
    descricao = Column(Text, nullable=False)
    valor = Column(Float, nullable=False)
    data_receita = Column(Date, nullable=False)
    comprador = Column(String(255))
    quantidade_kg = Column(Float)
    preco_por_kg = Column(Float)
    tipo_cultura = Column(String(100))
    observacoes = Column(Text)
    created_at = Column(DateTime, default="CURRENT_TIMESTAMP")
    updated_at = Column(DateTime, default="CURRENT_TIMESTAMP")

class Ocorrencia(Base):
    __tablename__ = "ocorrencias"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    fazenda_id = Column(UUID(as_uuid=True), ForeignKey("fazendas.id", ondelete="CASCADE"), nullable=False)
    safra_id = Column(UUID(as_uuid=True), ForeignKey("safras.id", ondelete="SET NULL"))
    talhao_id = Column(UUID(as_uuid=True), ForeignKey("talhoes.id", ondelete="SET NULL"))
    atividade_id = Column(UUID(as_uuid=True), ForeignKey("atividades.id", ondelete="SET NULL"))
    operador_id = Column(UUID(as_uuid=True), ForeignKey("operadores.id", ondelete="SET NULL"))
    categoria = Column(String(50), nullable=False)
    tipo = Column(String(100), nullable=False)
    severidade = Column(String(20), default="media")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    geom = Column(Geometry('POINT', 4326))
    titulo = Column(String(255), nullable=False)
    descricao = Column(Text)
    foto_url_1 = Column(Text)
    foto_url_2 = Column(Text)
    foto_url_3 = Column(Text)
    ia_analise = Column(Text)
    ia_probabilidade = Column(Float)
    ia_recomendacao = Column(Text)
    status = Column(String(20), default="aberta")
    data_identificacao = Column(DateTime, default="CURRENT_TIMESTAMP")
    data_resolucao = Column(DateTime)
    tratamento_aplicado = Column(Text)
    created_at = Column(DateTime, default="CURRENT_TIMESTAMP")
    updated_at = Column(DateTime, default="CURRENT_TIMESTAMP")

class Insumo(Base):
    __tablename__ = "insumos"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    fazenda_id = Column(UUID(as_uuid=True), ForeignKey("fazendas.id", ondelete="CASCADE"), nullable=False)
    codigo = Column(String(50))
    nome = Column(String(255), nullable=False)
    tipo = Column(String(50), nullable=False)
    categoria = Column(String(50), nullable=False)
    descricao = Column(Text)
    unidade_medida = Column(String(20), nullable=False)
    quantidade_atual = Column(Float, default=0)
    quantidade_minima = Column(Float, default=0)
    preco_medio = Column(Float)
    fornecedor_padrao = Column(String(255))
    observacoes = Column(Text)
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default="CURRENT_TIMESTAMP")
    updated_at = Column(DateTime, default="CURRENT_TIMESTAMP")

class MovimentacaoEstoque(Base):
    __tablename__ = "movimentacoes_estoque"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    insumo_id = Column(UUID(as_uuid=True), ForeignKey("insumos.id", ondelete="CASCADE"), nullable=False)
    tipo = Column(String(20), nullable=False)
    quantidade = Column(Float, nullable=False)
    quantidade_anterior = Column(Float, nullable=False)
    quantidade_nova = Column(Float, nullable=False)
    valor_unitario = Column(Float)
    valor_total = Column(Float)
    data_movimentacao = Column(DateTime, default="CURRENT_TIMESTAMP")
    referencia_id = Column(UUID(as_uuid=True))
    referencia_tipo = Column(String(50))
    motivo = Column(Text)
    operador_id = Column(UUID(as_uuid=True), ForeignKey("operadores.id"))
    observacoes = Column(Text)
    created_at = Column(DateTime, default="CURRENT_TIMESTAMP")

class DadosMeteorologicos(Base):
    __tablename__ = "dados_meteorologicos"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    fazenda_id = Column(UUID(as_uuid=True), ForeignKey("fazendas.id", ondelete="CASCADE"), nullable=False)
    talhao_id = Column(UUID(as_uuid=True), ForeignKey("talhoes.id", ondelete="SET NULL"))
    data = Column(Date, nullable=False)
    temp_max = Column(Float)
    temp_min = Column(Float)
    temp_media = Column(Float)
    umidade_max = Column(Float)
    umidade_min = Column(Float)
    umidade_media = Column(Float)
    precipitacao = Column(Float)
    vento_velocidade = Column(Float)
    vento_direcao = Column(Integer)
    radiacao_solar = Column(Float)
    gdd_dia = Column(Float)
    gdd_acumulado = Column(Float)
    fonte = Column(String(50), default="openweather")
    created_at = Column(DateTime, default="CURRENT_TIMESTAMP")
    
    __table_args__ = (UniqueConstraint('fazenda_id', 'talhao_id', 'data', name='uix_meteo_fazenda_talhao_data'),)

class PrevisaoTempo(Base):
    __tablename__ = "previsao_tempo"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    fazenda_id = Column(UUID(as_uuid=True), ForeignKey("fazendas.id", ondelete="CASCADE"), nullable=False)
    data_previsao = Column(Date, nullable=False)
    hora_previsao = Column(DateTime)
    temp_max = Column(Float)
    temp_min = Column(Float)
    umidade = Column(Float)
    precipitacao_probabilidade = Column(Float)
    precipitacao_volume = Column(Float)
    descricao = Column(String(255))
    icone = Column(String(50))
    vento_velocidade = Column(Float)
    created_at = Column(DateTime, default="CURRENT_TIMESTAMP")

class ImagemSatelite(Base):
    __tablename__ = "imagens_satelite"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    talhao_id = Column(UUID(as_uuid=True), ForeignKey("talhoes.id", ondelete="CASCADE"), nullable=False)
    safra_id = Column(UUID(as_uuid=True), ForeignKey("safras.id", ondelete="SET NULL"))
    data_imagem = Column(Date, nullable=False)
    fonte = Column(String(50), default="sentinel-2")
    cloud_cover = Column(Float)
    ndvi_min = Column(Float)
    ndvi_max = Column(Float)
    ndvi_mean = Column(Float)
    ndre_min = Column(Float)
    ndre_max = Column(Float)
    ndre_mean = Column(Float)
    msavi_min = Column(Float)
    msavi_max = Column(Float)
    msavi_mean = Column(Float)
    gee_image_id = Column(String(255))
    url_thumbnail = Column(Text)
    url_tile_ndvi = Column(Text)
    url_tile_ndre = Column(Text)
    url_tile_msavi = Column(Text)
    processado = Column(Boolean, default=False)
    created_at = Column(DateTime, default="CURRENT_TIMESTAMP")

class ModeloML(Base):
    __tablename__ = "modelos_ml"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    fazenda_id = Column(UUID(as_uuid=True), ForeignKey("fazendas.id", ondelete="CASCADE"), nullable=False)
    nome = Column(String(255), nullable=False)
    tipo = Column(String(50), nullable=False)
    cultura = Column(String(100))
    versao = Column(String(20))
    acuracia = Column(Float)
    parametros = Column(JSONB)
    arquivo_modelo_url = Column(Text)
    status = Column(String(20), default="ativo")
    created_at = Column(DateTime, default="CURRENT_TIMESTAMP")

class PredicaoProdutividade(Base):
    __tablename__ = "predicoes_produtividade"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    modelo_id = Column(UUID(as_uuid=True), ForeignKey("modelos_ml.id"))
    talhao_id = Column(UUID(as_uuid=True), ForeignKey("talhoes.id", ondelete="CASCADE"), nullable=False)
    safra_id = Column(UUID(as_uuid=True), ForeignKey("safras.id", ondelete="SET NULL"))
    ndvi_medio = Column(Float)
    ndre_medio = Column(Float)
    msavi_medio = Column(Float)
    gdd_acumulado = Column(Float)
    precipitacao_acumulada = Column(Float)
    produtividade_predita = Column(Float, nullable=False)
    confianca = Column(Float)
    produtividade_real = Column(Float)
    erro_absoluto = Column(Float)
    data_predicao = Column(DateTime, default="CURRENT_TIMESTAMP")
    created_at = Column(DateTime, default="CURRENT_TIMESTAMP")

class Delineamento(Base):
    __tablename__ = "delineamentos"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    talhao_id = Column(UUID(as_uuid=True), ForeignKey("talhoes.id", ondelete="CASCADE"), nullable=False)
    safra_id = Column(UUID(as_uuid=True), ForeignKey("safras.id", ondelete="SET NULL"))
    nome = Column(String(255), nullable=False)
    metodo = Column(String(50), nullable=False)
    num_zonas = Column(Integer, default=3)
    indice_base = Column(String(20), default="ndvi")
    geom = Column(Geometry('MULTIPOLYGON', 4326))
    estatisticas_zonas = Column(JSONB)
    processado = Column(Boolean, default=False)
    url_visualizacao = Column(Text)
    created_at = Column(DateTime, default="CURRENT_TIMESTAMP")
    updated_at = Column(DateTime, default="CURRENT_TIMESTAMP")

class Usuario(Base):
    __tablename__ = "usuarios"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    senha_hash = Column(String(255), nullable=False)
    nome = Column(String(255), nullable=False)
    telefone = Column(String(20))
    avatar_url = Column(Text)
    perfil = Column(String(20), default="operador")
    ativo = Column(Boolean, default=True)
    ultimo_acesso = Column(DateTime)
    created_at = Column(DateTime, default="CURRENT_TIMESTAMP")
    updated_at = Column(DateTime, default="CURRENT_TIMESTAMP")

class UsuarioFazenda(Base):
    __tablename__ = "usuarios_fazendas"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    fazenda_id = Column(UUID(as_uuid=True), ForeignKey("fazendas.id", ondelete="CASCADE"), nullable=False)
    permissao = Column(String(20), default="leitura")
    created_at = Column(DateTime, default="CURRENT_TIMESTAMP")
    
    __table_args__ = (UniqueConstraint('usuario_id', 'fazenda_id', name='uix_usuario_fazenda'),)
