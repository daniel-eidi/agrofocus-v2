from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from uuid import UUID
from datetime import date, datetime, timedelta
from src.config.database import get_db
from src.models import models, schemas

router = APIRouter(prefix="/api/v1/meteorologia", tags=["meteorologia"])

# ==================== DADOS METEOROLÓGICOS ====================
@router.get("/dados", response_model=List[schemas.DadosMeteorologicos])
def listar_dados_meteorologicos(
    fazenda_id: UUID,
    talhao_id: Optional[UUID] = None,
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.DadosMeteorologicos).filter(
        models.DadosMeteorologicos.fazenda_id == fazenda_id
    )
    if talhao_id:
        query = query.filter(models.DadosMeteorologicos.talhao_id == talhao_id)
    if data_inicio:
        query = query.filter(models.DadosMeteorologicos.data >= data_inicio)
    if data_fim:
        query = query.filter(models.DadosMeteorologicos.data <= data_fim)
    
    return query.order_by(models.DadosMeteorologicos.data.desc()).all()

@router.post("/dados", response_model=schemas.DadosMeteorologicos)
def criar_dado_meteorologico(dado: schemas.DadosMeteorologicosCreate, db: Session = Depends(get_db)):
    # Calcular GDD se temperaturas foram fornecidas
    if dado.temp_max and dado.temp_min:
        t_base = 10.0  # Temperatura base para cálculo
        t_max_efetiva = min(dado.temp_max, 30.0)  # Limite superior
        t_min_efetiva = max(dado.temp_min, t_base)  # Limite inferior
        gdd_dia = ((t_max_efetiva + t_min_efetiva) / 2) - t_base
        dado.gdd_dia = max(0, gdd_dia)
    
    db_dado = models.DadosMeteorologicos(**dado.dict())
    db.add(db_dado)
    db.commit()
    db.refresh(db_dado)
    
    # Atualizar GDD acumulado
    atualizar_gdd_acumulado(db, db_dado.fazenda_id, db_dado.talhao_id)
    
    return db_dado

@router.get("/gdd-acumulado")
def gdd_acumulado(
    fazenda_id: UUID,
    talhao_id: Optional[UUID] = None,
    safra_id: Optional[UUID] = None,
    db: Session = Depends(get_db)
):
    """Retorna o GDD acumulado para o período"""
    query = db.query(models.DadosMeteorologicos).filter(
        models.DadosMeteorologicos.fazenda_id == fazenda_id
    )
    if talhao_id:
        query = query.filter(models.DadosMeteorologicos.talhao_id == talhao_id)
    
    # Se tiver safra, usar data de início da safra
    if safra_id:
        safra = db.query(models.Safra).filter(models.Safra.id == safra_id).first()
        if safra and safra.data_inicio:
            query = query.filter(models.DadosMeteorologicos.data >= safra.data_inicio)
    
    dados = query.order_by(models.DadosMeteorologicos.data).all()
    
    gdd_acumulado = 0
    serie_gdd = []
    
    for dado in dados:
        if dado.gdd_dia:
            gdd_acumulado += dado.gdd_dia
        serie_gdd.append({
            "data": dado.data.isoformat(),
            "gdd_dia": dado.gdd_dia,
            "gdd_acumulado": gdd_acumulado
        })
    
    return {
        "gdd_acumulado": gdd_acumulado,
        "dias_monitorados": len(dados),
        "serie_temporal": serie_gdd
    }

def atualizar_gdd_acumulado(db: Session, fazenda_id: UUID, talhao_id: Optional[UUID] = None):
    """Atualiza o GDD acumulado para todos os registros após uma nova inserção"""
    query = db.query(models.DadosMeteorologicos).filter(
        models.DadosMeteorologicos.fazenda_id == fazenda_id
    )
    if talhao_id:
        query = query.filter(models.DadosMeteorologicos.talhao_id == talhao_id)
    
    dados = query.order_by(models.DadosMeteorologicos.data).all()
    
    gdd_acumulado = 0
    for dado in dados:
        if dado.gdd_dia:
            gdd_acumulado += dado.gdd_dia
        dado.gdd_acumulado = gdd_acumulado
    
    db.commit()

