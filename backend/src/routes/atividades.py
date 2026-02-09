from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
from uuid import UUID
from datetime import date, datetime, timedelta
from src.config.database import get_db
from src.models import models, schemas

router = APIRouter(prefix="/api/v1/atividades", tags=["atividades"])

# ==================== ATIVIDADES ====================
@router.get("/", response_model=List[schemas.AtividadeComRelacionamentos])
def listar_atividades(
    fazenda_id: Optional[UUID] = None,
    safra_id: Optional[UUID] = None,
    talhao_id: Optional[UUID] = None,
    operador_id: Optional[UUID] = None,
    equipamento_id: Optional[UUID] = None,
    status: Optional[str] = None,
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Atividade)
    
    if fazenda_id:
        query = query.filter(models.Atividade.fazenda_id == fazenda_id)
    if safra_id:
        query = query.filter(models.Atividade.safra_id == safra_id)
    if talhao_id:
        query = query.filter(models.Atividade.talhao_id == talhao_id)
    if operador_id:
        query = query.filter(models.Atividade.operador_id == operador_id)
    if equipamento_id:
        query = query.filter(models.Atividade.equipamento_id == equipamento_id)
    if status:
        query = query.filter(models.Atividade.status == status)
    if data_inicio:
        query = query.filter(models.Atividade.data_inicio >= datetime.combine(data_inicio, datetime.min.time()))
    if data_fim:
        query = query.filter(models.Atividade.data_inicio <= datetime.combine(data_fim, datetime.max.time()))
    
    return query.order_by(models.Atividade.data_inicio.desc()).all()

@router.get("/calendario")
def atividades_calendario(
    fazenda_id: Optional[UUID] = None,
    safra_id: Optional[UUID] = None,
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Atividade, models.TipoAtividade).join(
        models.TipoAtividade, models.Atividade.tipo_atividade_id == models.TipoAtividade.id, isouter=True
    )
    
    if fazenda_id:
        query = query.filter(models.Atividade.fazenda_id == fazenda_id)
    if safra_id:
        query = query.filter(models.Atividade.safra_id == safra_id)
    if data_inicio:
        query = query.filter(models.Atividade.data_inicio >= datetime.combine(data_inicio, datetime.min.time()))
    if data_fim:
        query = query.filter(models.Atividade.data_inicio <= datetime.combine(data_fim, datetime.max.time()))
    
    atividades = query.all()
    
    eventos = []
    for atividade, tipo in atividades:
        evento = {
            "id": str(atividade.id),
            "title": atividade.titulo,
            "start": atividade.data_inicio.isoformat(),
            "end": atividade.data_fim.isoformat() if atividade.data_fim else None,
            "color": tipo.cor if tipo else "#3788d8",
            "extendedProps": {
                "descricao": atividade.descricao,
                "status": atividade.status,
                "talhao_id": str(atividade.talhao_id) if atividade.talhao_id else None,
                "operador_id": str(atividade.operador_id) if atividade.operador_id else None,
                "equipamento_id": str(atividade.equipamento_id) if atividade.equipamento_id else None,
                "prioridade": atividade.prioridade
            }
        }
        eventos.append(evento)
    
    return eventos

@router.post("/", response_model=schemas.Atividade)
def criar_atividade(atividade: schemas.AtividadeCreate, db: Session = Depends(get_db)):
    db_atividade = models.Atividade(**atividade.dict())
    db.add(db_atividade)
    db.commit()
    db.refresh(db_atividade)
    return db_atividade

@router.put("/{atividade_id}", response_model=schemas.Atividade)
def atualizar_atividade(atividade_id: UUID, atividade: schemas.AtividadeUpdate, db: Session = Depends(get_db)):
    db_atividade = db.query(models.Atividade).filter(models.Atividade.id == atividade_id).first()
    if not db_atividade:
        raise HTTPException(status_code=404, detail="Atividade não encontrada")
    for key, value in atividade.dict(exclude_unset=True).items():
        setattr(db_atividade, key, value)
    db.commit()
    db.refresh(db_atividade)
    return db_atividade

@router.patch("/{atividade_id}/iniciar")
def iniciar_atividade(atividade_id: UUID, db: Session = Depends(get_db)):
    db_atividade = db.query(models.Atividade).filter(models.Atividade.id == atividade_id).first()
    if not db_atividade:
        raise HTTPException(status_code=404, detail="Atividade não encontrada")
    db_atividade.status = "em_andamento"
    db_atividade.data_inicio = datetime.now()
    db.commit()
    return {"sucesso": True, "mensagem": "Atividade iniciada"}

@router.patch("/{atividade_id}/finalizar")
def finalizar_atividade(
    atividade_id: UUID,
    produtividade: Optional[float] = None,
    observacoes: Optional[str] = None,
    db: Session = Depends(get_db)
):
    db_atividade = db.query(models.Atividade).filter(models.Atividade.id == atividade_id).first()
    if not db_atividade:
        raise HTTPException(status_code=404, detail="Atividade não encontrada")
    db_atividade.status = "concluida"
    db_atividade.data_fim = datetime.now()
    if produtividade:
        db_atividade.produtividade_apontada = produtividade
    if observacoes:
        db_atividade.observacoes = observacoes
    db.commit()
    return {"sucesso": True, "mensagem": "Atividade finalizada"}

@router.delete("/{atividade_id}")
def excluir_atividade(atividade_id: UUID, db: Session = Depends(get_db)):
    db_atividade = db.query(models.Atividade).filter(models.Atividade.id == atividade_id).first()
    if not db_atividade:
        raise HTTPException(status_code=404, detail="Atividade não encontrada")
    db.delete(db_atividade)
    db.commit()
    return {"sucesso": True, "mensagem": "Atividade excluída com sucesso"}

# ==================== ESTATÍSTICAS ====================
@router.get("/estatisticas/resumo")
def estatisticas_atividades(
    fazenda_id: Optional[UUID] = None,
    safra_id: Optional[UUID] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Atividade)
    if fazenda_id:
        query = query.filter(models.Atividade.fazenda_id == fazenda_id)
    if safra_id:
        query = query.filter(models.Atividade.safra_id == safra_id)
    
    total = query.count()
    pendentes = query.filter(models.Atividade.status == "pendente").count()
    em_andamento = query.filter(models.Atividade.status == "em_andamento").count()
    concluidas = query.filter(models.Atividade.status == "concluida").count()
    
    # Atividades por tipo
    from sqlalchemy import func
    por_tipo = db.query(
        models.TipoAtividade.nome,
        func.count(models.Atividade.id).label('quantidade')
    ).join(
        models.Atividade, models.Atividade.tipo_atividade_id == models.TipoAtividade.id, isouter=True
    )
    if fazenda_id:
        por_tipo = por_tipo.filter(models.Atividade.fazenda_id == fazenda_id)
    por_tipo = por_tipo.group_by(models.TipoAtividade.nome).all()
    
    return {
        "total": total,
        "pendentes": pendentes,
        "em_andamento": em_andamento,
        "concluidas": concluidas,
        "por_tipo": [{"tipo": p.nome, "quantidade": p.quantidade} for p in por_tipo]
    }
