from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from src.config.database import get_db
from src.models import models, schemas
from src.utils.gee_service import GEEService

router = APIRouter(prefix="/api/v1", tags=["cadastros"])

# ==================== FAZENDAS ====================
@router.get("/fazendas", response_model=List[schemas.Fazenda])
def listar_fazendas(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.Fazenda).offset(skip).limit(limit).all()

@router.get("/fazendas/{fazenda_id}", response_model=schemas.Fazenda)
def obter_fazenda(fazenda_id: UUID, db: Session = Depends(get_db)):
    fazenda = db.query(models.Fazenda).filter(models.Fazenda.id == fazenda_id).first()
    if not fazenda:
        raise HTTPException(status_code=404, detail="Fazenda não encontrada")
    return fazenda

@router.post("/fazendas", response_model=schemas.Fazenda)
def criar_fazenda(fazenda: schemas.FazendaCreate, db: Session = Depends(get_db)):
    db_fazenda = models.Fazenda(**fazenda.dict())
    db.add(db_fazenda)
    db.commit()
    db.refresh(db_fazenda)
    return db_fazenda

@router.put("/fazendas/{fazenda_id}", response_model=schemas.Fazenda)
def atualizar_fazenda(fazenda_id: UUID, fazenda: schemas.FazendaUpdate, db: Session = Depends(get_db)):
    db_fazenda = db.query(models.Fazenda).filter(models.Fazenda.id == fazenda_id).first()
    if not db_fazenda:
        raise HTTPException(status_code=404, detail="Fazenda não encontrada")
    for key, value in fazenda.dict(exclude_unset=True).items():
        setattr(db_fazenda, key, value)
    db.commit()
    db.refresh(db_fazenda)
    return db_fazenda

@router.delete("/fazendas/{fazenda_id}")
def excluir_fazenda(fazenda_id: UUID, db: Session = Depends(get_db)):
    db_fazenda = db.query(models.Fazenda).filter(models.Fazenda.id == fazenda_id).first()
    if not db_fazenda:
        raise HTTPException(status_code=404, detail="Fazenda não encontrada")
    db.delete(db_fazenda)
    db.commit()
    return {"sucesso": True, "mensagem": "Fazenda excluída com sucesso"}

# ==================== SAFRAS ====================
@router.get("/safras", response_model=List[schemas.Safra])
def listar_safras(fazenda_id: Optional[UUID] = None, db: Session = Depends(get_db)):
    query = db.query(models.Safra)
    if fazenda_id:
        query = query.filter(models.Safra.fazenda_id == fazenda_id)
    return query.all()

@router.post("/safras", response_model=schemas.Safra)
def criar_safra(safra: schemas.SafraCreate, db: Session = Depends(get_db)):
    db_safra = models.Safra(**safra.dict())
    db.add(db_safra)
    db.commit()
    db.refresh(db_safra)
    return db_safra

@router.put("/safras/{safra_id}", response_model=schemas.Safra)
def atualizar_safra(safra_id: UUID, safra: schemas.SafraUpdate, db: Session = Depends(get_db)):
    db_safra = db.query(models.Safra).filter(models.Safra.id == safra_id).first()
    if not db_safra:
        raise HTTPException(status_code=404, detail="Safra não encontrada")
    for key, value in safra.dict(exclude_unset=True).items():
        setattr(db_safra, key, value)
    db.commit()
    db.refresh(db_safra)
    return db_safra

@router.delete("/safras/{safra_id}")
def excluir_safra(safra_id: UUID, db: Session = Depends(get_db)):
    db_safra = db.query(models.Safra).filter(models.Safra.id == safra_id).first()
    if not db_safra:
        raise HTTPException(status_code=404, detail="Safra não encontrada")
    db.delete(db_safra)
    db.commit()
    return {"sucesso": True, "mensagem": "Safra excluída com sucesso"}

# ==================== TALHÕES ====================
@router.get("/talhoes", response_model=List[schemas.TalhaoComGeo])
def listar_talhoes(fazenda_id: Optional[UUID] = None, safra_id: Optional[UUID] = None, db: Session = Depends(get_db)):
    query = db.query(models.Talhao)
    if fazenda_id:
        query = query.filter(models.Talhao.fazenda_id == fazenda_id)
    if safra_id:
        query = query.filter(models.Talhao.safra_id == safra_id)
    return query.all()

@router.get("/talhoes/{talhao_id}", response_model=schemas.TalhaoComGeo)
def obter_talhao(talhao_id: UUID, db: Session = Depends(get_db)):
    talhao = db.query(models.Talhao).filter(models.Talhao.id == talhao_id).first()
    if not talhao:
        raise HTTPException(status_code=404, detail="Talhão não encontrado")
    return talhao

