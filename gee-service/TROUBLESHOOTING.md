# Guia de Solução de Problemas - GEE Python Service

## Erro: "Could not deserialize key data"

Se você receber o erro:
```
Could not deserialize key data. The data may be in an incorrect format...
```

Isso significa que o arquivo de credenciais JSON tem uma chave privada em formato incompatível com a biblioteca `cryptography` atual.

### Solução 1: Gerar Novas Credenciais

1. Acesse: https://console.cloud.google.com/iam-admin/serviceaccounts
2. Selecione seu projeto Earth Engine
3. Crie uma nova chave JSON para a service account:
   - Clique na service account
   - Vá em "Keys" → "Add Key" → "Create new key" → "JSON"
4. Substitua o arquivo:
   ```bash
   cp nova-chave.json /home/clawdbot_user/clawd/booster_agro/backend/config/gee-credentials.json
   ```

### Solução 2: Autenticação Interativa (para testes)

1. Rode no servidor:
   ```bash
   earthengine authenticate
   ```
2. Siga as instruções para autenticar via navegador
3. O serviço usará as credenciais do usuário automaticamente

### Solução 3: Verificar Formato da Chave

A chave privada no JSON deve ter este formato:
```json
"private_key": "-----BEGIN RSA PRIVATE KEY-----\nMII...\n-----END RSA PRIVATE KEY-----\n"
```

⚠️ **IMPORTANTE**: Nunca compartilhe ou comite este arquivo!

## Testando a Conexão

```bash
cd /home/clawdbot_user/clawd/booster_agro/gee-service
python3 -c "import ee; ee.Initialize(); print('OK')"
```

## Logs do Serviço

```bash
# Se rodando com gunicorn
tail -f /var/log/gee-service.log

# Se rodando com Docker
docker logs gee-python-service
```

## Verificar Permissões

```bash
ls -la /home/clawdbot_user/clawd/booster_agro/backend/config/gee-credentials.json
# Deve mostrar permissões de leitura para o usuário que roda o serviço
```
