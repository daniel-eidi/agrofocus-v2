from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from uuid import UUID

# Fazenda Schemas
class FazendaBase(BaseModel):
    nome: str
    codigo_car: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    cep: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    area_total: Optional[float] = None
    proprietario_nome: Optional[str] = None
    proprietario_cpf_cnpj: Optional[str] = None
    proprietario_telefone: Optional[str] = None
    proprietario_email: Optional[str] = None
    status: str = "ativo"
    observacoes: Optional[str] = None

class FazendaCreate(FazendaBase):
    pass

class FazendaUpdate(FazendaBase):
    pass

class Fazenda(FazendaBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Safra Schemas
class SafraBase(BaseModel):
    fazenda_id: UUID
    nome: str
    ano_inicio: int
    ano_fim: int
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None
    status: str = "planejada"
    cultura_principal: Optional[str] = None
    area_plantada: Optional[float] = None
    produtividade_estimada: Optional[float] = None
    produtividade_realizada: Optional[float] = None
    custo_total: Optional[float] = None
    receita_total: Optional[float] = None
    observacoes: Optional[str] = None

class SafraCreate(SafraBase):
    pass

class SafraUpdate(SafraBase):
    pass

class Safra(SafraBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Talhão Schemas
class TalhaoBase(BaseModel):
    fazenda_id: UUID
    safra_id: Optional[UUID] = None
    codigo: str
    nome: str
    cultura: Optional[str] = None
    variedade: Optional[str] = None
    area_hectares: float
    solo_tipo: Optional[str] = None
    solo_ph: Optional[float] = None
    irrigacao: bool = False
    data_plantio: Optional[date] = None
    data_colheita_prevista: Optional[date] = None
    data_colheita_real: Optional[date] = None
    status: str = "ativo"
    produtividade_estimada: Optional[float] = None
    produtividade_realizada: Optional[float] = None
    coordenadas_centro_y: Optional[float] = None
    coordenadas_centro_x: Optional[float] = None

class TalhaoCreate(TalhaoBase):
    geojson_poligono: Optional[Dict[str, Any]] = None

class TalhaoUpdate(TalhaoBase):
    pass

class Talhao(TalhaoBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TalhaoComGeo(Talhao):
    geojson_poligono: Optional[Dict[str, Any]] = None

# Operador Schemas
class OperadorBase(BaseModel):
    fazenda_id: UUID
    nome: str
    cpf: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    funcao: Optional[str] = None
    data_contratacao: Optional[date] = None
    salario: Optional[float] = None
    status: str = "ativo"
    certificacoes: Optional[str] = None
    observacoes: Optional[str] = None

class OperadorCreate(OperadorBase):
    pass

class OperadorUpdate(OperadorBase):
    pass

class Operador(OperadorBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Equipamento Schemas
class EquipamentoBase(BaseModel):
    fazenda_id: UUID
    nome: str
    tipo: str
    marca: Optional[str] = None
    modelo: Optional[str] = None
    ano: Optional[int] = None
    numero_serie: Optional[str] = None
    placa: Optional[str] = None
    horimetro_inicial: Optional[float] = None
    horimetro_atual: Optional[float] = None
    custo_hora: Optional[float] = None
    status: str = "disponivel"
    data_aquisicao: Optional[date] = None
    valor_aquisicao: Optional[float] = None
    observacoes: Optional[str] = None

class EquipamentoCreate(EquipamentoBase):
    pass

class EquipamentoUpdate(EquipamentoBase):
    pass

class Equipamento(EquipamentoBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Tipo Atividade Schemas
class TipoAtividadeBase(BaseModel):
    nome: str
    categoria: str
    descricao: Optional[str] = None
    cor: str = "#3788d8"
    icone: Optional[str] = None

class TipoAtividadeCreate(TipoAtividadeBase):
    pass

class TipoAtividade(TipoAtividadeBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

# Atividade Schemas
class AtividadeBase(BaseModel):
    fazenda_id: UUID
    safra_id: Optional[UUID] = None
    talhao_id: Optional[UUID] = None
    tipo_atividade_id: Optional[UUID] = None
    titulo: str
    descricao: Optional[str] = None
    data_inicio: datetime
    data_fim: Optional[datetime] = None
    data_prevista: Optional[datetime] = None
    status: str = "pendente"
    prioridade: str = "media"
    operador_id: Optional[UUID] = None
    equipamento_id: Optional[UUID] = None
    area_trabalhada: Optional[float] = None
    horas_trabalhadas: Optional[float] = None
    custo_total: Optional[float] = None
    insumos_utilizados: Optional[Dict[str, Any]] = None
    produtividade_apontada: Optional[float] = None
    observacoes: Optional[str] = None
    latitude_inicio: Optional[float] = None
    longitude_inicio: Optional[float] = None
    latitude_fim: Optional[float] = None
    longitude_fim: Optional[float] = None

class AtividadeCreate(AtividadeBase):
    pass

class AtividadeUpdate(AtividadeBase):
    pass

class Atividade(AtividadeBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class AtividadeComRelacionamentos(Atividade):
    tipo_atividade: Optional[TipoAtividade] = None
    operador: Optional[Operador] = None
    equipamento: Optional[Equipamento] = None
    talhao: Optional[Talhao] = None

# Despesa Schemas
class CategoriaDespesaBase(BaseModel):
    nome: str
    tipo: str
    descricao: Optional[str] = None
    cor: str = "#6c757d"

class CategoriaDespesa(CategoriaDespesaBase):
    id: UUID

    class Config:
        from_attributes = True

class DespesaBase(BaseModel):
    fazenda_id: UUID
    safra_id: Optional[UUID] = None
    talhao_id: Optional[UUID] = None
    categoria_id: UUID
    descricao: str
    valor: float
    data_despesa: date
    fornecedor: Optional[str] = None
    numero_documento: Optional[str] = None
    quantidade: Optional[float] = None
    unidade_medida: Optional[str] = None
    valor_unitario: Optional[float] = None
    forma_pagamento: Optional[str] = None
    parcelas: int = 1
    observacoes: Optional[str] = None
    comprovante_url: Optional[str] = None

class DespesaCreate(DespesaBase):
    pass

class DespesaUpdate(DespesaBase):
    pass

class Despesa(DespesaBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class DespesaComCategoria(Despesa):
    categoria: CategoriaDespesa

# Receita Schemas
class ReceitaBase(BaseModel):
    fazenda_id: UUID
    safra_id: Optional[UUID] = None
    talhao_id: Optional[UUID] = None
    descricao: str
    valor: float
    data_receita: date
    comprador: Optional[str] = None
    quantidade_kg: Optional[float] = None
    preco_por_kg: Optional[float] = None
    tipo_cultura: Optional[str] = None
    observacoes: Optional[str] = None

class ReceitaCreate(ReceitaBase):
    pass

class ReceitaUpdate(ReceitaBase):
    pass

class Receita(ReceitaBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Ocorrência Schemas
class OcorrenciaBase(BaseModel):
    fazenda_id: UUID
    safra_id: Optional[UUID] = None
    talhao_id: Optional[UUID] = None
    atividade_id: Optional[UUID] = None
    operador_id: Optional[UUID] = None
    categoria: str
    tipo: str
    severidade: str = "media"
    latitude: float
    longitude: float
    titulo: str
    descricao: Optional[str] = None
    foto_url_1: Optional[str] = None
    foto_url_2: Optional[str] = None
    foto_url_3: Optional[str] = None
    ia_analise: Optional[str] = None
    ia_probabilidade: Optional[float] = None
    ia_recomendacao: Optional[str] = None
    status: str = "aberta"
    tratamento_aplicado: Optional[str] = None

class OcorrenciaCreate(OcorrenciaBase):
    pass

class OcorrenciaUpdate(BaseModel):
    status: Optional[str] = None
    tratamento_aplicado: Optional[str] = None
    severidade: Optional[str] = None

class Ocorrencia(OcorrenciaBase):
    id: UUID
    data_identificacao: datetime
    data_resolucao: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Insumo Schemas
class InsumoBase(BaseModel):
    fazenda_id: UUID
    codigo: Optional[str] = None
    nome: str
    tipo: str
    categoria: str
    descricao: Optional[str] = None
    unidade_medida: str
    quantidade_atual: float = 0
    quantidade_minima: float = 0
    preco_medio: Optional[float] = None
    fornecedor_padrao: Optional[str] = None
    observacoes: Optional[str] = None
    ativo: bool = True

class InsumoCreate(InsumoBase):
    pass

class InsumoUpdate(InsumoBase):
    pass

class Insumo(InsumoBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Movimentação Estoque Schemas
class MovimentacaoEstoqueBase(BaseModel):
    insumo_id: UUID
    tipo: str
    quantidade: float
    valor_unitario: Optional[float] = None
    valor_total: Optional[float] = None
    referencia_id: Optional[UUID] = None
    referencia_tipo: Optional[str] = None
    motivo: Optional[str] = None
    operador_id: Optional[UUID] = None
    observacoes: Optional[str] = None

class MovimentacaoEstoqueCreate(MovimentacaoEstoqueBase):
    pass

class MovimentacaoEstoque(MovimentacaoEstoqueBase):
    id: UUID
    quantidade_anterior: float
    quantidade_nova: float
    data_movimentacao: datetime
    created_at: datetime

    class Config:
        from_attributes = True

# Dados Meteorológicos Schemas
class DadosMeteorologicosBase(BaseModel):
    fazenda_id: UUID
    talhao_id: Optional[UUID] = None
    data: date
    temp_max: Optional[float] = None
    temp_min: Optional[float] = None
    temp_media: Optional[float] = None
    umidade_max: Optional[float] = None
    umidade_min: Optional[float] = None
    umidade_media: Optional[float] = None
    precipitacao: Optional[float] = None
    vento_velocidade: Optional[float] = None
    vento_direcao: Optional[int] = None
    radiacao_solar: Optional[float] = None
    gdd_dia: Optional[float] = None
    gdd_acumulado: Optional[float] = None

class DadosMeteorologicosCreate(DadosMeteorologicosBase):
    pass

class DadosMeteorologicos(DadosMeteorologicosBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

# Previsão Tempo Schemas
class PrevisaoTempoBase(BaseModel):
    fazenda_id: UUID
    data_previsao: date
    hora_previsao: Optional[datetime] = None
    temp_max: Optional[float] = None
    temp_min: Optional[float] = None
    umidade: Optional[float] = None
    precipitacao_probabilidade: Optional[float] = None
    precipitacao_volume: Optional[float] = None
    descricao: Optional[str] = None
    icone: Optional[str] = None
    vento_velocidade: Optional[float] = None

class PrevisaoTempo(PrevisaoTempoBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

# Imagem Satélite Schemas
class ImagemSateliteBase(BaseModel):
    talhao_id: UUID
    safra_id: Optional[UUID] = None
    data_imagem: date
    fonte: str = "sentinel-2"
    cloud_cover: Optional[float] = None
    ndvi_min: Optional[float] = None
    ndvi_max: Optional[float] = None
    ndvi_mean: Optional[float] = None
    ndre_min: Optional[float] = None
    ndre_max: Optional[float] = None
    ndre_mean: Optional[float] = None
    msavi_min: Optional[float] = None
    msavi_max: Optional[float] = None
    msavi_mean: Optional[float] = None

class ImagemSateliteCreate(ImagemSateliteBase):
    gee_image_id: Optional[str] = None
    url_thumbnail: Optional[str] = None
    url_tile_ndvi: Optional[str] = None
    url_tile_ndre: Optional[str] = None
    url_tile_msavi: Optional[str] = None

class ImagemSatelite(ImagemSateliteBase):
    id: UUID
    gee_image_id: Optional[str] = None
    url_thumbnail: Optional[str] = None
    url_tile_ndvi: Optional[str] = None
    url_tile_ndre: Optional[str] = None
    url_tile_msavi: Optional[str] = None
    processado: bool = False
    created_at: datetime

    class Config:
        from_attributes = True

# Predição Produtividade Schemas
class PredicaoProdutividadeBase(BaseModel):
    modelo_id: Optional[UUID] = None
    talhao_id: UUID
    safra_id: Optional[UUID] = None
    ndvi_medio: Optional[float] = None
    ndre_medio: Optional[float] = None
    msavi_medio: Optional[float] = None
    gdd_acumulado: Optional[float] = None
    precipitacao_acumulada: Optional[float] = None
    produtividade_predita: float
    confianca: Optional[float] = None

class PredicaoProdutividadeCreate(PredicaoProdutividadeBase):
    pass

class PredicaoProdutividade(PredicaoProdutividadeBase):
    id: UUID
    produtividade_real: Optional[float] = None
    erro_absoluto: Optional[float] = None
    data_predicao: datetime
    created_at: datetime

    class Config:
        from_attributes = True

# Delineamento Schemas
class DelineamentoBase(BaseModel):
    talhao_id: UUID
    safra_id: Optional[UUID] = None
    nome: str
    metodo: str
    num_zonas: int = 3
    indice_base: str = "ndvi"
    estatisticas_zonas: Optional[Dict[str, Any]] = None

class DelineamentoCreate(DelineamentoBase):
    geojson_zonas: Optional[Dict[str, Any]] = None

class Delineamento(DelineamentoBase):
    id: UUID
    processado: bool = False
    url_visualizacao: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class DelineamentoComGeo(Delineamento):
    geojson_zonas: Optional[Dict[str, Any]] = None

# Dashboard Schemas
class DashboardResumo(BaseModel):
    total_fazendas: int
    total_safras_ativas: int
    total_talhoes: int
    area_total: float
    despesas_mes: float
    receitas_mes: float
    atividades_pendentes: int
    ocorrencias_abertas: int
    produtividade_estimada: float

class DashboardFinanceiro(BaseModel):
    despesas_por_categoria: List[Dict[str, Any]]
    receitas_vs_despesas: List[Dict[str, Any]]
    saldo_acumulado: List[Dict[str, Any]]

class GraficoDados(BaseModel):
    labels: List[str]
    datasets: List[Dict[str, Any]]

# Resposta padrão
class RespostaSucesso(BaseModel):
    sucesso: bool = True
    mensagem: str
    dados: Optional[Any] = None
