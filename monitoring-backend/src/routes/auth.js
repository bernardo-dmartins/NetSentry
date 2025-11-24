const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authControllers');
const { authMiddleware, rateLimitMiddleware } = require('../middleware/authJWT');

// Wrapper para métodos estáticos
const wrap = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         username:
 *           type: string
 *         email:
 *           type: string
 *         role:
 *           type: string
 *           enum: [admin, user]
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar novo usuário
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Nome de usuário (3-50 caracteres)
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email do usuário
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Senha (mínimo 6 caracteres)
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     token:
 *                       type: string
 *       400:
 *         description: Dados inválidos ou usuário já existe
 *       429:
 *         description: Muitas tentativas de registro
 */
router.post('/register', 
  rateLimitMiddleware({
    windowMs: 900000, // 15 minutes
    max: 3, // max 3 registrations per 15 minutes per IP
    message: 'Too many registration attempts. Please wait 15 minutes.',
    keyGenerator: (req) => req.ip
  }),
  AuthController.validateRegister,
  wrap(AuthController.register)
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Username ou email
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Senha do usuário
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     token:
 *                       type: string
 *       401:
 *         description: Credenciais inválidas
 *       429:
 *         description: Muitas tentativas de login
 */
const isTestEnv = process.env.NODE_ENV === 'test';

router.post('/login',
  rateLimitMiddleware({
    windowMs: 60000, // 1 minute
    max: isTestEnv ? 1000 : 5, // increase limit during tests to avoid blocking
    message: 'Too many login attempts. Please wait 1 minute.',
    keyGenerator: (req) => `${req.ip}:${req.body.username || 'unknown'}`

  }),
  AuthController.validateLogin,
  wrap(AuthController.login)
);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get profile of logged-in user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil do usuário
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Não autenticado
 */
router.get('/me',
  authMiddleware,
  wrap(AuthController.getMe)
);

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Novo email (opcional)
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 description: Senha atual (necessário para alterar senha)
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 description: Nova senha (opcional, mínimo 6 caracteres)
 *     responses:
 *       200:
 *         description: Perfil atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autenticado ou senha atual incorreta
 *       429:
 *         description: Muitas tentativas de atualização
 */
router.put('/profile',
  authMiddleware,
  rateLimitMiddleware({
    windowMs: 60000, // 1 minute
    max: 10, // max 10 updates per minute
    message: 'Too many update attempts. Please wait 1 minute.',
    keyGenerator: (req) => `update:${req.user.id}`
  }),
  wrap(AuthController.updateProfile)
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: User logout
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active session list
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Forbidden (admin only)
 */
router.get('/sessions',
  authMiddleware,
  // adminMiddleware, // Uncomment when implemented
  wrap(AuthController.getActiveSessions)
);

module.exports = router;
