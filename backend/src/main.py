from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from src.config.database import engine, Base
from src.routes import (
    cadastros, financeiro, atividades, ocorrencias,
    estoque, monitoramento, meteorologia, produtividade
)

# Criar tabelas
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Iniciando AgroFocus API...")
    yield
    # Shutdown
    print("Encerrando AgroFocus API...")

app = FastAPI(
    title="AgroFocus API",
    description="Sistema de Gestão Agrícola Inteligente",
    version="2.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir rotas
app.include_router(cadastros.router)
app.include_router(financeiro.router)
app.include_router(atividades.router)
app.include_router(ocorrencias.router)
app.include_router(estoque.router)
app.include_router(monitoramento.router)
app.include_router(meteorologia.router)
app.include_router(produtividade.router)

# Dashboard
@app.get("/api/v1/dashboard/resumo")
def dashboard_resumo():
    return {
        "mensagem": "Dashboard em desenvolvimento",
        "modulos": [
            "cadastros",
            "financeiro", 
            "atividades",
            "ocorrencias",
            "estoque",
            "monitoramento",
            "meteorologia",
            "produtividade"
        ]
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "versao": "2.0.0"}

@app.get("/")
def root():
    return {
        "nome": "AgroFocus API",
        "versao": "2.0.0",
        "docs": "/docs",
        "modulos": {
            "cadastros": "/api/v1/fazendas",
            "financeiro": "/api/v1/financeiro",
            "atividades": "/api/v1/atividades",
            "ocorrencias": "/api/v1/ocorrencias",
            "estoque": "/api/v1/estoque",
            "monitoramento": "/api/v1/monitoramento",
            "meteorologia": "/api/v1/meteorologia",
            "produtividade": "/api/v1/produtividade"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