@router.post("/talhoes", response_model=schemas.TalhaoComGeo)
def criar_talhao(talhao: schemas.TalhaoCreate, db: Session = Depends(get_db)):
    talhao_data = talhao.dict(exclude={'geojson_poligono'})
    db_talhao = models.Talhao(**talhao_data)
    db.add(db_talhao)
    db.commit()
    db.refresh(db_talhao)
    return db_talhao

@router.put("/talhoes/{talhao_id}", response_model=schemas.TalhaoComGeo)
def atualizar_talhao(talhao_id: UUID, talhao: schemas.TalhaoUpdate, db: Session = Depends(get_db)):
    db_talhao = db.query(models.Talhao).filter(models.Talhao.id == talhao_id).first()
    if not db_talhao:
        raise HTTPException(status_code=404, detail="Talhão não encontrado")
    for key, value in talhao.dict(exclude_unset=True).items():
        setattr(db_talhao, key, value)
    db.commit()
    db.refresh(db_talhao)
    return db_talhao

@router.delete("/talhoes/{talhao_id}")
def excluir_talhao(talhao_id: UUID, db: Session = Depends(get_db)):
    db_talhao = db.query(models.Talhao).filter(models.Talhao.id == talhao_id).first()
    if not db_talhao:
        raise HTTPException(status_code=404, detail="Talhão não encontrado")
    db.delete(db_talhao)
    db.commit()
    return {"sucesso": True, "mensagem": "Talhão excluído com sucesso"}

# ==================== OPERADORES ====================
@router.get("/operadores", response_model=List[schemas.Operador])
def listar_operadores(fazenda_id: Optional[UUID] = None, db: Session = Depends(get_db)):
    query = db.query(models.Operador)
    if fazenda_id:
        query = query.filter(models.Operador.fazenda_id == fazenda_id)
    return query.all()

@router.post("/operadores", response_model=schemas.Operador)
def criar_operador(operador: schemas.OperadorCreate, db: Session = Depends(get_db)):
    db_operador = models.Operador(**operador.dict())
    db.add(db_operador)
    db.commit()
    db.refresh(db_operador)
    return db_operador

@router.put("/operadores/{operador_id}", response_model=schemas.Operador)
def atualizar_operador(operador_id: UUID, operador: schemas.OperadorUpdate, db: Session = Depends(get_db)):
    db_operador = db.query(models.Operador).filter(models.Operador.id == operador_id).first()
    if not db_operador:
        raise HTTPException(status_code=404, detail="Operador não encontrado")
    for key, value in operador.dict(exclude_unset=True).items():
        setattr(db_operador, key, value)
    db.commit()
    db.refresh(db_operador)
    return db_operador

@router.delete("/operadores/{operador_id}")
def excluir_operador(operador_id: UUID, db: Session = Depends(get_db)):
    db_operador = db.query(models.Operador).filter(models.Operador.id == operador_id).first()
    if not db_operador:
        raise HTTPException(status_code=404, detail="Operador não encontrado")
    db.delete(db_operador)
    db.commit()
    return {"sucesso": True, "mensagem": "Operador excluído com sucesso"}

# ==================== EQUIPAMENTOS ====================
@router.get("/equipamentos", response_model=List[schemas.Equipamento])
def listar_equipamentos(fazenda_id: Optional[UUID] = None, db: Session = Depends(get_db)):
    query = db.query(models.Equipamento)
    if fazenda_id:
        query = query.filter(models.Equipamento.fazenda_id == fazenda_id)
    return query.all()

@router.post("/equipamentos", response_model=schemas.Equipamento)
def criar_equipamento(equipamento: schemas.EquipamentoCreate, db: Session = Depends(get_db)):
    db_equipamento = models.Equipamento(**equipamento.dict())
    db.add(db_equipamento)
    db.commit()
    db.refresh(db_equipamento)
    return db_equipamento

@router.put("/equipamentos/{equipamento_id}", response_model=schemas.Equipamento)
def atualizar_equipamento(equipamento_id: UUID, equipamento: schemas.EquipamentoUpdate, db: Session = Depends(get_db)):
    db_equipamento = db.query(models.Equipamento).filter(models.Equipamento.id == equipamento_id).first()
    if not db_equipamento:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado")
    for key, value in equipamento.dict(exclude_unset=True).items():
        setattr(db_equipamento, key, value)
    db.commit()
    db.refresh(db_equipamento)
    return db_equipamento

@router.delete("/equipamentos/{equipamento_id}")
def excluir_equipamento(equipamento_id: UUID, db: Session = Depends(get_db)):
    db_equipamento = db.query(models.Equipamento).filter(models.Equipamento.id == equipamento_id).first()
    if not db_equipamento:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado")
    db.delete(db_equipamento)
    db.commit()
    return {"sucesso": True, "mensagem": "Equipamento excluído com sucesso"}

# ==================== TIPOS DE ATIVIDADES ====================
@router.get("/tipos-atividades", response_model=List[schemas.TipoAtividade])
def listar_tipos_atividades(db: Session = Depends(get_db)):
    return db.query(models.TipoAtividade).all()
