from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import date
from src.config.database import get_db
from src.models import models, schemas

router = APIRouter(prefix="/api/v1/produtividade", tags=["produtividade"])

# ==================== PREDIÇÕES ====================
@router.get("/predicoes", response_model=List[schemas.PredicaoProdutividade])
def listar_predicoes(
    talhao_id: Optional[UUID] = None,
    safra_id: Optional[UUID] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.PredicaoProdutividade)
    if talhao_id:
        query = query.filter(models.PredicaoProdutividade.talhao_id == talhao_id)
    if safra_id:
        query = query.filter(models.PredicaoProdutividade.safra_id == safra_id)
    
    return query.order_by(models.PredicaoProdutividade.data_predicao.desc()).all()

@router.post("/predicoes", response_model=schemas.PredicaoProdutividade)
def criar_predicao(predicao: schemas.PredicaoProdutividadeCreate, db: Session = Depends(get_db)):
    db_predicao = models.PredicaoProdutividade(**predicao.dict())
    db.add(db_predicao)
    db.commit()
    db.refresh(db_predicao)
    return db_predicao

@router.post("/talhoes/{talhao_id}/prever")
def prever_produtividade_ml(talhao_id: UUID, db: Session = Depends(get_db)):
    """Executa predição de produtividade usando ML"""
    talhao = db.query(models.Talhao).filter(models.Talhao.id == talhao_id).first()
    if not talhao:
        raise HTTPException(status_code=404, detail="Talhão não encontrado")
    
    # Obter dados para predição
    ultima_imagem = db.query(models.ImagemSatelite).filter(
        models.ImagemSatelite.talhao_id == talhao_id
    ).order_by(models.ImagemSatelite.data_imagem.desc()).first()
    
    ultimo_dado_meteo = db.query(models.DadosMeteorologicos).filter(
        models.DadosMeteorologicos.talhao_id == talhao_id
    ).order_by(models.DadosMeteorologicos.data.desc()).first()
    
    # Simular predição ML
    from src.utils.ml_service import MLService
    ml_service = MLService()
    
    resultado = ml_service.prever_produtividade({
        "ndvi": ultima_imagem.ndvi_mean if ultima_imagem else 0.5,
        "ndre": ultima_imagem.ndre_mean if ultima_imagem else 0.4,
        "msavi": ultima_imagem.msavi_mean if ultima_imagem else 0.3,
        "gdd": ultimo_dado_meteo.gdd_acumulado if ultimo_dado_meteo else 1000,
        "area": talhao.area_hectares,
        "cultura": talhao.cultura
    })
    
    # Salvar predição
    predicao = models.PredicaoProdutividade(
        talhao_id=talhao_id,
        safra_id=talhao.safra_id,
        ndvi_medio=ultima_imagem.ndvi_mean if ultima_imagem else None,
        ndre_medio=ultima_imagem.ndre_mean if ultima_imagem else None,
        msavi_medio=ultima_imagem.msavi_mean if ultima_imagem else None,
        gdd_acumulado=ultimo_dado_meteo.gdd_acumulado if ultimo_dado_meteo else None,
        produtividade_predita=resultado["produtividade"],
        confianca=resultado["confianca"]
    )
    db.add(predicao)
    db.commit()
    db.refresh(predicao)
    
    return {
        "sucesso": True,
        "predicao_id": str(predicao.id),
        "produtividade_predita": resultado["produtividade"],
        "confianca": resultado["confianca"],
        "unidade": "kg/ha"
    }

@router.patch("/predicoes/{predicao_id}/atualizar-real")
def atualizar_produtividade_real(
    predicao_id: UUID,
    produtividade_real: float,
    db: Session = Depends(get_db)
):
    """Atualiza a produtividade real para comparar com a predição"""
    predicao = db.query(models.PredicaoProdutividade).filter(
        models.PredicaoProdutividade.id == predicao_id
    ).first()
    
    if not predicao:
        raise HTTPException(status_code=404, detail="Predição não encontrada")
    
    predicao.produtividade_real = produtividade_real
    predicao.erro_absoluto = abs(predicao.produtividade_predita - produtividade_real)
    
    db.commit()
    
    return {
        "sucesso": True,
        "erro_absoluto": predicao.erro_absoluto,
        "erro_percentual": round((predicao.erro_absoluto / predicao.produtividade_predita) * 100, 2)
    }

