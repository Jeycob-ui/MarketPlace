const express = require('express');
const router = express.Router();
const { User, Product, Order, OrderItem } = require('../models');

function ensureAdmin(req, res, next) {
  const u = req.session.user;
  if (!u || u.role !== 'admin') {
    req.flash('error', 'Acceso denegado');
    return res.redirect('/');
  }
  next();
}

router.get('/', ensureAdmin, async (req, res) => {
  const users = await User.findAll();
  const products = await Product.findAll();
  const orders = await Order.findAll();
  res.render('admin', { users, products, orders });
});

// Activar producto
router.post('/products/:id/activate', ensureAdmin, async (req, res) => {
  const id = req.params.id;
  try {
    const p = await Product.findByPk(id);
    if (!p) {
      req.flash('error', 'Producto no encontrado');
      return res.redirect('/admin');
    }
    p.active = true;
    await p.save();
    req.flash('success', 'Producto activado');
    res.redirect('/admin');
  } catch (err) {
    req.flash('error', 'Error al activar producto: ' + (err.message || err));
    res.redirect('/admin');
  }
});

// Desactivar producto
router.post('/products/:id/deactivate', ensureAdmin, async (req, res) => {
  const id = req.params.id;
  try {
    const p = await Product.findByPk(id);
    if (!p) {
      req.flash('error', 'Producto no encontrado');
      return res.redirect('/admin');
    }
    p.active = false;
    await p.save();
    req.flash('success', 'Producto desactivado');
    res.redirect('/admin');
  } catch (err) {
    req.flash('error', 'Error al desactivar producto: ' + (err.message || err));
    res.redirect('/admin');
  }
});

module.exports = router;
