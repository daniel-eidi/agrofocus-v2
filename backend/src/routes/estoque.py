from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from src.config.database import get_db
from src.models import models, schemas

router = APIRouter(prefix="/api/v1/estoque", tags=["estoque"])

# ==================== INSUMOS ====================
@router.get("/insumos", response_model=List[schemas.Insumo])
def listar_insumos(
    fazenda_id: Optional[UUID] = None,
    tipo: Optional[str] = None,
    categoria: Optional[str] = None,
    ativo: Optional[bool] = None,
    baixo_estoque: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Insumo)
    if fazenda_id:
        query = query.filter(models.Insumo.fazenda_id == fazenda_id)
    if tipo:
        query = query.filter(models.Insumo.tipo == tipo)
    if categoria:
        query = query.filter(models.Insumo.categoria == categoria)
    if ativo is not None:
        query = query.filter(models.Insumo.ativo == ativo)
    if baixo_estoque:
        query = query.filter(models.Insumo.quantidade_atual <= models.Insumo.quantidade_minima)
    
    return query.order_by(models.Insumo.nome).all()

@router.post("/insumos", response_model=schemas.Insumo)
def criar_insumo(insumo: schemas.InsumoCreate, db: Session = Depends(get_db)):
    db_insumo = models.Insumo(**insumo.dict())
    db.add(db_insumo)
    db.commit()
    db.refresh(db_insumo)
    return db_insumo

@router.put("/insumos/{insumo_id}", response_model=schemas.Insumo)
def atualizar_insumo(insumo_id: UUID, insumo: schemas.InsumoUpdate, db: Session = Depends(get_db)):
    db_insumo = db.query(models.Insumo).filter(models.Insumo.id == insumo_id).first()
    if not db_insumo:
        raise HTTPException(status_code=404, detail="Insumo não encontrado")
    for key, value in insumo.dict(exclude_unset=True).items():
        setattr(db_insumo, key, value)
    db.commit()
    db.refresh(db_insumo)
    return db_insumo

@router.delete("/insumos/{insumo_id}")
def excluir_insumo(insumo_id: UUID, db: Session = Depends(get_db)):
    db_insumo = db.query(models.Insumo).filter(models.Insumo.id == insumo_id).first()
    if not db_insumo:
        raise HTTPException(status_code=404, detail="Insumo não encontrado")
    db.delete(db_insumo)
    db.commit()
    return {"sucesso": True, "mensagem": "Insumo excluído com sucesso"}

# ==================== MOVIMENTAÇÕES ====================
@router.get("/movimentacoes", response_model=List[schemas.MovimentacaoEstoque])
def listar_movimentacoes(
    insumo_id: Optional[UUID] = None,
    tipo: Optional[str] = None,
    data_inicio: Optional[datetime] = None,
    data_fim: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.MovimentacaoEstoque)
    if insumo_id:
        query = query.filter(models.MovimentacaoEstoque.insumo_id == insumo_id)
    if tipo:
        query = query.filter(models.MovimentacaoEstoque.tipo == tipo)
    if data_inicio:
        query = query.filter(models.MovimentacaoEstoque.data_movimentacao >= data_inicio)
    if data_fim:
        query = query.filter(models.MovimentacaoEstoque.data_movimentacao <= data_fim)
    
    return query.order_by(models.MovimentacaoEstoque.data_movimentacao.desc()).all()

@router.post("/movimentacoes/entrada", response_model=schemas.MovimentacaoEstoque)
def registrar_entrada(movimentacao: schemas.MovimentacaoEstoqueCreate, db: Session = Depends(get_db)):
    insumo = db.query(models.Insumo).filter(models.Insumo.id == movimentacao.insumo_id).first()
    if not insumo:
        raise HTTPException(status_code=404, detail="Insumo não encontrado")
    
    quantidade_anterior = insumo.quantidade_atual
    quantidade_nova = quantidade_anterior + movimentacao.quantidade
    
    db_movimentacao = models.MovimentacaoEstoque(
        **movimentacao.dict(),
        quantidade_anterior=quantidade_anterior,
        quantidade_nova=quantidade_nova
    )
    
    insumo.quantidade_atual = quantidade_nova
    
    # Atualizar preço médio
    if movimentacao.valor_total and movimentacao.quantidade > 0:
        valor_unitario = movimentacao.valor_total / movimentacao.quantidade
        if insumo.preco_medio:
            # Média ponderada simples
            insumo.preco_medio = (insumo.preco_medio + valor_unitario) / 2
        else:
            insumo.preco_medio = valor_unitario
    
    db.add(db_movimentacao)
    db.commit()
    db.refresh(db_movimentacao)
    return db_movimentacao

