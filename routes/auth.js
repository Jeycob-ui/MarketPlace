const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');

router.get('/register', usuarioController.formularioRegistro);
router.post('/register', usuarioController.registrar);

router.get('/login', usuarioController.formularioLogin);
router.post('/login', usuarioController.autenticar);

// Rutas para reseteo de contraseña
router.get('/forgot', usuarioController.formularioOlvide);
router.post('/forgot', usuarioController.enviarOlvide);

router.get('/reset/:token', usuarioController.formularioReset);
router.post('/reset/:token', usuarioController.resetPassword);

router.get('/logout', usuarioController.cerrarSesion);

router.get('/profile', usuarioController.obtenerPerfil);
router.get('/profile/edit', usuarioController.formularioEditarPerfil);
router.put('/profile', usuarioController.actualizarPerfil);
router.delete('/profile', usuarioController.eliminarCuenta);

module.exports = router;
