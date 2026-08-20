import { Router } from "express";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshToken,
  registerUser,
} from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  loginRateLimiter,
  refreshRateLimiter,
  registerRateLimiter,
} from "../middlewares/rateLimiters";
import { validate } from "../middlewares/validate.middleware";
import { loginSchema, registerSchema } from "../validators/auth.validation";

const router = Router();

router.post(
  "/register",
  registerRateLimiter,
  validate(registerSchema),
  registerUser,
);
router.post("/login", loginRateLimiter, validate(loginSchema), loginUser);
router.get("/refresh", refreshRateLimiter, refreshToken);
router.post("/logout", logoutUser);
router.get("/me", authMiddleware, getCurrentUser);

export default router;
