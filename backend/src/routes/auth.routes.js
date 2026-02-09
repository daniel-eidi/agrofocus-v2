const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

// JWT Secret (em produção, usar variável de ambiente)
const JWT_SECRET = process.env.JWT_SECRET || 'agrofocus-secret-key-2024';
const JWT_EXPIRES_IN = '7d';

// Tipos de permissão
const PERMISSOES = {
  DONO: 'dono',           // Controle total, pode excluir fazenda e gerenciar permissões
  GERENTE: 'gerente',     // Editar dados, criar safras, talhões, gerenciar operadores
  OPERADOR: 'operador',   // Registrar atividades, ocorrências, usar equipamentos
  VISUALIZADOR: 'visualizador'  // Apenas visualizar dados
};

// Dados mockados de usuários - senha: admin123
// Hash gerado com bcrypt.hashSync('admin123', 10)
const SENHA_PADRAO_HASH = '$2b$10$Mee.5cGtcKmyXZe75/tQd.LRmUXa3d4mjRICssstn4NnL0eIrElcm';

let usuarios = [
  {
    id: '1',
    email: 'admin@agrofocus.com',
    senha_hash: SENHA_PADRAO_HASH,
    nome: 'Administrador',
    telefone: '(16) 99999-0000',
    perfil: 'admin',
    ativo: true,
    avatar_url: null,
    ultimo_acesso: new Date().toISOString(),
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    email: 'gerente@agrofocus.com',
    senha_hash: SENHA_PADRAO_HASH,
    nome: 'João Gerente',
    telefone: '(16) 99999-1111',
    perfil: 'gerente',
    ativo: true,
    avatar_url: null,
    ultimo_acesso: null,
    created_at: new Date().toISOString()
  },
  {
    id: '3',
    email: 'operador@agrofocus.com',
    senha_hash: SENHA_PADRAO_HASH,
    nome: 'Maria Operadora',
    telefone: '(16) 99999-2222',
    perfil: 'operador',
    ativo: true,
    avatar_url: null,
    ultimo_acesso: null,
    created_at: new Date().toISOString()
  }
];

// Fazendas com proprietário
let fazendas = [
  { 
    id: '1', 
    nome: 'Fazenda São João', 
    municipio: 'Ribeirão Preto', 
    estado: 'SP', 
    area_total: 150.5, 
    car: 'SP-123456',
    proprietario_id: '1',  // Dono é o admin
    created_at: new Date().toISOString()
  },
  { 
    id: '2', 
    nome: 'Fazenda Boa Vista', 
    municipio: 'Uberaba', 
    estado: 'MG', 
    area_total: 320.0, 
    car: 'MG-789012',
    proprietario_id: '2',  // Dono é o gerente
    created_at: new Date().toISOString()
  }
];

// Permissões de compartilhamento
let permissoesFazendas = [
  { id: '1', fazenda_id: '1', usuario_id: '2', permissao: PERMISSOES.GERENTE, convidado_por: '1', created_at: new Date().toISOString() },
  { id: '2', fazenda_id: '1', usuario_id: '3', permissao: PERMISSOES.OPERADOR, convidado_por: '1', created_at: new Date().toISOString() },
  { id: '3', fazenda_id: '2', usuario_id: '1', permissao: PERMISSOES.VISUALIZADOR, convidado_por: '2', created_at: new Date().toISOString() }
];

// Middleware de autenticação
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ sucesso: false, erro: 'Token não fornecido' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ sucesso: false, erro: 'Token inválido' });
  }
};

// Função para verificar permissão do usuário em uma fazenda
function getPermissaoFazenda(usuarioId, fazendaId) {
  // Verificar se é o dono
  const fazenda = fazendas.find(f => f.id === fazendaId);
  if (fazenda && fazenda.proprietario_id === usuarioId) {
    return PERMISSOES.DONO;
  }
  
  // Verificar permissão de compartilhamento
  const permissao = permissoesFazendas.find(
    p => p.fazenda_id === fazendaId && p.usuario_id === usuarioId
  );
  
  return permissao?.permissao || null;
}

// Função para obter todas as fazendas que o usuário tem acesso
function getFazendasUsuario(usuarioId) {
  // Fazendas onde é dono
  const fazendasDono = fazendas.filter(f => f.proprietario_id === usuarioId);
  
  // Fazendas compartilhadas
  const permissoes = permissoesFazendas.filter(p => p.usuario_id === usuarioId);
  const fazendasCompartilhadas = permissoes.map(p => {
    const fazenda = fazendas.find(f => f.id === p.fazenda_id);
    if (fazenda) {
      return {
        ...fazenda,
        minha_permissao: p.permissao,
        compartilhada: true
      };
    }
    return null;
  }).filter(Boolean);
  
  return [
    ...fazendasDono.map(f => ({ ...f, minha_permissao: PERMISSOES.DONO, compartilhada: false })),
    ...fazendasCompartilhadas
  ];
}