# ==================== MODELOS ML ====================
@router.get("/modelos")
def listar_modelos(
    fazenda_id: Optional[UUID] = None,
    cultura: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.ModeloML)
    if fazenda_id:
        query = query.filter(models.ModeloML.fazenda_id == fazenda_id)
    if cultura:
        query = query.filter(models.ModeloML.cultura == cultura)
    
    return query.all()

@router.post("/modelos/treinar")
def treinar_modelo(
    fazenda_id: UUID,
    cultura: str,
    nome: str,
    db: Session = Depends(get_db)
):
    """Inicia treinamento de um novo modelo ML"""
    from src.utils.ml_service import MLService
    ml_service = MLService()
    
    # Buscar dados históricos para treinamento
    dados_treinamento = db.query(
        models.PredicaoProdutividade,
        models.Talhao
    ).join(
        models.Talhao,
        models.PredicaoProdutividade.talhao_id == models.Talhao.id
    ).filter(
        models.Talhao.fazenda_id == fazenda_id,
        models.Talhao.cultura == cultura,
        models.PredicaoProdutividade.produtividade_real.isnot(None)
    ).all()
    
    if len(dados_treinamento) < 10:
        raise HTTPException(
            status_code=400, 
            detail=f"Dados insuficientes para treinamento. Necessário mínimo 10 registros, encontrados {len(dados_treinamento)}"
        )
    
    # Treinar modelo
    resultado = ml_service.treinar_modelo(dados_treinamento)
    
    # Salvar modelo
    modelo = models.ModeloML(
        fazenda_id=fazenda_id,
        nome=nome,
        tipo="produtividade",
        cultura=cultura,
        versao="1.0",
        acuracia=resultado["acuracia"],
        parametros=resultado["parametros"],
        status="ativo"
    )
    db.add(modelo)
    db.commit()
    
    return {
        "sucesso": True,
        "modelo_id": str(modelo.id),
        "acuracia": resultado["acuracia"],
        "mensagem": "Modelo treinado com sucesso"
    }

# ==================== DELINEAMENTOS ====================
@router.get("/delineamentos", response_model=List[schemas.DelineamentoComGeo])
def listar_delineamentos(
    talhao_id: Optional[UUID] = None,
    safra_id: Optional[UUID] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Delineamento)
    if talhao_id:
        query = query.filter(models.Delineamento.talhao_id == talhao_id)
    if safra_id:
        query = query.filter(models.Delineamento.safra_id == safra_id)
    
    return query.order_by(models.Delineamento.created_at.desc()).all()

@router.post("/delineamentos", response_model=schemas.Delineamento)
def criar_delineamento(delineamento: schemas.DelineamentoCreate, db: Session = Depends(get_db)):
    db_delineamento = models.Delineamento(**delineamento.dict())
    db.add(db_delineamento)
    db.commit()
    db.refresh(db_delineamento)
    return db_delineamento

