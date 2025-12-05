const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');

router.get('/register', usuarioController.formularioRegistro);
router.post('/register', usuarioController.registrar);

router.get('/login', usuarioController.formularioLogin);
router.post('/login', usuarioController.autenticar);

router.get('/logout', usuarioController.cerrarSesion);

router.get('/profile', usuarioController.obtenerPerfil);
router.get('/profile/edit', usuarioController.formularioEditarPerfil);
router.put('/profile', usuarioController.actualizarPerfil);
router.delete('/profile', usuarioController.eliminarCuenta);

module.exports = router;
