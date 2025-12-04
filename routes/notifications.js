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
      items = await OrderItem.findAll({
        include: [
          { model: Product, where: { userId: u.id }, include: [User] },
          { model: Order, include: [User] }
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
