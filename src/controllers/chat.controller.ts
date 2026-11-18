import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { createChat, listUserChats } from "../services/chat.service.js";
import { sendMessage, getMessages, markMessageAsRead, updateLastSeen } from "../services/message.service.js";

const createChatSchema = z.object({
    userAId: z.number().int().positive(),
    userBId: z.number().int().positive()
});

export const createChatController = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const validation = createChatSchema.safeParse(req.body);

        if (!validation.success) {
            res.status(400).json({
                success: false,
                message: "Invalid request data",
                errors: validation.error.issues
            });
            return;
        }

        const result = await createChat(validation.data);

        res.status(result.isNew ? 201 : 200).json({
            success: true,
            message: result.isNew
                ? "Chat created successfully"
                : "Existing chat retrieved successfully",
            data: result
        });

    } catch (error) {
        if (error instanceof Error) {
            if (
                error.message ===
                "Users cannot create a chat with themselves"
            ) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
                return;
            }

            if (
                error.message ===
                "One or both users do not exist"
            ) {
                res.status(404).json({
                    success: false,
                    message: error.message
                });
                return;
            }
        }

        next(error);
    }
};

export const sendMessageController = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const chatId = Number(req.params.chatId);

        if (!Number.isInteger(chatId) || chatId <= 0) {
            res.status(400).json({
                success: false,
                message: "Invalid chatId"
            });
            return;
        }

        const schema = z.object({
            senderId: z.number().int().positive(),
            text: z.string().trim().min(1).max(5000)
        });

        const validation = schema.safeParse(req.body);

        if (!validation.success) {
            res.status(400).json({
                success: false,
                message: "Invalid request data",
                errors: validation.error.issues
            });
            return;
        }

        const { senderId, text } = validation.data;

        const message = await sendMessage(chatId, senderId, text);

        res.status(201).json({
            success: true,
            message: "Message sent successfully",
            data: message
        });

    } catch (error) {
        if (
            error instanceof Error &&
            error.message === "User is not a member of this chat"
        ) {
            res.status(403).json({
                success: false,
                message: error.message
            });
            return;
        }

        next(error);
    }
};

export const getMessagesController = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const chatId = Number(req.params.chatId);

        if (!Number.isInteger(chatId) || chatId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid chatId",
            });
        }

        const limitSchema = z.coerce
            .number()
            .int()
            .min(1)
            .max(100);

        const parsedLimit = limitSchema.safeParse(req.query.limit ?? 50);

        if (!parsedLimit.success) {
            return res.status(400).json({
                success: false,
                message: "Limit must be between 1 and 100",
            });
        }

        const messages = await getMessages(chatId, parsedLimit.data);

        return res.status(200).json({
            success: true,
            message: "Messages fetched successfully",
            data: messages,
        });
    } catch (error) {
        next(error);
    }
};

export const markMessageAsReadController = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const chatId = Number(req.params.chatId);
        const messageId = Array.isArray(req.params.messageId) ? req.params.messageId[0] : req.params.messageId;
        const userIdSchema = z.object({
            userId: z.number().int().positive(),
        });

        if (!Number.isInteger(chatId) || chatId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid chatId",
            });
        }

        if (!messageId) {
            return res.status(400).json({
                success: false,
                message: "messageId is required",
            });
        }

        const parsedBody = userIdSchema.safeParse(req.body);

        if (!parsedBody.success) {
            return res.status(400).json({
                success: false,
                message: "Valid userId is required",
            });
        }

        const result = await markMessageAsRead(
            chatId,
            messageId,
            parsedBody.data.userId
        );

        return res.status(200).json({
            success: true,
            message: "Message marked as read",
            data: result,
        });
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === "User is not a member of this chat") {
                return res.status(403).json({
                    success: false,
                    message: error.message,
                });
            }

            if (error.message === "Message not found") {
                return res.status(404).json({
                    success: false,
                    message: error.message,
                });
            }

            if (
                error.message ===
                "Sender cannot mark their own message as read"
            ) {
                return res.status(400).json({
                    success: false,
                    message: error.message,
                });
            }
        }

        next(error);
    }
};

export const updateLastSeenController = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const chatId = Number(req.params.chatId);

        if (!Number.isInteger(chatId) || chatId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid chatId",
            });
        }

        const schema = z.object({
            userId: z.number().int().positive(),
            messageId: z.string().min(1),
        });

        const parsedBody = schema.safeParse(req.body);

        if (!parsedBody.success) {
            return res.status(400).json({
                success: false,
                message: "Valid userId and messageId are required",
            });
        }

        const result = await updateLastSeen(
            chatId,
            parsedBody.data.userId,
            parsedBody.data.messageId
        );

        return res.status(200).json({
            success: true,
            message: "Last seen updated successfully",
            data: result,
        });
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === "User is not a member of this chat") {
                return res.status(403).json({
                    success: false,
                    message: error.message,
                });
            }

            if (error.message === "Message not found") {
                return res.status(404).json({
                    success: false,
                    message: error.message,
                });
            }
        }

        next(error);
    }
};

export const listUserChatsController = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = Number(req.params.userId);

        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid userId",
            });
        }

        const chats = await listUserChats(userId);

        return res.status(200).json({
            success: true,
            message: "User chats fetched successfully",
            data: chats,
        });
    } catch (error) {
        if (error instanceof Error && error.message === "User not found") {
            return res.status(404).json({
                success: false,
                message: error.message,
            });
        }

        next(error);
    }
};