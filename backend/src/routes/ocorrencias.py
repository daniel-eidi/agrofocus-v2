from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import date
from src.config.database import get_db
from src.models import models, schemas
import base64

router = APIRouter(prefix="/api/v1/ocorrencias", tags=["ocorrencias"])

# ==================== OCORRÊNCIAS ====================
@router.get("/", response_model=List[schemas.Ocorrencia])
def listar_ocorrencias(
    fazenda_id: Optional[UUID] = None,
    safra_id: Optional[UUID] = None,
    talhao_id: Optional[UUID] = None,
    categoria: Optional[str] = None,
    status: Optional[str] = None,
    severidade: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Ocorrencia)
    if fazenda_id:
        query = query.filter(models.Ocorrencia.fazenda_id == fazenda_id)
    if safra_id:
        query = query.filter(models.Ocorrencia.safra_id == safra_id)
    if talhao_id:
        query = query.filter(models.Ocorrencia.talhao_id == talhao_id)
    if categoria:
        query = query.filter(models.Ocorrencia.categoria == categoria)
    if status:
        query = query.filter(models.Ocorrencia.status == status)
    if severidade:
        query = query.filter(models.Ocorrencia.severidade == severidade)
    
    return query.order_by(models.Ocorrencia.data_identificacao.desc()).all()

@router.get("/mapa")
def ocorrencias_mapa(
    fazenda_id: Optional[UUID] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Ocorrencia)
    if fazenda_id:
        query = query.filter(models.Ocorrencia.fazenda_id == fazenda_id)
    
    ocorrencias = query.all()
    
    features = []
    for o in ocorrencias:
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [o.longitude, o.latitude]
            },
            "properties": {
                "id": str(o.id),
                "titulo": o.titulo,
                "categoria": o.categoria,
                "tipo": o.tipo,
                "severidade": o.severidade,
                "status": o.status,
                "data_identificacao": o.data_identificacao.isoformat(),
                "foto_url_1": o.foto_url_1
            }
        })
    
    return {
        "type": "FeatureCollection",
        "features": features
    }

@router.post("/", response_model=schemas.Ocorrencia)
def criar_ocorrencia(ocorrencia: schemas.OcorrenciaCreate, db: Session = Depends(get_db)):
    ocorrencia_data = ocorrencia.dict()
    db_ocorrencia = models.Ocorrencia(**ocorrencia_data)
    db.add(db_ocorrencia)
    db.commit()
    db.refresh(db_ocorrencia)
    return db_ocorrencia

