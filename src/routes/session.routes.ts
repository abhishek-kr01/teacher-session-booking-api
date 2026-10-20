import { Router } from "express";
import {
    bookSession,
    completeSession,
    createSession,
    getAvailableSessions,
} from "../controllers/session.controller.js";

const router = Router();

router.get("/available", getAvailableSessions);
router.post("/", createSession);
router.post("/:id/book", bookSession);
router.patch("/:id/complete", completeSession);

export default router;
