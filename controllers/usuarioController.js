const bcrypt = require('bcryptjs');
const crypto = require('crypto');
// ^
// |
// es un módulo integrado que ofrece funcionalidades criptográficas para proteger datos
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

// Procesar solicitud de reset: generar token, guardar y enviar email
const enviarOlvide = async (req, res) => {
  const { email } = req.body || {};
  if (!email) {
    req.flash('error', 'Ingresa tu email');
    return res.redirect('/forgot');
  }

  try {
    const usuario = await User.findOne({ where: { email } });
    if (!usuario) {
      // No revelar si existe o no. mostrar mensaje genérico
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
  const form = req.session.formData || {};
  req.session.formData = null;
  res.render('register', { form });
};

const registrar = async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    // preserve inputs except password
    req.session.formData = { name: name || '', email: email || '', role: role || 'comprador' };
    req.flash('error', 'Nombre, email y contraseña son obligatorios');
    return res.redirect('/register');
  }
  
  // Validación: contraseña mínima 6 caracteres
  if (password && password.length < 6) {
    req.session.formData = { name: name || '', email: email || '', role: role || 'comprador' };
    req.flash('error', 'La contraseña debe tener al menos 6 caracteres');
    return res.redirect('/register');
  }

  // Validación: permitir solo dominios @gmail.com y @hotmail.com
  const allowed = ['@gmail.com', '@hotmail.com'];
  const emailLower = (email || '').toLowerCase();
  const hasAllowedDomain = allowed.some(d => emailLower.endsWith(d));
  if (!hasAllowedDomain) {
    req.session.formData = { name: name || '', email: email || '', role: role || 'comprador' };
    req.flash('error', 'Solo se permiten emails como @gmail.com o @hotmail.com');
    return res.redirect('/register');
  }

  try {
    const exists = await User.findOne({ where: { email } });
    if (exists) {
      req.session.formData = { name: name || '', email: email || '', role: role || 'comprador' };
      req.flash('error', 'El usuario ya existe');
      return res.redirect('/register');
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash: hash, role: role || 'comprador' });

    // clear any preserved form data on success
    req.session.formData = null;
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

  // Validación: contraseña mínima 6 caracteres
  if (password && password.length < 6) {
    req.flash('error', 'La contraseña debe tener al menos 6 caracteres');
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

    // if there are preserved form values from a failed submit, use them
    const form = req.session.formData || {};
    req.session.formData = null;
    res.render('profile-edit', { usuario, form });
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

    // Si proporciona contraseña nueva, validar y actualizarla
    if (password) {
      if (password.length < 6) {
        // preserve other inputs
        req.session.formData = { name: name || '', email: email || '' };
        req.flash('error', 'La contraseña debe tener al menos 6 caracteres');
        return res.redirect('/profile/edit');
      }
      const hash = await bcrypt.hash(password, 10);
      usuario.passwordHash = hash;
    }

    await usuario.save();

    // Actualizar sesión con el nuevo nombre
    req.session.user.name = usuario.name;
    // clear any preserved form data on success
    req.session.formData = null;
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
    // Clear the logged user but keep the session so flash messages persist
    // (destroying the session removes flash messages stored there).
    req.session.user = null;
    req.flash('success', 'Cuenta eliminada correctamente');
    return res.redirect('/');
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
