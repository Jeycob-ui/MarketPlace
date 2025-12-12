const express = require('express');
const router = express.Router();
const { User, Product, Order, OrderItem, Category } = require('../models');

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
  const categories = await Category.findAll();
  res.render('admin', { users, categories });
});

router.get('/products', ensureAdmin, async (req, res) => {
  const products = await Product.findAll();
  res.render('ActivarProductos', { products });
});

router.get('/orders', ensureAdmin, async (req, res) => {
  const orders = await Order.findAll();
  res.render('Pedidos', { orders });
});

// Activar producto
router.post('/products/:id/activate', ensureAdmin, async (req, res) => {
  const id = req.params.id;
  try {
    const p = await Product.findByPk(id);
    if (!p) {
      req.flash('error', 'Producto no encontrado');
      return res.redirect('/admin/products');
    }
    p.active = true;
    await p.save();
    req.flash('success', 'Producto activado');
    res.redirect('/admin/products');
  } catch (err) {
    req.flash('error', 'Error al activar producto: ' + (err.message || err));
    res.redirect('/admin/products');
  }
});

// Desactivar producto
router.post('/products/:id/deactivate', ensureAdmin, async (req, res) => {
  const id = req.params.id;
  try {
    const p = await Product.findByPk(id);
    if (!p) {
      req.flash('error', 'Producto no encontrado');
      return res.redirect('/admin/products');
    }
    p.active = false;
    await p.save();
    req.flash('success', 'Producto desactivado');
    res.redirect('/admin/products');
  } catch (err) {
    req.flash('error', 'Error al desactivar producto: ' + (err.message || err));
    res.redirect('/admin/products');
  }
});

// Crear categoría
router.post('/categories', ensureAdmin, async (req, res) => {
  const { name, description } = req.body;
  try {
    if (!name || name.trim() === '') {
      req.flash('error', 'El nombre de la categoría es obligatorio');
      return res.redirect('/admin');
    }
    await Category.create({ name: name.trim(), description: description || '' });
    req.flash('success', 'Categoría creada exitosamente');
    res.redirect('/admin');
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      req.flash('error', 'Ya existe una categoría con ese nombre');
    } else {
      req.flash('error', 'Error al crear categoría: ' + (err.message || err));
    }
    res.redirect('/admin');
  }
});

// Eliminar categoría
router.post('/categories/:id/delete', ensureAdmin, async (req, res) => {
  const id = req.params.id;
  try {
    const category = await Category.findByPk(id);
    if (!category) {
      req.flash('error', 'Categoría no encontrada');
      return res.redirect('/admin');
    }
    await category.destroy();
    req.flash('success', 'Categoría eliminada');
    res.redirect('/admin');
  } catch (err) {
    req.flash('error', 'Error al eliminar categoría: ' + (err.message || err));
    res.redirect('/admin');
  }
});

module.exports = router;
