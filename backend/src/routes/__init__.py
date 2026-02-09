from .cadastros import router as cadastros_router
from .financeiro import router as financeiro_router
from .atividades import router as atividades_router
from .ocorrencias import router as ocorrencias_router
from .estoque import router as estoque_router
from .monitoramento import router as monitoramento_router
from .meteorologia import router as meteorologia_router
from .produtividade import router as produtividade_router

__all__ = [
    "cadastros_router",
    "financeiro_router",
    "atividades_router",
    "ocorrencias_router",
    "estoque_router",
    "monitoramento_router",
    "meteorologia_router",
    "produtividade_router"
]
