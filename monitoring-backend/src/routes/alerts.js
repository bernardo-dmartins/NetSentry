const express = require('express');
const router = express.Router();
const AlertController = require('../controllers/alertControllers');
const { authMiddleware, adminMiddleware } = require('../middleware/authJWT');

// Todas as rotas de alerts precisam de autenticação
router.use(authMiddleware);

/**
 * @swagger
 * /api/alerts:
 *   get:
 *     summary: Listar todos os alertas
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [disaster, warning, information]
 *       - in: query
 *         name: acknowledged
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: resolved
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de alertas
 */
router.get('/', AlertController.getAll);

/**
 * @swagger
 * /api/alerts/recent:
 *   get:
 *     summary: Obter alertas recentes (últimas 24h)
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Alertas recentes
 */
router.get('/recent', AlertController.getRecent);

/**
 * @swagger
 * /api/alerts/cleanup:
 *   delete:
 *     summary: Limpar alertas antigos
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: Alertas limpos
 */
router.delete('/cleanup', adminMiddleware, AlertController.cleanup);

/**
 * @swagger
 * /api/alerts/{id}/acknowledge:
 *   put:
 *     summary: Reconhecer alerta
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Alerta reconhecido
 */
router.put('/:id/acknowledge', AlertController.acknowledge);

/**
 * @swagger
 * /api/alerts/{id}/resolve:
 *   put:
 *     summary: Resolver alerta
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Alerta resolvido
 */
router.put('/:id/resolve', adminMiddleware, AlertController.resolve);

/**
 * @swagger
 * /api/alerts/{id}:
 *   get:
 *     summary: Buscar alerta por ID
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Alerta encontrado
 */
router.get('/:id', AlertController.getById);

/**
 * @swagger
 * /api/alerts/{id}:
 *   delete:
 *     summary: Deletar alerta
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Alerta deletado
 */
router.delete('/:id', adminMiddleware, AlertController.delete);

module.exports = router;
