const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User } = require('../models');
const { sendMail } = require('../helpers/mailer');

const formularioLogin = (req, res) => {
  const email = req.query.email || '';
  res.render('login', { email });
};

// Mostrar formulario de 'Olvidé mi contraseña'
const formularioOlvide = (req, res) => {
  res.render('forgot');
};

// Procesar solicitud de reseteo: generar token, guardar y enviar email
const enviarOlvide = async (req, res) => {
  const { email } = req.body || {};
  if (!email) {
    req.flash('error', 'Ingresa tu email');
    return res.redirect('/forgot');
  }

  try {
    const usuario = await User.findOne({ where: { email } });
    if (!usuario) {
      // No revelar si existe o no; mostrar mensaje genérico
      req.flash('success', 'Si existe ese email, recibirás instrucciones para resetear tu contraseña');
      return res.redirect('/login');
    }

    const token = crypto.randomBytes(20).toString('hex');
    usuario.resetToken = token;
    usuario.resetExpires = new Date(Date.now() + 3600000); // 1 hora
    await usuario.save();

    const resetUrl = `${req.protocol}://${req.get('host')}/reset/${token}`;

    const html = `<p>Has solicitado restablecer tu contraseña.</p>
      <p>Haz clic en el siguiente enlace para crear una nueva contraseña (válido 1 hora):</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>`;

    await sendMail({ to: email, subject: 'Restablecer contraseña', html });

    req.flash('success', 'Si existe ese email, recibirás instrucciones para resetear tu contraseña');
    return res.redirect('/login');
  } catch (err) {
    req.flash('error', 'Error al procesar la solicitud: ' + (err.message || err));
    return res.redirect('/forgot');
  }
};

const autenticar = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    req.flash('error', 'Email y contraseña son obligatorios');
    return res.redirect(`/login?email=${encodeURIComponent(email)}`);
  }

  try {
    const usuario = await User.findOne({ where: { email } });
    if (!usuario) {
      req.flash('error', 'Usuario no encontrado');
      return res.redirect(`/login?email=${encodeURIComponent(email)}`);
    }

    const ok = await bcrypt.compare(password, usuario.passwordHash);
    if (!ok) {
      req.flash('error', 'Contraseña incorrecta');
      return res.redirect(`/login?email=${encodeURIComponent(email)}`);
    }

    req.session.user = { id: usuario.id, name: usuario.name, role: usuario.role };
    req.flash('success', 'Bienvenido ' + usuario.name + ' ojala encuentres lo que buscas');
    return res.redirect('/');
  } catch (err) {
    req.flash('error', 'Error al autenticar: ' + (err.message || err));
    return res.redirect(`/login?email=${encodeURIComponent(email)}`);
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

// Mostrar formulario para establecer nueva contraseña
const formularioReset = async (req, res) => {
  const { token } = req.params;
  if (!token) return res.redirect('/login');

  try {
    const usuario = await User.findOne({ where: { resetToken: token } });
    if (!usuario || !usuario.resetExpires || usuario.resetExpires < new Date()) {
      req.flash('error', 'Token inválido o expirado');
      return res.redirect('/forgot');
    }

    res.render('reset', { token });
  } catch (err) {
    req.flash('error', 'Error al validar token: ' + (err.message || err));
    res.redirect('/forgot');
  }
};

// Procesar nueva contraseña
const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password, confirm } = req.body || {};

  if (!password || !confirm) {
    req.flash('error', 'Ingresa y confirma la nueva contraseña');
    return res.redirect(`/reset/${token}`);
  }
  if (password !== confirm) {
    req.flash('error', 'Las contraseñas no coinciden');
    return res.redirect(`/reset/${token}`);
  }

  try {
    const usuario = await User.findOne({ where: { resetToken: token } });
    if (!usuario || !usuario.resetExpires || usuario.resetExpires < new Date()) {
      req.flash('error', 'Token inválido o expirado');
      return res.redirect('/forgot');
    }

    const hash = await bcrypt.hash(password, 10);
    usuario.passwordHash = hash;
    usuario.resetToken = null;
    usuario.resetExpires = null;
    await usuario.save();

    req.flash('success', 'Contraseña actualizada correctamente, ya puedes iniciar sesión');
    return res.redirect('/login');
  } catch (err) {
    req.flash('error', 'Error al actualizar la contraseña: ' + (err.message || err));
    return res.redirect(`/reset/${token}`);
  }
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
  formularioOlvide,
  enviarOlvide,
  autenticar,
  formularioRegistro,
  registrar,
  cerrarSesion,
  obtenerPerfil,
  formularioEditarPerfil,
  actualizarPerfil,
  formularioReset,
  resetPassword,
  eliminarCuenta,
};