@router.post("/talhoes/{talhao_id}/delinear")
def gerar_delineamento(
    talhao_id: UUID,
    num_zonas: int = 3,
    indice_base: str = "ndvi",
    metodo: str = "kmeans",
    db: Session = Depends(get_db)
):
    """Gera delineamento automático baseado em índices de vegetação"""
    talhao = db.query(models.Talhao).filter(models.Talhao.id == talhao_id).first()
    if not talhao:
        raise HTTPException(status_code=404, detail="Talhão não encontrado")
    
    # Obter última imagem disponível
    imagem = db.query(models.ImagemSatelite).filter(
        models.ImagemSatelite.talhao_id == talhao_id,
        models.ImagemSatelite.processado == True
    ).order_by(models.ImagemSatelite.data_imagem.desc()).first()
    
    if not imagem:
        raise HTTPException(status_code=400, detail="Nenhuma imagem processada disponível para o talhão")
    
    # Gerar delineamento
    from src.utils.delineamento_service import DelineamentoService
    service = DelineamentoService()
    
    resultado = service.gerar_delineamento(
        talhao_id=str(talhao_id),
        indice_valor=getattr(imagem, f"{indice_base}_mean", 0.5),
        num_zonas=num_zonas,
        metodo=metodo
    )
    
    # Salvar delineamento
    delineamento = models.Delineamento(
        talhao_id=talhao_id,
        safra_id=talhao.safra_id,
        nome=f"Delineamento {indice_base.upper()} - {imagem.data_imagem}",
        metodo=metodo,
        num_zonas=num_zonas,
        indice_base=indice_base,
        estatisticas_zonas=resultado["estatisticas"],
        processado=True
    )
    db.add(delineamento)
    db.commit()
    db.refresh(delineamento)
    
    return {
        "sucesso": True,
        "delineamento_id": str(delineamento.id),
        "zonas": resultado["zonas"],
        "estatisticas": resultado["estatisticas"]
    }

@router.get("/delineamentos/{delineamento_id}/zonas")
def obter_zonas_delineamento(delineamento_id: UUID, db: Session = Depends(get_db)):
    """Retorna as zonas de manejo de um delineamento"""
    delineamento = db.query(models.Delineamento).filter(
        models.Delineamento.id == delineamento_id
    ).first()
    
    if not delineamento:
        raise HTTPException(status_code=404, detail="Delineamento não encontrado")
    
    return {
        "delineamento_id": str(delineamento_id),
        "num_zonas": delineamento.num_zonas,
        "indice_base": delineamento.indice_base,
        "estatisticas": delineamento.estatisticas_zonas,
        "zonas": delineamento.estatisticas_zonas.get("zonas", []) if delineamento.estatisticas_zonas else []
    }

# ==================== DASHBOARD ====================
@router.get("/dashboard")
def dashboard_produtividade(
    fazenda_id: UUID,
    safra_id: Optional[UUID] = None,
    db: Session = Depends(get_db)
):
    """Dashboard de produtividade da fazenda/safra"""
    # Talhões com predições
    query = db.query(models.Talhao).filter(models.Talhao.fazenda_id == fazenda_id)
    if safra_id:
        query = query.filter(models.Talhao.safra_id == safra_id)
    
    talhoes = query.all()
    
    # Estatísticas
    total_talhoes = len(talhoes)
    area_total = sum(t.area_hectares or 0 for t in talhoes)
    
    # Predições recentes
    predicoes = []
    for talhao in talhoes:
        predicao = db.query(models.PredicaoProdutividade).filter(
            models.PredicaoProdutividade.talhao_id == talhao.id
        ).order_by(models.PredicaoProdutividade.data_predicao.desc()).first()
        
        if predicao:
            predicoes.append({
                "talhao_id": str(talhao.id),
                "talhao_nome": talhao.nome,
                "area": talhao.area_hectares,
                "produtividade": predicao.produtividade_predita,
                "produtividade_total": predicao.produtividade_predita * talhao.area_hectares,
                "confianca": predicao.confianca
            })
    
    produtividade_media = sum(p["produtividade"] for p in predicoes) / len(predicoes) if predicoes else 0
    produtividade_total = sum(p["produtividade_total"] for p in predicoes)
    
    return {
        "total_talhoes": total_talhoes,
        "area_total_hectares": round(area_total, 2),
        "talhoes_com_predicao": len(predicoes),
        "produtividade_media_kg_ha": round(produtividade_media, 2),
        "produtividade_total_estimada_kg": round(produtividade_total, 2),
        "predicoes": predicoes
    }
