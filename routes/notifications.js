const express = require('express');
const router = express.Router();
const { Order, OrderItem, Product, User } = require('../models');

function ensureAuth(req, res, next) {
  if (!req.session.user) {
    req.flash('error', 'Acceso denegado');
    return res.redirect('/login');
  }
  next();
}

router.get('/', ensureAuth, async (req, res) => {
  const u = req.session.user;
  try {
    let items = [];
    if (u.role === 'admin') {
      items = await OrderItem.findAll({
        include: [
          { model: Product, include: [User] },
          { model: Order, include: [User] }
        ],
        order: [['createdAt', 'DESC']],
        limit: 50
      });
    } else if (u.role === 'vendedor') {
      // Ventas del vendedor
      const ventas = await OrderItem.findAll({
        include: [
          { model: Product, where: { userId: u.id }, include: [User] },
          { model: Order, include: [User] }
        ],
        order: [['createdAt', 'DESC']],
        limit: 50
      });

      // Compras propias del vendedor (todos los estados)
      const comprasPropias = await OrderItem.findAll({
        include: [
          { model: Product, include: [User] },
          { model: Order, where: { userId: u.id }, include: [User] }
        ],
        order: [['createdAt', 'DESC']],
        limit: 50
      });

      // Merge y ordenar por fecha
      items = [...ventas, ...comprasPropias]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 50);
    } else if (u.role === 'comprador') {
      // Mostrar compras realizadas por el comprador actual (todos los estados)
      items = await OrderItem.findAll({
        include: [
          { model: Product, include: [User] },
          { model: Order, where: { userId: u.id }, include: [User] }
        ],
        order: [['createdAt', 'DESC']],
        limit: 50
      });
    } else {
      req.flash('error', 'Acceso denegado');
      return res.redirect('/');
    }
    res.render('notifications', { items });
  } catch (err) {
    console.error('Error al obtener notificaciones', err);
    req.flash('error', 'Error al obtener notificaciones');
    res.redirect('/');
  }
});

module.exports = router;
