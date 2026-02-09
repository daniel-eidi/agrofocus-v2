from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List, Optional
from uuid import UUID
from datetime import date, datetime
from src.config.database import get_db
from src.models import models, schemas

router = APIRouter(prefix="/api/v1/financeiro", tags=["financeiro"])

# ==================== DESPESAS ====================
@router.get("/despesas", response_model=List[schemas.DespesaComCategoria])
def listar_despesas(
    fazenda_id: Optional[UUID] = None,
    safra_id: Optional[UUID] = None,
    talhao_id: Optional[UUID] = None,
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Despesa).join(models.CategoriaDespesa)
    if fazenda_id:
        query = query.filter(models.Despesa.fazenda_id == fazenda_id)
    if safra_id:
        query = query.filter(models.Despesa.safra_id == safra_id)
    if talhao_id:
        query = query.filter(models.Despesa.talhao_id == talhao_id)
    if data_inicio:
        query = query.filter(models.Despesa.data_despesa >= data_inicio)
    if data_fim:
        query = query.filter(models.Despesa.data_despesa <= data_fim)
    return query.order_by(models.Despesa.data_despesa.desc()).all()

@router.post("/despesas", response_model=schemas.Despesa)
def criar_despesa(despesa: schemas.DespesaCreate, db: Session = Depends(get_db)):
    db_despesa = models.Despesa(**despesa.dict())
    db.add(db_despesa)
    db.commit()
    db.refresh(db_despesa)
    return db_despesa

@router.put("/despesas/{despesa_id}", response_model=schemas.Despesa)
def atualizar_despesa(despesa_id: UUID, despesa: schemas.DespesaUpdate, db: Session = Depends(get_db)):
    db_despesa = db.query(models.Despesa).filter(models.Despesa.id == despesa_id).first()
    if not db_despesa:
        raise HTTPException(status_code=404, detail="Despesa não encontrada")
    for key, value in despesa.dict(exclude_unset=True).items():
        setattr(db_despesa, key, value)
    db.commit()
    db.refresh(db_despesa)
    return db_despesa

@router.delete("/despesas/{despesa_id}")
def excluir_despesa(despesa_id: UUID, db: Session = Depends(get_db)):
    db_despesa = db.query(models.Despesa).filter(models.Despesa.id == despesa_id).first()
    if not db_despesa:
        raise HTTPException(status_code=404, detail="Despesa não encontrada")
    db.delete(db_despesa)
    db.commit()
    return {"sucesso": True, "mensagem": "Despesa excluída com sucesso"}

# ==================== RECEITAS ====================
@router.get("/receitas", response_model=List[schemas.Receita])
def listar_receitas(
    fazenda_id: Optional[UUID] = None,
    safra_id: Optional[UUID] = None,
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Receita)
    if fazenda_id:
        query = query.filter(models.Receita.fazenda_id == fazenda_id)
    if safra_id:
        query = query.filter(models.Receita.safra_id == safra_id)
    if data_inicio:
        query = query.filter(models.Receita.data_receita >= data_inicio)
    if data_fim:
        query = query.filter(models.Receita.data_receita <= data_fim)
    return query.order_by(models.Receita.data_receita.desc()).all()

@router.post("/receitas", response_model=schemas.Receita)
def criar_receita(receita: schemas.ReceitaCreate, db: Session = Depends(get_db)):
    db_receita = models.Receita(**receita.dict())
    db.add(db_receita)
    db.commit()
    db.refresh(db_receita)
    return db_receita

@router.put("/receitas/{receita_id}", response_model=schemas.Receita)
def atualizar_receita(receita_id: UUID, receita: schemas.ReceitaUpdate, db: Session = Depends(get_db)):
    db_receita = db.query(models.Receita).filter(models.Receita.id == receita_id).first()
    if not db_receita:
        raise HTTPException(status_code=404, detail="Receita não encontrada")
    for key, value in receita.dict(exclude_unset=True).items():
        setattr(db_receita, key, value)
    db.commit()
    db.refresh(db_receita)
    return db_receita

