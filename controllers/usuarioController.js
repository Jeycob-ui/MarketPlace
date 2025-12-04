const bcrypt = require('bcryptjs');
const { User } = require('../models');

const formularioLogin = (req, res) => {
  res.render('login');
};

const autenticar = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    req.flash('error', 'Email y contraseña son obligatorios');
    return res.redirect('/login');
  }

  try {
    const usuario = await User.findOne({ where: { email } });
    if (!usuario) {
      req.flash('error', 'Usuario no encontrado');
      return res.redirect('/login');
    }

    const ok = await bcrypt.compare(password, usuario.passwordHash);
    if (!ok) {
      req.flash('error', 'Contraseña incorrecta');
      return res.redirect('/login');
    }

    req.session.user = { id: usuario.id, name: usuario.name, role: usuario.role };
    req.flash('success', 'Bienvenido ' + usuario.name + ' ojala encuentres lo que buscas');
    return res.redirect('/');
  } catch (err) {
    req.flash('error', 'Error al autenticar: ' + (err.message || err));
    return res.redirect('/login');
  }
};

const formularioRegistro = (req, res) => {
  res.render('register');
};

const registrar = async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    req.flash('error', 'Nombre, email y contraseña son obligatorios');
    return res.redirect('/register');
  }

  try {
    const exists = await User.findOne({ where: { email } });
    if (exists) {
      req.flash('error', 'El usuario ya existe');
      return res.redirect('/register');
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash: hash, role: role || 'comprador' });

    req.session.user = { id: user.id, name: user.name, role: user.role };
    req.flash('success', 'Registrado correctamente');
    return res.redirect('/');
  } catch (err) {
    req.flash('error', 'Error al registrar: ' + (err.message || err));
    return res.redirect('/register');
  }
};

const cerrarSesion = (req, res) => {
  req.session.destroy(() => res.redirect('/'));
};

module.exports = {
  formularioLogin,
  autenticar,
  formularioRegistro,
  registrar,
  cerrarSesion,
};
