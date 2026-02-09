const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

// JWT Secret (em produção, usar variável de ambiente)
const JWT_SECRET = process.env.JWT_SECRET || 'agrofocus-secret-key-2024';
const JWT_EXPIRES_IN = '7d';

// Dados mockados de usuários (em produção, usar banco de dados)
let usuarios = [
  {
    id: '1',
    email: 'admin@agrofocus.com',
    senha_hash: '$2a$10$YourHashedPasswordHere', // senha: admin123
    nome: 'Administrador',
    telefone: '(16) 99999-0000',
    perfil: 'admin',
    ativo: true,
    avatar_url: null,
    ultimo_acesso: new Date().toISOString(),
    created_at: new Date().toISOString()
  }
];

// Hash da senha admin123 para validação
const ADMIN_PASSWORD_HASH = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

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

// Registro de novo usuário
router.post('/registro', async (req, res) => {
  try {
    const { email, senha, nome, telefone } = req.body;
    
    // Validações
    if (!email || !senha || !nome) {
      return res.status(400).json({ 
        sucesso: false, 
        erro: 'Email, senha e nome são obrigatórios' 
      });
    }
    
    // Verificar se email já existe
    const usuarioExistente = usuarios.find(u => u.email === email);
    if (usuarioExistente) {
      return res.status(400).json({ 
        sucesso: false, 
        erro: 'Email já cadastrado' 
      });
    }
    
    // Hash da senha
    const senhaHash = await bcrypt.hash(senha, 10);
    
    // Criar usuário
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
    
    // Gerar token
    const token = jwt.sign(
      { 
        id: novoUsuario.id, 
        email: novoUsuario.email, 
        nome: novoUsuario.nome,
        perfil: novoUsuario.perfil 
      },
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
    
    // Buscar usuário
    const usuario = usuarios.find(u => u.email === email);
    
    // Verificar credenciais do admin mockado
    const isAdmin = email === 'admin@agrofocus.com' && senha === 'admin123';
    
    if (!usuario && !isAdmin) {
      return res.status(401).json({ 
        sucesso: false, 
        erro: 'Credenciais inválidas' 
      });
    }
    
    let usuarioValido = usuario;
    
    // Criar usuário admin se for o login mockado
    if (isAdmin && !usuario) {
      usuarioValido = {
        id: '1',
        email: 'admin@agrofocus.com',
        senha_hash: ADMIN_PASSWORD_HASH,
        nome: 'Administrador',
        telefone: '(16) 99999-0000',
        perfil: 'admin',
        ativo: true,
        avatar_url: null,
        ultimo_acesso: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      usuarios.push(usuarioValido);
    }
    
    // Verificar senha (exceto para admin mockado)
    if (!isAdmin) {
      const senhaValida = await bcrypt.compare(senha, usuarioValido.senha_hash);
      if (!senhaValida) {
        return res.status(401).json({ 
          sucesso: false, 
          erro: 'Credenciais inválidas' 
        });
      }
    }
    
    // Atualizar último acesso
    usuarioValido.ultimo_acesso = new Date().toISOString();
    
    // Gerar token
    const token = jwt.sign(
      { 
        id: usuarioValido.id, 
        email: usuarioValido.email, 
        nome: usuarioValido.nome,
        perfil: usuarioValido.perfil 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    res.json({
      sucesso: true,
      mensagem: 'Login realizado com sucesso',
      usuario: {
        id: usuarioValido.id,
        email: usuarioValido.email,
        nome: usuarioValido.nome,
        perfil: usuarioValido.perfil,
        avatar_url: usuarioValido.avatar_url
      },
      token
    });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
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

// Atualizar perfil
router.put('/perfil', authMiddleware, async (req, res) => {
  try {
    const { nome, telefone, avatar_url } = req.body;
    const usuario = usuarios.find(u => u.id === req.usuario.id);
    
    if (!usuario) {
      return res.status(404).json({ sucesso: false, erro: 'Usuário não encontrado' });
    }
    
    if (nome) usuario.nome = nome;
    if (telefone !== undefined) usuario.telefone = telefone;
    if (avatar_url !== undefined) usuario.avatar_url = avatar_url;
    
    usuario.updated_at = new Date().toISOString();
    
    res.json({
      sucesso: true,
      mensagem: 'Perfil atualizado com sucesso',
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        telefone: usuario.telefone,
        perfil: usuario.perfil,
        avatar_url: usuario.avatar_url
      }
    });
  } catch (err) {
    console.error('Erro ao atualizar perfil:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

// Alterar senha
router.put('/alterar-senha', authMiddleware, async (req, res) => {
  try {
    const { senha_atual, nova_senha } = req.body;
    const usuario = usuarios.find(u => u.id === req.usuario.id);
    
    if (!usuario) {
      return res.status(404).json({ sucesso: false, erro: 'Usuário não encontrado' });
    }
    
    // Verificar senha atual
    const senhaValida = await bcrypt.compare(senha_atual, usuario.senha_hash);
    if (!senhaValida) {
      return res.status(400).json({ sucesso: false, erro: 'Senha atual incorreta' });
    }
    
    // Hash da nova senha
    usuario.senha_hash = await bcrypt.hash(nova_senha, 10);
    usuario.updated_at = new Date().toISOString();
    
    res.json({ sucesso: true, mensagem: 'Senha alterada com sucesso' });
  } catch (err) {
    console.error('Erro ao alterar senha:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

// Logout (apenas para registro - JWT é stateless)
router.post('/logout', authMiddleware, (req, res) => {
  res.json({ sucesso: true, mensagem: 'Logout realizado com sucesso' });
});

// Listar usuários (apenas admin)
router.get('/usuarios', authMiddleware, (req, res) => {
  if (req.usuario.perfil !== 'admin') {
    return res.status(403).json({ sucesso: false, erro: 'Acesso negado' });
  }
  
  const lista = usuarios.map(u => ({
    id: u.id,
    email: u.email,
    nome: u.nome,
    telefone: u.telefone,
    perfil: u.perfil,
    ativo: u.ativo,
    ultimo_acesso: u.ultimo_acesso,
    created_at: u.created_at
  }));
  
  res.json({ sucesso: true, usuarios: lista });
});

module.exports = { router, authMiddleware };