@router.delete("/receitas/{receita_id}")
def excluir_receita(receita_id: UUID, db: Session = Depends(get_db)):
    db_receita = db.query(models.Receita).filter(models.Receita.id == receita_id).first()
    if not db_receita:
        raise HTTPException(status_code=404, detail="Receita não encontrada")
    db.delete(db_receita)
    db.commit()
    return {"sucesso": True, "mensagem": "Receita excluída com sucesso"}

# ==================== CATEGORIAS ====================
@router.get("/categorias", response_model=List[schemas.CategoriaDespesa])
def listar_categorias(db: Session = Depends(get_db)):
    return db.query(models.CategoriaDespesa).all()

# ==================== RELATÓRIOS ====================
@router.get("/resumo")
def resumo_financeiro(
    fazenda_id: Optional[UUID] = None,
    safra_id: Optional[UUID] = None,
    db: Session = Depends(get_db)
):
    # Despesas por categoria
    query_despesas = db.query(
        models.CategoriaDespesa.nome,
        models.CategoriaDespesa.cor,
        func.sum(models.Despesa.valor).label('total')
    ).join(models.Despesa)
    
    if fazenda_id:
        query_despesas = query_despesas.filter(models.Despesa.fazenda_id == fazenda_id)
    if safra_id:
        query_despesas = query_despesas.filter(models.Despesa.safra_id == safra_id)
    
    despesas_categoria = query_despesas.group_by(
        models.CategoriaDespesa.nome,
        models.CategoriaDespesa.cor
    ).all()
    
    # Totais
    query_total_despesas = db.query(func.sum(models.Despesa.valor))
    query_total_receitas = db.query(func.sum(models.Receita.valor))
    
    if fazenda_id:
        query_total_despesas = query_total_despesas.filter(models.Despesa.fazenda_id == fazenda_id)
        query_total_receitas = query_total_receitas.filter(models.Receita.fazenda_id == fazenda_id)
    if safra_id:
        query_total_despesas = query_total_despesas.filter(models.Despesa.safra_id == safra_id)
        query_total_receitas = query_total_receitas.filter(models.Receita.safra_id == safra_id)
    
    total_despesas = query_total_despesas.scalar() or 0
    total_receitas = query_total_receitas.scalar() or 0
    
    # Evolução mensal
    evolucao = db.query(
        extract('year', models.Despesa.data_despesa).label('ano'),
        extract('month', models.Despesa.data_despesa).label('mes'),
        func.sum(models.Despesa.valor).label('despesas')
    )
    if fazenda_id:
        evolucao = evolucao.filter(models.Despesa.fazenda_id == fazenda_id)
    evolucao = evolucao.group_by('ano', 'mes').order_by('ano', 'mes').all()
    
    return {
        "total_despesas": total_despesas,
        "total_receitas": total_receitas,
        "saldo": total_receitas - total_despesas,
        "despesas_por_categoria": [
            {"nome": d.nome, "valor": d.total, "cor": d.cor}
            for d in despesas_categoria
        ],
        "evolucao_mensal": [
            {"ano": int(e.ano), "mes": int(e.mes), "despesas": e.despesas}
            for e in evolucao
        ]
    }

@router.get("/custo-por-talhao")
def custo_por_talhao(
    fazenda_id: Optional[UUID] = None,
    safra_id: Optional[UUID] = None,
    db: Session = Depends(get_db)
):
    query = db.query(
        models.Talhao.id,
        models.Talhao.nome,
        models.Talhao.codigo,
        func.sum(models.Despesa.valor).label('custo_total')
    ).join(models.Despesa, models.Talhao.id == models.Despesa.talhao_id, isouter=True)
    
    if fazenda_id:
        query = query.filter(models.Talhao.fazenda_id == fazenda_id)
    if safra_id:
        query = query.filter(models.Despesa.safra_id == safra_id)
    
    resultados = query.group_by(models.Talhao.id, models.Talhao.nome, models.Talhao.codigo).all()
    
    return [
        {
            "talhao_id": r.id,
            "nome": r.nome,
            "codigo": r.codigo,
            "custo_total": r.custo_total or 0
        }
        for r in resultados
    ]