@router.post("/movimentacoes/saida", response_model=schemas.MovimentacaoEstoque)
def registrar_saida(movimentacao: schemas.MovimentacaoEstoqueCreate, db: Session = Depends(get_db)):
    insumo = db.query(models.Insumo).filter(models.Insumo.id == movimentacao.insumo_id).first()
    if not insumo:
        raise HTTPException(status_code=404, detail="Insumo não encontrado")
    
    if insumo.quantidade_atual < movimentacao.quantidade:
        raise HTTPException(status_code=400, detail="Quantidade insuficiente em estoque")
    
    quantidade_anterior = insumo.quantidade_atual
    quantidade_nova = quantidade_anterior - movimentacao.quantidade
    
    db_movimentacao = models.MovimentacaoEstoque(
        **movimentacao.dict(),
        quantidade_anterior=quantidade_anterior,
        quantidade_nova=quantidade_nova,
        valor_unitario=insumo.preco_medio,
        valor_total=insumo.preco_medio * movimentacao.quantidadelacao if insumo.preco_medio else None
    )
    
    insumo.quantidade_atual = quantidade_nova
    
    db.add(db_movimentacao)
    db.commit()
    db.refresh(db_movimentacao)
    return db_movimentacao

# ==================== ALERTAS ====================
@router.get("/alertas")
def alertas_estoque(
    fazenda_id: Optional[UUID] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Insumo).filter(
        models.Insumo.quantidade_atual <= models.Insumo.quantidade_minima,
        models.Insumo.ativo == True
    )
    if fazenda_id:
        query = query.filter(models.Insumo.fazenda_id == fazenda_id)
    
    insumos_baixo = query.all()
    
    return [
        {
            "insumo_id": str(i.id),
            "nome": i.nome,
            "quantidade_atual": i.quantidade_atual,
            "quantidade_minima": i.quantidade_minima,
            "unidade_medida": i.unidade_medida,
            "mensagem": f"{i.nome} está com estoque baixo ({i.quantidade_atual} {i.unidade_medida})"
        }
        for i in insumos_baixo
    ]

# ==================== RESUMO ====================
@router.get("/resumo")
def resumo_estoque(
    fazenda_id: Optional[UUID] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Insumo)
    if fazenda_id:
        query = query.filter(models.Insumo.fazenda_id == fazenda_id)
    
    total_insumos = query.count()
    ativos = query.filter(models.Insumo.ativo == True).count()
    baixo_estoque = query.filter(
        models.Insumo.quantidade_atual <= models.Insumo.quantidade_minima
    ).count()
    
    # Valor total do estoque
    valor_total = db.query(
        func.sum(models.Insumo.quantidade_atual * models.Insumo.preco_medio)
    ).filter(models.Insumo.ativo == True)
    if fazenda_id:
        valor_total = valor_total.filter(models.Insumo.fazenda_id == fazenda_id)
    
    # Por categoria
    por_categoria = query.with_entities(
        models.Insumo.categoria,
        func.count(models.Insumo.id).label('quantidade'),
        func.sum(models.Insumo.quantidade_atual).label('total')
    ).filter(models.Insumo.ativo == True).group_by(models.Insumo.categoria).all()
    
    return {
        "total_insumos": total_insumos,
        "ativos": ativos,
        "baixo_estoque": baixo_estoque,
        "valor_total": valor_total.scalar() or 0,
        "por_categoria": [
            {"categoria": p.categoria, "quantidade": p.quantidade, "total": p.total or 0}
            for p in por_categoria
        ]
    }
