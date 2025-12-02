const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { User } = require('../models');

router.get('/register', (req, res) => res.render('register'));

router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash: hash, role: role || 'buyer' });
    req.session.user = { id: user.id, name: user.name, role: user.role };
    req.flash('success', 'Registrado correctamente');
    res.redirect('/');
  } catch (err) {
    req.flash('error', 'Error al registrar: ' + (err.message || err));
    res.redirect('/register');
  }
});

router.get('/login', (req, res) => res.render('login'));

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ where: { email } });
  if (!user) {
    req.flash('error', 'Usuario no encontrado');
    return res.redirect('/login');
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    req.flash('error', 'Contraseña incorrecta');
    return res.redirect('/login');
  }
  req.session.user = { id: user.id, name: user.name, role: user.role };
  req.flash('success', 'Bienvenido ' + user.name);
  res.redirect('/');
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
