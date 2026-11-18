import firestore from "../config/firebase.js";
import { Timestamp } from "firebase-admin/firestore";
import { isUserChatMember } from "../repositories/chat.repository.js";
import type { MessageResponse } from "../types/message.types.js";

export const sendMessage = async (
    chatId: number,
    senderId: number,
    text: string
): Promise<MessageResponse> => {
    // Verify sender is a member of the chat
    const isMember = await isUserChatMember(chatId, senderId);

    if (!isMember) {
        throw new Error("User is not a member of this chat");
    }

    const messageRef = firestore
        .collection("chats")
        .doc(String(chatId))
        .collection("messages")
        .doc();

    const createdAt = Timestamp.now();

    const messageData = {
        senderId,
        text,
        createdAt
    };

    await messageRef.set(messageData);

    return {
        messageId: messageRef.id,
        chatId,
        senderId,
        text,
        createdAt: createdAt.toDate().toISOString()
    };
};

export const getMessages = async (
    chatId: number,
    limit: number = 50
): Promise<MessageResponse[]> => {
    const messagesRef = firestore
        .collection("chats")
        .doc(String(chatId))
        .collection("messages");

    // Fetch the latest messages first
    const snapshot = await messagesRef
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();

    // Convert Firestore documents into API response objects
    const messages: MessageResponse[] = snapshot.docs.map((doc) => {
        const data = doc.data();

        return {
            messageId: doc.id,
            chatId,
            senderId: data.senderId as number,
            text: data.text as string,
            createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
        };
    });

    // Return messages in chronological order
    return messages.reverse();
};

export const markMessageAsRead = async (
    chatId: number,
    messageId: string,
    userId: number
) => {
    // Check whether the user belongs to this chat
    const isMember = await isUserChatMember(chatId, userId);

    if (!isMember) {
        throw new Error("User is not a member of this chat");
    }

    const messageRef = firestore
        .collection("chats")
        .doc(String(chatId))
        .collection("messages")
        .doc(messageId);

    // Verify that the message exists
    const messageSnapshot = await messageRef.get();

    if (!messageSnapshot.exists) {
        throw new Error("Message not found");
    }

    const messageData = messageSnapshot.data();

    // A sender cannot mark their own message as read
    if (messageData?.senderId === userId) {
        throw new Error("Sender cannot mark their own message as read");
    }

    const readAt = Timestamp.now();

    // Create or update the user's read receipt
    await messageRef
        .collection("readReceipts")
        .doc(String(userId))
        .set({
            userId,
            readAt,
        });

    return {
        chatId,
        messageId,
        userId,
        readAt: readAt.toDate().toISOString(),
    };
};

export const updateLastSeen = async (
    chatId: number,
    userId: number,
    messageId: string
) => {
    // Verify chat membership
    const isMember = await isUserChatMember(chatId, userId);

    if (!isMember) {
        throw new Error("User is not a member of this chat");
    }

    // Verify that the message exists in this chat
    const messageRef = firestore
        .collection("chats")
        .doc(String(chatId))
        .collection("messages")
        .doc(messageId);

    const messageSnapshot = await messageRef.get();

    if (!messageSnapshot.exists) {
        throw new Error("Message not found");
    }

    const lastSeenAt = Timestamp.now();

    // Store the user's last-seen position
    await firestore
        .collection("chats")
        .doc(String(chatId))
        .collection("lastSeen")
        .doc(String(userId))
        .set({
            userId,
            lastSeenMessageId: messageId,
            lastSeenAt,
        });

    return {
        chatId,
        userId,
        lastSeenMessageId: messageId,
        lastSeenAt: lastSeenAt.toDate().toISOString(),
    };
};