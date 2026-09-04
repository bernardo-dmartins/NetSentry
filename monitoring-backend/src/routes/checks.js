const express = require("express");
const router = express.Router();
const CheckController = require("../controllers/checkControllers");
const { authMiddleware } = require("../middleware/authJWT");

const wrap = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.get(
  /**
   * @swagger
   * /api/checks/{id}:
   *   get:
   *     summary: Get check by ID
   *     tags: [Checks]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Check ID
   */
  "/:id",
  authMiddleware,
  CheckController.validateId,
  wrap(CheckController.getById)
);

router.put(
  /**
   * @swagger
   * /api/checks/{id}:
   *   put:
   *     summary: Update a check
   *     tags: [Checks]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Check ID
   */
  "/:id",
  authMiddleware,
  CheckController.validateUpdate,
  wrap(CheckController.update)
);

router.delete(
  /**
   * @swagger
   * /api/checks/{id}:
   *   delete:
   *     summary: Delete a check
   *     tags: [Checks]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Check ID
   */
  "/:id",
  authMiddleware,
  CheckController.validateId,
  wrap(CheckController.delete)
);

router.post(
  /**
   * @swagger
   * /api/checks/{id}/run:
   *   post:
   *     summary: Execute a check manually
   *     tags: [Checks]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Check ID
   */
  "/:id/run",
  authMiddleware,
  CheckController.validateRun,
  wrap(CheckController.run)
);

router.get(
  /**
   * @swagger
   * /api/checks/{id}/results:
   *   get:
   *     summary: Get recent results for a check
   *     tags: [Checks]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Check ID
   *       - in: query
   *         name: limit
   *         required: false
   *         schema:
   *           type: integer
   *         description: Max results returned
   */
  "/:id/results",
  authMiddleware,
  CheckController.validateResults,
  wrap(CheckController.results)
);

router.get(
  /**
   * @swagger
   * /api/checks/{id}/history:
   *   get:
   *     summary: Get historical results for a check
   *     tags: [Checks]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Check ID
   *       - in: query
   *         name: days
   *         required: false
   *         schema:
   *           type: integer
   *         description: Window in days
   *       - in: query
   *         name: limit
   *         required: false
   *         schema:
   *           type: integer
   *         description: Max results returned
   */
  "/:id/history",
  authMiddleware,
  CheckController.validateHistory,
  wrap(CheckController.history)
);

router.get(
  /**
   * @swagger
   * /api/checks/{id}/stats:
   *   get:
   *     summary: Get aggregated stats for a check
   *     tags: [Checks]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Check ID
   *       - in: query
   *         name: days
   *         required: false
   *         schema:
   *           type: integer
   *         description: Window in days
   */
  "/:id/stats",
  authMiddleware,
  CheckController.validateStats,
  wrap(CheckController.stats)
);

module.exports = router;