@router.post("/com-foto", response_model=schemas.Ocorrencia)
async def criar_ocorrencia_com_foto(
    fazenda_id: UUID,
    titulo: str,
    categoria: str,
    tipo: str,
    latitude: float,
    longitude: float,
    safra_id: Optional[UUID] = None,
    talhao_id: Optional[UUID] = None,
    descricao: Optional[str] = None,
    severidade: str = "media",
    foto: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    foto_url = None
    if foto:
        contents = await foto.read()
        foto_url = f"data:{foto.content_type};base64,{base64.b64encode(contents).decode()}"
    
    db_ocorrencia = models.Ocorrencia(
        fazenda_id=fazenda_id,
        safra_id=safra_id,
        talhao_id=talhao_id,
        titulo=titulo,
        categoria=categoria,
        tipo=tipo,
        descricao=descricao,
        severidade=severidade,
        latitude=latitude,
        longitude=longitude,
        foto_url_1=foto_url
    )
    db.add(db_ocorrencia)
    db.commit()
    db.refresh(db_ocorrencia)
    return db_ocorrencia

@router.put("/{ocorrencia_id}", response_model=schemas.Ocorrencia)
def atualizar_ocorrencia(ocorrencia_id: UUID, ocorrencia: schemas.OcorrenciaUpdate, db: Session = Depends(get_db)):
    db_ocorrencia = db.query(models.Ocorrencia).filter(models.Ocorrencia.id == ocorrencia_id).first()
    if not db_ocorrencia:
        raise HTTPException(status_code=404, detail="Ocorrência não encontrada")
    for key, value in ocorrencia.dict(exclude_unset=True).items():
        setattr(db_ocorrencia, key, value)
    db.commit()
    db.refresh(db_ocorrencia)
    return db_ocorrencia

@router.patch("/{ocorrencia_id}/resolver")
def resolver_ocorrencia(
    ocorrencia_id: UUID,
    tratamento_aplicado: Optional[str] = None,
    db: Session = Depends(get_db)
):
    from datetime import datetime
    db_ocorrencia = db.query(models.Ocorrencia).filter(models.Ocorrencia.id == ocorrencia_id).first()
    if not db_ocorrencia:
        raise HTTPException(status_code=404, detail="Ocorrência não encontrada")
    db_ocorrencia.status = "resolvida"
    db_ocorrencia.data_resolucao = datetime.now()
    if tratamento_aplicado:
        db_ocorrencia.tratamento_aplicado = tratamento_aplicado
    db.commit()
    return {"sucesso": True, "mensagem": "Ocorrência resolvida"}

@router.delete("/{ocorrencia_id}")
def excluir_ocorrencia(ocorrencia_id: UUID, db: Session = Depends(get_db)):
    db_ocorrencia = db.query(models.Ocorrencia).filter(models.Ocorrencia.id == ocorrencia_id).first()
    if not db_ocorrencia:
        raise HTTPException(status_code=404, detail="Ocorrência não encontrada")
    db.delete(db_ocorrencia)
    db.commit()
    return {"sucesso": True, "mensagem": "Ocorrência excluída com sucesso"}

# ==================== ANÁLISE IA ====================
@router.post("/{ocorrencia_id}/analisar-ia")
def analisar_ocorrencia_ia(ocorrencia_id: UUID, db: Session = Depends(get_db)):
    db_ocorrencia = db.query(models.Ocorrencia).filter(models.Ocorrencia.id == ocorrencia_id).first()
    if not db_ocorrencia:
        raise HTTPException(status_code=404, detail="Ocorrência não encontrada")
    if not db_ocorrencia.foto_url_1:
        raise HTTPException(status_code=400, detail="Ocorrência não possui foto para análise")
    
    # Simulação de análise IA
    categorias_analise = {
        "praga": ["Lagarta", "Pulgão", "Mosca-branca", "Ácaro"],
        "doenca": ["Ferrugem", "Mancha", "Míldio", "Oídio"],
        "deficiencia": ["Nitrogênio", "Fósforo", "Potássio", "Cálcio"]
    }
    
    import random
    categoria = random.choice(list(categorias_analise.keys()))
    tipo = random.choice(categorias_analise[categoria])
    probabilidade = round(random.uniform(0.7, 0.98), 2)
    
    recomendacoes = {
        "praga": f"Aplicar inseticida específico para {tipo}. Monitorar áreas adjacentes.",
        "doenca": f"Aplicar fungicida para controle de {tipo}. Verificar condições de umidade.",
        "deficiencia": f"Aplicar adubação foliar corretiva para {tipo}. Recomendar análise de solo."
    }
    
    db_ocorrencia.ia_analise = f"Detectado: {tipo}"
    db_ocorrencia.ia_probabilidade = probabilidade
    db_ocorrencia.ia_recomendacao = recomendacoes.get(categoria, "Consultar agrônomo.")
    db.commit()
    
    return {
        "sucesso": True,
        "analise": db_ocorrencia.ia_analise,
        "probabilidade": probabilidade,
        "recomendacao": db_ocorrencia.ia_recomendacao
    }

@router.get("/estatisticas/resumo")
def estatisticas_ocorrencias(
    fazenda_id: Optional[UUID] = None,
    db: Session = Depends(get_db)
):
    from sqlalchemy import func
    
    query = db.query(models.Ocorrencia)
    if fazenda_id:
        query = query.filter(models.Ocorrencia.fazenda_id == fazenda_id)
    
    total = query.count()
    abertas = query.filter(models.Ocorrencia.status == "aberta").count()
    resolvidas = query.filter(models.Ocorrencia.status == "resolvida").count()
    
    # Por categoria
    por_categoria = query.with_entities(
        models.Ocorrencia.categoria,
        func.count(models.Ocorrencia.id).label('quantidade')
    ).group_by(models.Ocorrencia.categoria).all()
    
    # Por severidade
    por_severidade = query.with_entities(
        models.Ocorrencia.severidade,
        func.count(models.Ocorrencia.id).label('quantidade')
    ).group_by(models.Ocorrencia.severidade).all()
    
    return {
        "total": total,
        "abertas": abertas,
        "resolvidas": resolvidas,
        "por_categoria": [{"categoria": p.categoria, "quantidade": p.quantidade} for p in por_categoria],
        "por_severidade": [{"severidade": p.severidade, "quantidade": p.quantidade} for p in por_severidade]
    }
