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
  const orders = await Order.findAll({ include: [User] });
  res.render('Pedidos', { orders });
});

// Actualizar estado de pedido
router.post('/orders/:id/update-status', ensureAdmin, async (req, res) => {
  const id = req.params.id;
  const { status } = req.body;
  
  try {
    const order = await Order.findByPk(id);
    if (!order) {
      req.flash('error', 'Pedido no encontrado');
      return res.redirect('/admin/orders');
    }

    const validStatuses = ['pending', 'paid', 'shipped', 'cancelled'];
    if (!validStatuses.includes(status)) {
      req.flash('error', 'Estado inválido');
      return res.redirect('/admin/orders');
    }

    const previousStatus = order.status;
    
    // Si se cancela el pedido y antes no estaba cancelado, devolver stock
    if (status === 'cancelled' && previousStatus !== 'cancelled') {
      const orderItems = await OrderItem.findAll({
        where: { orderId: id },
        include: [Product]
      });

      for (const item of orderItems) {
        if (item.Product) {
          item.Product.quantity += item.quantity;
          await item.Product.save();
        }
      }
      
      req.flash('success', `Pedido cancelado y stock devuelto`);
    } else {
      req.flash('success', `Estado del pedido actualizado a: ${status}`);
    }

    order.status = status;
    await order.save();
    res.redirect('/admin/orders');
  } catch (err) {
    req.flash('error', 'Error al actualizar pedido: ' + (err.message || err));
    res.redirect('/admin/orders');
  }
});

// Reportes básicos
router.get('/reports', ensureAdmin, async (req, res) => {
  try {
    // Items de órdenes pagadas
    const items = await OrderItem.findAll({
      include: [
        { model: Order, where: { status: 'paid' } },
        { model: Product }
      ]
    });

    // Ventas totales
    const totalSales = items.reduce((acc, it) => acc + (it.price * it.quantity), 0);

    // Número de pedidos pagados
    const ordersCount = await Order.count({ where: { status: 'paid' } });

    // Productos más vendidos (por cantidad) y sus ingresos
    const productStats = new Map();
    for (const it of items) {
      if (!it.Product) continue;
      const pid = it.Product.id;
      const curr = productStats.get(pid) || { id: pid, title: it.Product.title, quantity: 0, revenue: 0 };
      curr.quantity += it.quantity;
      curr.revenue += it.price * it.quantity;
      productStats.set(pid, curr);
    }
    const topProducts = Array.from(productStats.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    res.render('reports', { totalSales, ordersCount, topProducts });
  } catch (err) {
    console.error('Error al generar reportes:', err);
    req.flash('error', 'Error al generar reportes');
    res.redirect('/admin');
  }
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

// Editar categoría (formulario)
router.get('/categories/:id/edit', ensureAdmin, async (req, res) => {
  const id = req.params.id;
  try {
    const category = await Category.findByPk(id);
    if (!category) {
      req.flash('error', 'Categoría no encontrada');
      return res.redirect('/admin');
    }
    const users = await User.findAll();
    const categories = await Category.findAll();
    res.render('admin', { users, categories, editingCategory: category });
  } catch (err) {
    req.flash('error', 'Error al cargar categoría: ' + (err.message || err));
    res.redirect('/admin');
  }
});

// Actualizar categoría
router.post('/categories/:id/update', ensureAdmin, async (req, res) => {
  const id = req.params.id;
  const { name, description } = req.body;
  
  try {
    if (!name || name.trim() === '') {
      req.flash('error', 'El nombre de la categoría es obligatorio');
      return res.redirect(`/admin/categories/${id}/edit`);
    }

    const category = await Category.findByPk(id);
    if (!category) {
      req.flash('error', 'Categoría no encontrada');
      return res.redirect('/admin');
    }

    category.name = name.trim();
    category.description = description || '';
    await category.save();

    req.flash('success', 'Categoría actualizada exitosamente');
    res.redirect('/admin');
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      req.flash('error', 'Ya existe una categoría con ese nombre');
    } else {
      req.flash('error', 'Error al actualizar categoría: ' + (err.message || err));
    }
    res.redirect(`/admin/categories/${id}/edit`);
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

// Editar usuario (formulario)
router.get('/users/:id/edit', ensureAdmin, async (req, res) => {
  const id = req.params.id;
  try {
    const user = await User.findByPk(id);
    if (!user) {
      req.flash('error', 'Usuario no encontrado');
      return res.redirect('/admin');
    }
    const users = await User.findAll();
    const categories = await Category.findAll();
    res.render('admin', { users, categories, editingUser: user });
  } catch (err) {
    req.flash('error', 'Error al cargar usuario: ' + (err.message || err));
    res.redirect('/admin');
  }
});

// Actualizar usuario
router.post('/users/:id/update', ensureAdmin, async (req, res) => {
  const id = req.params.id;
  const { name, email, role } = req.body;
  
  try {
    if (!name || !email || !role) {
      req.flash('error', 'Nombre, email y rol son obligatorios');
      return res.redirect(`/admin/users/${id}/edit`);
    }

    const user = await User.findByPk(id);
    if (!user) {
      req.flash('error', 'Usuario no encontrado');
      return res.redirect('/admin');
    }

    // Verificar si el email ya existe en otro usuario
    const existingUser = await User.findOne({ where: { email, id: { [require('sequelize').Op.ne]: id } } });
    if (existingUser) {
      req.flash('error', 'El email ya está en uso por otro usuario');
      return res.redirect(`/admin/users/${id}/edit`);
    }

    user.name = name.trim();
    user.email = email.trim();
    user.role = role;
    await user.save();

    req.flash('success', 'Usuario actualizado exitosamente');
    res.redirect('/admin');
  } catch (err) {
    req.flash('error', 'Error al actualizar usuario: ' + (err.message || err));
    res.redirect(`/admin/users/${id}/edit`);
  }
});

// Eliminar usuario
router.post('/users/:id/delete', ensureAdmin, async (req, res) => {
  const id = req.params.id;
  const currentUserId = req.session.user.id;

  try {
    // Prevent admin from deleting themselves
    if (parseInt(id) === currentUserId) {
      req.flash('error', 'No puedes eliminar tu propia cuenta');
      return res.redirect('/admin');
    }

    const user = await User.findByPk(id);
    if (!user) {
      req.flash('error', 'Usuario no encontrado');
      return res.redirect('/admin');
    }

    await user.destroy();
    req.flash('success', 'Usuario eliminado exitosamente');
    res.redirect('/admin');
  } catch (err) {
    req.flash('error', 'Error al eliminar usuario: ' + (err.message || err));
    res.redirect('/admin');
  }
});

module.exports = router;
