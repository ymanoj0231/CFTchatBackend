import { Router } from "express";
import {
    createChatController,
    sendMessageController,
    getMessagesController,
    markMessageAsReadController,
    updateLastSeenController,
} from "../controllers/chat.controller.js";

const router = Router();

router.post("/create", createChatController);

router.post("/:chatId/message/send", sendMessageController);
router.get("/:chatId/messages", getMessagesController);
router.post("/:chatId/message/:messageId/read", markMessageAsReadController);
router.post("/:chatId/lastseen", updateLastSeenController);

export default router;