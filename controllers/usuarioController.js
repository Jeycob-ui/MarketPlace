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

const obtenerPerfil = async (req, res) => {
  if (!req.session.user) {
    req.flash('error', 'Debes iniciar sesión para ver tu perfil');
    return res.redirect('/login');
  }

  try {
    const usuario = await User.findByPk(req.session.user.id);
    if (!usuario) {
      req.flash('error', 'Usuario no encontrado');
      return res.redirect('/');
    }

    res.render('profile', { usuario });
  } catch (err) {
    req.flash('error', 'Error al cargar el perfil: ' + (err.message || err));
    res.redirect('/');
  }
};

const formularioEditarPerfil = async (req, res) => {
  if (!req.session.user) {
    req.flash('error', 'Debes iniciar sesión');
    return res.redirect('/login');
  }

  try {
    const usuario = await User.findByPk(req.session.user.id);
    if (!usuario) {
      req.flash('error', 'Usuario no encontrado');
      return res.redirect('/');
    }

    res.render('profile-edit', { usuario });
  } catch (err) {
    req.flash('error', 'Error al cargar el formulario: ' + (err.message || err));
    res.redirect('/profile');
  }
};

const actualizarPerfil = async (req, res) => {
  if (!req.session.user) {
    req.flash('error', 'Debes iniciar sesión');
    return res.redirect('/login');
  }

  const { name, email, password } = req.body;

  try {
    const usuario = await User.findByPk(req.session.user.id);
    if (!usuario) {
      req.flash('error', 'Usuario no encontrado');
      return res.redirect('/');
    }

    // Validar que el email no esté en uso por otro usuario
    if (email && email !== usuario.email) {
      const exists = await User.findOne({ where: { email } });
      if (exists) {
        req.flash('error', 'El email ya está en uso');
        return res.redirect('/profile/edit');
      }
    }

    // Actualizar datos
    if (name) usuario.name = name;
    if (email) usuario.email = email;

    // Si proporciona contraseña nueva, actualizarla
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      usuario.passwordHash = hash;
    }

    await usuario.save();

    // Actualizar sesión con el nuevo nombre
    req.session.user.name = usuario.name;

    req.flash('success', 'Perfil actualizado correctamente');
    res.redirect('/profile');
  } catch (err) {
    req.flash('error', 'Error al actualizar el perfil: ' + (err.message || err));
    res.redirect('/profile/edit');
  }
};

const eliminarCuenta = async (req, res) => {
  if (!req.session.user) {
    req.flash('error', 'Debes iniciar sesión');
    return res.redirect('/login');
  }

  try {
    const usuario = await User.findByPk(req.session.user.id);
    if (!usuario) {
      req.flash('error', 'Usuario no encontrado');
      return res.redirect('/');
    }

    await usuario.destroy();
    req.session.destroy(() => {
      req.flash('success', 'Cuenta eliminada correctamente');
      res.redirect('/');
    });
  } catch (err) {
    req.flash('error', 'Error al eliminar la cuenta: ' + (err.message || err));
    res.redirect('/profile');
  }
};

module.exports = {
  formularioLogin,
  autenticar,
  formularioRegistro,
  registrar,
  cerrarSesion,
  obtenerPerfil,
  formularioEditarPerfil,
  actualizarPerfil,
  eliminarCuenta,
};
