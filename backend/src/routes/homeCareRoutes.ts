import express from "express";
import {
  createHomeCare,
  deleteHomeCare,
  getAllHomeCares,
  reorderHomeCares,
  updateHomeCare,
} from "../controllers/homeCareController";

const router = express.Router();

router.get("/", getAllHomeCares);
router.post("/", createHomeCare);
router.put("/reorder", reorderHomeCares);
router.put("/:id", updateHomeCare);
router.delete("/:id", deleteHomeCare);

export default router;