# ==================== PREVISÃO DO TEMPO ====================
@router.get("/previsao", response_model=List[schemas.PrevisaoTempo])
def obter_previsao(
    fazenda_id: UUID,
    dias: int = 7,
    db: Session = Depends(get_db)
):
    """Obtém previsão do tempo para os próximos dias"""
    # Verificar se já temos previsão atualizada
    hoje = date.today()
    previsao_existente = db.query(models.PrevisaoTempo).filter(
        models.PrevisaoTempo.fazenda_id == fazenda_id,
        models.PrevisaoTempo.data_previsao >= hoje
    ).order_by(models.PrevisaoTempo.data_previsao).all()
    
    if len(previsao_existente) >= dias:
        return previsao_existente[:dias]
    
    # Buscar nova previsão da API externa
    from src.utils.weather_service import WeatherService
    weather_service = WeatherService()
    
    fazenda = db.query(models.Fazenda).filter(models.Fazenda.id == fazenda_id).first()
    if not fazenda or not fazenda.latitude or not fazenda.longitude:
        raise HTTPException(status_code=400, detail="Fazenda sem coordenadas cadastradas")
    
    previsao = weather_service.obter_previsao(
        lat=fazenda.latitude,
        lon=fazenda.longitude,
        dias=dias
    )
    
    # Salvar previsão no banco
    for dia in previsao:
        db_previsao = models.PrevisaoTempo(
            fazenda_id=fazenda_id,
            **dia
        )
        db.add(db_previsao)
    
    db.commit()
    
    return db.query(models.PrevisaoTempo).filter(
        models.PrevisaoTempo.fazenda_id == fazenda_id,
        models.PrevisaoTempo.data_previsao >= hoje
    ).order_by(models.PrevisaoTempo.data_previsao).all()[:dias]

@router.get("/clima-atual")
def clima_atual(fazenda_id: UUID, db: Session = Depends(get_db)):
    """Obtém condições climáticas atuais"""
    fazenda = db.query(models.Fazenda).filter(models.Fazenda.id == fazenda_id).first()
    if not fazenda or not fazenda.latitude or not fazenda.longitude:
        raise HTTPException(status_code=400, detail="Fazenda sem coordenadas cadastradas")
    
    from src.utils.weather_service import WeatherService
    weather_service = WeatherService()
    
    return weather_service.obter_clima_atual(
        lat=fazenda.latitude,
        lon=fazenda.longitude
    )

# ==================== RESUMO ====================
@router.get("/resumo")
def resumo_meteorologico(
    fazenda_id: UUID,
    dias: int = 30,
    db: Session = Depends(get_db)
):
    """Resumo dos dados meteorológicos dos últimos dias"""
    data_inicio = date.today() - timedelta(days=dias)
    
    query = db.query(
        func.avg(models.DadosMeteorologicos.temp_max).label('temp_max_media'),
        func.avg(models.DadosMeteorologicos.temp_min).label('temp_min_media'),
        func.avg(models.DadosMeteorologicos.temp_media).label('temp_media'),
        func.sum(models.DadosMeteorologicos.precipitacao).label('precipitacao_total'),
        func.avg(models.DadosMeteorologicos.umidade_media).label('umidade_media'),
        func.max(models.DadosMeteorologicos.temp_max).label('temp_max_abs'),
        func.min(models.DadosMeteorologicos.temp_min).label('temp_min_abs')
    ).filter(
        models.DadosMeteorologicos.fazenda_id == fazenda_id,
        models.DadosMeteorologicos.data >= data_inicio
    )
    
    resultado = query.first()
    
    return {
        "periodo_dias": dias,
        "temperatura": {
            "media_maxima": round(resultado.temp_max_media, 1) if resultado.temp_max_media else None,
            "media_minima": round(resultado.temp_min_media, 1) if resultado.temp_min_media else None,
            "media": round(resultado.temp_media, 1) if resultado.temp_media else None,
            "maxima_absoluta": resultado.temp_max_abs,
            "minima_absoluta": resultado.temp_min_abs
        },
        "precipitacao_total": round(resultado.precipitacao_total, 1) if resultado.precipitacao_total else 0,
        "umidade_media": round(resultado.umidade_media, 1) if resultado.umidade_media else None
    }
