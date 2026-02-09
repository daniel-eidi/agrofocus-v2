/**
 * AgroFocus - Auth Routes (PostgreSQL)
 * Rotas de autenticação e gerenciamento de fazendas
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

const { Usuario, Fazenda, Permissao } = require('../models/db.models');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'agrofocus-secret-key-2024';
const JWT_EXPIRES_IN = '7d';

// Tipos de permissão
const PERMISSOES = {
  DONO: 'dono',
  GERENTE: 'gerente',
  OPERADOR: 'operador',
  VISUALIZADOR: 'visualizador'
};

// Middleware de autenticação
const authMiddleware = async (req, res, next) => {
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
async function getPermissaoFazenda(usuarioId, fazendaId) {
  return await Permissao.getPermissao(usuarioId, fazendaId);
}

// Função para obter todas as fazendas que o usuário tem acesso
async function getFazendasUsuario(usuarioId) {
  return await Fazenda.findByUsuario(usuarioId);
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
    
    const usuarioExistente = await Usuario.findByEmail(email);
    if (usuarioExistente) {
      return res.status(400).json({ 
        sucesso: false, 
        erro: 'Email já cadastrado' 
      });
    }
    
    const senhaHash = await bcrypt.hash(senha, 10);
    
    const novoUsuario = await Usuario.create({
      email,
      senha_hash: senhaHash,
      nome,
      telefone: telefone || null,
      perfil: 'operador'
    });
    
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
    
    const usuario = await Usuario.findByEmail(email);
    
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
    
    await Usuario.updateUltimoAcesso(usuario.id);
    
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
router.get('/minhas-fazendas', authMiddleware, async (req, res) => {
  try {
    const fazendasUsuario = await getFazendasUsuario(req.usuario.id);
    res.json({
      sucesso: true,
      fazendas: fazendasUsuario
    });
  } catch (err) {
    console.error('Erro ao listar fazendas:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

// Criar nova fazenda (usuário vira dono automaticamente)
router.post('/fazendas', authMiddleware, async (req, res) => {
  try {
    const { nome, municipio, estado, area_total, car, geometria } = req.body;
    
    if (!nome) {
      return res.status(400).json({ sucesso: false, erro: 'Nome da fazenda é obrigatório' });
    }
    
    const novaFazenda = await Fazenda.create({
      nome,
      municipio: municipio || '',
      estado: estado || '',
      area_total: area_total || 0,
      car: car || '',
      proprietario_id: req.usuario.id,
      geometria
    });
    
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
router.post('/fazendas/:fazendaId/compartilhar', authMiddleware, async (req, res) => {
  try {
    const { fazendaId } = req.params;
    const { email_usuario, permissao } = req.body;
    
    // Verificar se a fazenda existe
    const fazenda = await Fazenda.findById(fazendaId);
    if (!fazenda) {
      return res.status(404).json({ sucesso: false, erro: 'Fazenda não encontrada' });
    }
    
    // Verificar se o usuário é dono ou gerente
    const permissaoUsuario = await getPermissaoFazenda(req.usuario.id, fazendaId);
    if (permissaoUsuario !== PERMISSOES.DONO && permissaoUsuario !== PERMISSOES.GERENTE) {
      return res.status(403).json({ sucesso: false, erro: 'Acesso negado' });
    }
    
    // Gerente não pode dar permissão de dono
    if (permissaoUsuario === PERMISSOES.GERENTE && permissao === PERMISSOES.DONO) {
      return res.status(403).json({ sucesso: false, erro: 'Gerente não pode conceder permissão de dono' });
    }
    
    // Buscar usuário a ser convidado
    const usuarioConvidado = await Usuario.findByEmail(email_usuario);
    if (!usuarioConvidado) {
      return res.status(404).json({ sucesso: false, erro: 'Usuário não encontrado' });
    }
    
    // Criar/atualizar permissão
    await Permissao.create({
      fazenda_id: parseInt(fazendaId),
      usuario_id: usuarioConvidado.id,
      permissao: permissao,
      convidado_por: req.usuario.id
    });
    
    res.json({
      sucesso: true,
      mensagem: `Fazenda compartilhada com ${usuarioConvidado.nome} como ${permissao}`
    });
  } catch (err) {
    console.error('Erro ao compartilhar fazenda:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

// Listar compartilhamentos de uma fazenda
router.get('/fazendas/:fazendaId/compartilhamentos', authMiddleware, async (req, res) => {
  try {
    const { fazendaId } = req.params;
    
    const fazenda = await Fazenda.findById(fazendaId);
    if (!fazenda) {
      return res.status(404).json({ sucesso: false, erro: 'Fazenda não encontrada' });
    }
    
    const permissaoUsuario = await getPermissaoFazenda(req.usuario.id, fazendaId);
    if (!permissaoUsuario) {
      return res.status(403).json({ sucesso: false, erro: 'Acesso negado' });
    }
    
    const compartilhamentos = await Permissao.findByFazenda(fazendaId);
    
    res.json({
      sucesso: true,
      compartilhamentos: compartilhamentos.map(c => ({
        id: c.id,
        usuario: { id: c.usuario_id, nome: c.usuario_nome, email: c.usuario_email },
        permissao: c.permissao,
        convidado_por: c.convidado_por ? { id: c.convidado_por, nome: c.convidado_por_nome } : null,
        created_at: c.created_at
      })),
      minha_permissao: permissaoUsuario
    });
  } catch (err) {
    console.error('Erro ao listar compartilhamentos:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

// Remover compartilhamento
router.delete('/fazendas/:fazendaId/compartilhar/:usuarioId', authMiddleware, async (req, res) => {
  try {
    const { fazendaId, usuarioId } = req.params;
    
    const fazenda = await Fazenda.findById(fazendaId);
    if (!fazenda) {
      return res.status(404).json({ sucesso: false, erro: 'Fazenda não encontrada' });
    }
    
    const permissaoUsuario = await getPermissaoFazenda(req.usuario.id, fazendaId);
    
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
    
    await Permissao.delete(fazendaId, usuarioId);
    
    res.json({ sucesso: true, mensagem: 'Compartilhamento removido' });
  } catch (err) {
    console.error('Erro ao remover compartilhamento:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

// Perfil do usuário logado
router.get('/perfil', authMiddleware, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario.id);
    
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
  } catch (err) {
    console.error('Erro ao buscar perfil:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

// Logout
router.post('/logout', authMiddleware, (req, res) => {
  res.json({ sucesso: true, mensagem: 'Logout realizado com sucesso' });
});

// Buscar usuários para convite (por email)
router.get('/usuarios/buscar', authMiddleware, async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email || email.length < 3) {
      return res.status(400).json({ sucesso: false, erro: 'Digite pelo menos 3 caracteres' });
    }
    
    // Buscar todos usuários e filtrar manualmente (em produção, usar LIKE no SQL)
    const todosUsuarios = await Usuario.findAll();
    const encontrados = todosUsuarios
      .filter(u => u.email.toLowerCase().includes(email.toLowerCase()) && u.id !== req.usuario.id)
      .map(u => ({
        id: u.id,
        email: u.email,
        nome: u.nome
      }));
    
    res.json({ sucesso: true, usuarios: encontrados });
  } catch (err) {
    console.error('Erro ao buscar usuários:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

module.exports = { 
  router, 
  authMiddleware, 
  getPermissaoFazenda, 
  getFazendasUsuario,
  PERMISSOES
};