// Registro de novo usuário
router.post('/registro', async (req, res) => {
  try {
    const { email, senha, nome, telefone } = req.body;
    
    if (!email || !senha || !nome) {
      return res.status(400).json({ 
        sucesso: false, 
        erro: 'Email, senha e nome são obrigatórios' 
      });
    }
    
    const usuarioExistente = usuarios.find(u => u.email === email);
    if (usuarioExistente) {
      return res.status(400).json({ 
        sucesso: false, 
        erro: 'Email já cadastrado' 
      });
    }
    
    const senhaHash = await bcrypt.hash(senha, 10);
    
    const novoUsuario = {
      id: Date.now().toString(),
      email,
      senha_hash: senhaHash,
      nome,
      telefone: telefone || null,
      perfil: 'operador',
      ativo: true,
      avatar_url: null,
      ultimo_acesso: null,
      created_at: new Date().toISOString()
    };
    
    usuarios.push(novoUsuario);
    
    const token = jwt.sign(
      { id: novoUsuario.id, email: novoUsuario.email, nome: novoUsuario.nome, perfil: novoUsuario.perfil },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    res.status(201).json({
      sucesso: true,
      mensagem: 'Usuário criado com sucesso',
      usuario: {
        id: novoUsuario.id,
        email: novoUsuario.email,
        nome: novoUsuario.nome,
        perfil: novoUsuario.perfil,
        avatar_url: novoUsuario.avatar_url
      },
      token
    });
  } catch (err) {
    console.error('Erro no registro:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    
    if (!email || !senha) {
      return res.status(400).json({ 
        sucesso: false, 
        erro: 'Email e senha são obrigatórios' 
      });
    }
    
    const usuario = usuarios.find(u => u.email === email && u.ativo);
    
    if (!usuario) {
      return res.status(401).json({ 
        sucesso: false, 
        erro: 'Credenciais inválidas' 
      });
    }
    
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({ 
        sucesso: false, 
        erro: 'Credenciais inválidas' 
      });
    }
    
    usuario.ultimo_acesso = new Date().toISOString();
    
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, nome: usuario.nome, perfil: usuario.perfil },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    res.json({
      sucesso: true,
      mensagem: 'Login realizado com sucesso',
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        perfil: usuario.perfil,
        avatar_url: usuario.avatar_url
      },
      token
    });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

// Listar fazendas do usuário (próprias + compartilhadas)
router.get('/minhas-fazendas', authMiddleware, (req, res) => {
  const fazendasUsuario = getFazendasUsuario(req.usuario.id);
  res.json({
    sucesso: true,
    fazendas: fazendasUsuario
  });
});

// Criar nova fazenda (usuário vira dono automaticamente)
router.post('/fazendas', authMiddleware, async (req, res) => {
  try {
    const { nome, municipio, estado, area_total, car } = req.body;
    
    if (!nome) {
      return res.status(400).json({ sucesso: false, erro: 'Nome da fazenda é obrigatório' });
    }
    
    const novaFazenda = {
      id: Date.now().toString(),
      nome,
      municipio: municipio || '',
      estado: estado || '',
      area_total: area_total || 0,
      car: car || '',
      proprietario_id: req.usuario.id,
      created_at: new Date().toISOString()
    };
    
    fazendas.push(novaFazenda);
    
    res.status(201).json({
      sucesso: true,
      mensagem: 'Fazenda criada com sucesso',
      fazenda: {
        ...novaFazenda,
        minha_permissao: PERMISSOES.DONO,
        compartilhada: false
      }
    });
  } catch (err) {
    console.error('Erro ao criar fazenda:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

// Compartilhar fazenda com outro usuário
router.post('/fazendas/:fazendaId/compartilhar', authMiddleware, (req, res) => {
  const { fazendaId } = req.params;
  const { email_usuario, permissao } = req.body;
  
  // Verificar se a fazenda existe
  const fazenda = fazendas.find(f => f.id === fazendaId);
  if (!fazenda) {
    return res.status(404).json({ sucesso: false, erro: 'Fazenda não encontrada' });
  }
  
  // Verificar se o usuário é dono ou gerente
  const permissaoUsuario = getPermissaoFazenda(req.usuario.id, fazendaId);
  if (permissaoUsuario !== PERMISSOES.DONO && permissaoUsuario !== PERMISSOES.GERENTE) {
    return res.status(403).json({ sucesso: false, erro: 'Acesso negado' });
  }
  
  // Gerente não pode dar permissão de dono
  if (permissaoUsuario === PERMISSOES.GERENTE && permissao === PERMISSOES.DONO) {
    return res.status(403).json({ sucesso: false, erro: 'Gerente não pode conceder permissão de dono' });
  }
  
  // Buscar usuário a ser convidado
  const usuarioConvidado = usuarios.find(u => u.email === email_usuario);
  if (!usuarioConvidado) {
    return res.status(404).json({ sucesso: false, erro: 'Usuário não encontrado' });
  }
  
  // Verificar se já tem permissão
  const permissaoExistente = permissoesFazendas.find(
    p => p.fazenda_id === fazendaId && p.usuario_id === usuarioConvidado.id
  );
  
  if (permissaoExistente) {
    // Atualizar permissão
    permissaoExistente.permissao = permissao;
    permissaoExistente.updated_at = new Date().toISOString();
  } else {
    // Criar nova permissão
    permissoesFazendas.push({
      id: Date.now().toString(),
      fazenda_id: fazendaId,
      usuario_id: usuarioConvidado.id,
      permissao: permissao,
      convidado_por: req.usuario.id,
      created_at: new Date().toISOString()
    });
  }
  
  res.json({
    sucesso: true,
    mensagem: `Fazenda compartilhada com ${usuarioConvidado.nome} como ${permissao}`
  });
});

// Listar compartilhamentos de uma fazenda
router.get('/fazendas/:fazendaId/compartilhamentos', authMiddleware, (req, res) => {
  const { fazendaId } = req.params;
  
  const fazenda = fazendas.find(f => f.id === fazendaId);
  if (!fazenda) {
    return res.status(404).json({ sucesso: false, erro: 'Fazenda não encontrada' });
  }
  
  const permissaoUsuario = getPermissaoFazenda(req.usuario.id, fazendaId);
  if (!permissaoUsuario) {
    return res.status(403).json({ sucesso: false, erro: 'Acesso negado' });
  }
  
  const compartilhamentos = permissoesFazendas
    .filter(p => p.fazenda_id === fazendaId)
    .map(p => {
      const usuario = usuarios.find(u => u.id === p.usuario_id);
      const convidadoPor = usuarios.find(u => u.id === p.convidado_por);
      return {
        id: p.id,
        usuario: usuario ? { id: usuario.id, nome: usuario.nome, email: usuario.email } : null,
        permissao: p.permissao,
        convidado_por: convidadoPor ? { id: convidadoPor.id, nome: convidadoPor.nome } : null,
        created_at: p.created_at
      };
    });
  
  res.json({
    sucesso: true,
    compartilhamentos,
    minha_permissao: permissaoUsuario
  });
});

// Remover compartilhamento
router.delete('/fazendas/:fazendaId/compartilhar/:usuarioId', authMiddleware, (req, res) => {
  const { fazendaId, usuarioId } = req.params;
  
  const fazenda = fazendas.find(f => f.id === fazendaId);
  if (!fazenda) {
    return res.status(404).json({ sucesso: false, erro: 'Fazenda não encontrada' });
  }
  
  const permissaoUsuario = getPermissaoFazenda(req.usuario.id, fazendaId);
  
  // Dono pode remover qualquer um
  // Gerente pode remover operadores e visualizadores
  // Usuário pode remover a si mesmo
  const podeRemover = 
    permissaoUsuario === PERMISSOES.DONO ||
    (permissaoUsuario === PERMISSOES.GERENTE && req.usuario.id !== usuarioId) ||
    req.usuario.id === usuarioId;
  
  if (!podeRemover) {
    return res.status(403).json({ sucesso: false, erro: 'Acesso negado' });
  }
  
  const index = permissoesFazendas.findIndex(
    p => p.fazenda_id === fazendaId && p.usuario_id === usuarioId
  );
  
  if (index > -1) {
    permissoesFazendas.splice(index, 1);
    res.json({ sucesso: true, mensagem: 'Compartilhamento removido' });
  } else {
    res.status(404).json({ sucesso: false, erro: 'Compartilhamento não encontrado' });
  }
});

// Perfil do usuário logado
router.get('/perfil', authMiddleware, (req, res) => {
  const usuario = usuarios.find(u => u.id === req.usuario.id);
  
  if (!usuario) {
    return res.status(404).json({ sucesso: false, erro: 'Usuário não encontrado' });
  }
  
  res.json({
    sucesso: true,
    usuario: {
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      telefone: usuario.telefone,
      perfil: usuario.perfil,
      avatar_url: usuario.avatar_url,
      ultimo_acesso: usuario.ultimo_acesso,
      created_at: usuario.created_at
    }
  });
});

// Logout
router.post('/logout', authMiddleware, (req, res) => {
  res.json({ sucesso: true, mensagem: 'Logout realizado com sucesso' });
});

// Buscar usuários para convite (por email)
router.get('/usuarios/buscar', authMiddleware, (req, res) => {
  const { email } = req.query;
  
  if (!email || email.length < 3) {
    return res.status(400).json({ sucesso: false, erro: 'Digite pelo menos 3 caracteres' });
  }
  
  const encontrados = usuarios
    .filter(u => u.email.toLowerCase().includes(email.toLowerCase()) && u.id !== req.usuario.id)
    .map(u => ({
      id: u.id,
      email: u.email,
      nome: u.nome
    }));
  
  res.json({ sucesso: true, usuarios: encontrados });
});

module.exports = { 
  router, 
  authMiddleware, 
  getPermissaoFazenda, 
  getFazendasUsuario,
  PERMISSOES,
  fazendas,
  permissoesFazendas
};