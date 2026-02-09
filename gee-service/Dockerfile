# Dockerfile para Serviço GEE Python - AgroFocus
# Substitui o serviço Node.js com bug na lib @google/earthengine v1.7.12
#
# NOTA: As credenciais do GEE devem ser montadas como volume:
#   docker run -v /path/to/gee-credentials.json:/app/credentials.json:ro ...
#
# Se as credenciais estiverem com problemas, gere novas em:
#   https://console.cloud.google.com/iam-admin/serviceaccounts

FROM python:3.11-slim

# Instala dependências do sistema
RUN apt-get update && apt-get install -y \
    gcc \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Define diretório de trabalho
WORKDIR /app

# Copia requirements primeiro (para cache de camadas Docker)
COPY requirements.txt .

# Instala dependências Python
RUN pip install --no-cache-dir -r requirements.txt

# Copia código da aplicação
COPY app.py .
COPY start.sh .

# Torna o script executável
RUN chmod +x start.sh

# Porta exposta
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5001/health')" || exit 1

# Comando de inicialização (usa gunicorn para produção)
CMD ["./start.sh"]
