import { createOrGetChat, getUserChats } from "../repositories/chat.repository.ts";
import type { CreateChatRequest } from "../types/chat.types.js";

export const createChat = async (
    data: CreateChatRequest
) => {
    const { userAId, userBId } = data;

    if (userAId === userBId) {
        throw new Error("Users cannot create a chat with themselves");
    }

    return await createOrGetChat(userAId, userBId);
};

export const listUserChats = async (userId: number) => {
    if (!Number.isInteger(userId) || userId <= 0) {
        throw new Error("Invalid userId");
    }

    return await getUserChats(userId);
};