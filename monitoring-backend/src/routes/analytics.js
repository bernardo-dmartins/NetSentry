const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authJWT");
const { asyncHandler } = require("../middleware/errorHandler");
const AnalyticsController = require("../controllers/analyticsControllers");

router.get(
  "/overview",
  authMiddleware,
  asyncHandler(AnalyticsController.overview)
);

module.exports = router;
