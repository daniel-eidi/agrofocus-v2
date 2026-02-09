from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import date, datetime, timedelta
from src.config.database import get_db
from src.models import models, schemas
from src.utils.gee_service import GEEService

router = APIRouter(prefix="/api/v1/monitoramento", tags=["monitoramento"])

# ==================== IMAGENS SATÉLITE ====================
@router.get("/imagens", response_model=List[schemas.ImagemSatelite])
def listar_imagens(
    talhao_id: Optional[UUID] = None,
    safra_id: Optional[UUID] = None,
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    processado: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.ImagemSatelite)
    if talhao_id:
        query = query.filter(models.ImagemSatelite.talhao_id == talhao_id)
    if safra_id:
        query = query.filter(models.ImagemSatelite.safra_id == safra_id)
    if data_inicio:
        query = query.filter(models.ImagemSatelite.data_imagem >= data_inicio)
    if data_fim:
        query = query.filter(models.ImagemSatelite.data_imagem <= data_fim)
    if processado is not None:
        query = query.filter(models.ImagemSatelite.processado == processado)
    
    return query.order_by(models.ImagemSatelite.data_imagem.desc()).all()

@router.post("/imagens", response_model=schemas.ImagemSatelite)
def criar_imagem(imagem: schemas.ImagemSateliteCreate, db: Session = Depends(get_db)):
    db_imagem = models.ImagemSatelite(**imagem.dict())
    db.add(db_imagem)
    db.commit()
    db.refresh(db_imagem)
    return db_imagem

@router.get("/talhoes/{talhao_id}/serie-temporal")
def serie_temporal_indices(
    talhao_id: UUID,
    indice: str = "ndvi",
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.ImagemSatelite).filter(
        models.ImagemSatelite.talhao_id == talhao_id
    )
    if data_inicio:
        query = query.filter(models.ImagemSatelite.data_imagem >= data_inicio)
    if data_fim:
        query = query.filter(models.ImagemSatelite.data_imagem <= data_fim)
    
    imagens = query.order_by(models.ImagemSatelite.data_imagem).all()
    
    if indice == "ndvi":
        serie = [{"data": i.data_imagem.isoformat(), "valor": i.ndvi_mean} for i in imagens if i.ndvi_mean]
    elif indice == "ndre":
        serie = [{"data": i.data_imagem.isoformat(), "valor": i.ndre_mean} for i in imagens if i.ndre_mean]
    elif indice == "msavi":
        serie = [{"data": i.data_imagem.isoformat(), "valor": i.msavi_mean} for i in imagens if i.msavi_mean]
    else:
        serie = []
    
    return {"indice": indice, "talhao_id": str(talhao_id), "dados": serie}

@router.post("/talhoes/{talhao_id}/processar-gee")
def processar_imagem_gee(talhao_id: UUID, data_imagem: date, db: Session = Depends(get_db)):
    talhao = db.query(models.Talhao).filter(models.Talhao.id == talhao_id).first()
    if not talhao:
        raise HTTPException(status_code=404, detail="Talhão não encontrado")
    
    # Simulação de processamento GEE
    gee_service = GEEService()
    resultado = gee_service.processar_imagem(
        talhao_id=str(talhao_id),
        geometry=None,  # GeoJSON do talhão
        data=str(data_imagem)
    )
    
    # Criar registro da imagem processada
    imagem = models.ImagemSatelite(
        talhao_id=talhao_id,
        data_imagem=data_imagem,
        ndvi_mean=resultado.get("ndvi_mean"),
        ndre_mean=resultado.get("ndre_mean"),
        msavi_mean=resultado.get("msavi_mean"),
        gee_image_id=resultado.get("image_id"),
        processado=True
    )
    db.add(imagem)
    db.commit()
    db.refresh(imagem)
    
    return {"sucesso": True, "imagem_id": str(imagem.id), "resultado": resultado}

# ==================== MAP TILES ====================
@router.get("/tiles/{indice}/url")
def obter_url_tiles(
    indice: str,  # ndvi, ndre, msavi
    talhao_id: UUID,
    data: date,
    db: Session = Depends(get_db)
):
    """Retorna URL para visualização de tiles do GEE"""
    talhao = db.query(models.Talhao).filter(models.Talhao.id == talhao_id).first()
    if not talhao:
        raise HTTPException(status_code=404, detail="Talhão não encontrado")
    
    imagem = db.query(models.ImagemSatelite).filter(
        models.ImagemSatelite.talhao_id == talhao_id,
        models.ImagemSatelite.data_imagem == data
    ).first()
    
    if not imagem:
        # Gerar URL dinâmica do GEE
        gee_service = GEEService()
        url_tile = gee_service.gerar_tile_url(
            talhao_id=str(talhao_id),
            indice=indice,
            data=str(data)
        )
        return {"url": url_tile, "fonte": "gee_dinamico"}
    
    if indice == "ndvi" and imagem.url_tile_ndvi:
        return {"url": imagem.url_tile_ndvi, "fonte": "cache"}
    elif indice == "ndre" and imagem.url_tile_ndre:
        return {"url": imagem.url_tile_ndre, "fonte": "cache"}
    elif indice == "msavi" and imagem.url_tile_msavi:
        return {"url": imagem.url_tile_msavi, "fonte": "cache"}
    
    return {"url": None, "fonte": None, "mensagem": "Tiles não disponíveis para esta data"}

# ==================== DASHBOARD MONITORAMENTO ====================
@router.get("/dashboard")
def dashboard_monitoramento(
    fazenda_id: Optional[UUID] = None,
    safra_id: Optional[UUID] = None,
    db: Session = Depends(get_db)
):
    # Talhões por status de saúde (baseado no último NDVI)
    from sqlalchemy import func, desc
    
    # Subquery para última imagem de cada talhão
    ultimas_imagens = db.query(
        models.ImagemSatelite.talhao_id,
        func.max(models.ImagemSatelite.data_imagem).label('max_data')
    ).group_by(models.ImagemSatelite.talhao_id).subquery()
    
    query_imagens = db.query(models.ImagemSatelite).join(
        ultimas_imagens,
        (models.ImagemSatelite.talhao_id == ultimas_imagens.c.talhao_id) &
        (models.ImagemSatelite.data_imagem == ultimas_imagens.c.max_data)
    )
    
    imagens = query_imagens.all()
    
    saudaveis = sum(1 for i in imagens if i.ndvi_mean and i.ndvi_mean > 0.6)
    atencao = sum(1 for i in imagens if i.ndvi_mean and 0.3 <= i.ndvi_mean <= 0.6)
    criticos = sum(1 for i in imagens if i.ndvi_mean and i.ndvi_mean < 0.3)
    
    return {
        "talhoes_saudaveis": saudaveis,
        "talhoes_atencao": atencao,
        "talhoes_criticos": criticos,
        "ultimas_atualizacoes": [
            {
                "talhao_id": str(i.talhao_id),
                "data": i.data_imagem.isoformat(),
                "ndvi": i.ndvi_mean,
                "ndre": i.ndre_mean,
                "msavi": i.msavi_mean
            }
            for i in imagens[:10]
        ]
    }
