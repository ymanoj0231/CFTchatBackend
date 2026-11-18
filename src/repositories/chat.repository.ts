import pool from "../config/mysql.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { CreateChatResponse } from "../types/chat.types.js";

interface UserRow extends RowDataPacket {
    id: number;
}

interface ChatRow extends RowDataPacket {
    id: number;
}

export const createOrGetChat = async (
    userAId: number,
    userBId: number
): Promise<CreateChatResponse> => {

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const userLowId = Math.min(userAId, userBId);
        const userHighId = Math.max(userAId, userBId);

        // Check users
        const [users] = await connection.execute<UserRow[]>(
            "SELECT id FROM users WHERE id IN (?, ?)",
            [userLowId, userHighId]
        );

        if (users.length !== 2) {
            throw new Error("One or both users do not exist");
        }

        // Insert new chat or ignore duplicate pair
        const [insertResult] = await connection.execute<ResultSetHeader>(
            `INSERT IGNORE INTO chats (user_low_id, user_high_id)
             VALUES (?, ?)`,
            [userLowId, userHighId]
        );

        const isNew = insertResult.affectedRows === 1;

        // Retrieve chat ID
        const [chats] = await connection.execute<ChatRow[]>(
            `SELECT id FROM chats
             WHERE user_low_id = ? AND user_high_id = ?`,
            [userLowId, userHighId]
        );

        if (chats.length === 0) {
            throw new Error("Failed to create or retrieve chat");
        }

        const chatId = chats[0].id;

        // Ensure memberships exist
        await connection.execute(
            `INSERT IGNORE INTO chat_members (chat_id, user_id)
             VALUES (?, ?), (?, ?)`,
            [chatId, userLowId, chatId, userHighId]
        );

        await connection.commit();

        return {
            chatId,
            isNew
        };

    } catch (error) {
        await connection.rollback();
        throw error;

    } finally {
        connection.release();
    }
};

export const isUserChatMember = async (
    chatId: number,
    userId: number
): Promise<boolean> => {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT id
         FROM chat_members
         WHERE chat_id = ? AND user_id = ?
         LIMIT 1`,
        [chatId, userId]
    );

    return rows.length > 0;
};

export const getUserChats = async (userId: number) => {
    // Check whether the user exists
    const [userRows] = await pool.execute<RowDataPacket[]>(
        "SELECT id FROM users WHERE id = ?",
        [userId]
    );

    if (userRows.length === 0) {
        throw new Error("User not found");
    }

    // Fetch chats belonging to the user and their member IDs
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT
            c.id AS chatId,
            c.created_at AS createdAt,
            GROUP_CONCAT(cm.user_id ORDER BY cm.user_id) AS memberIds
        FROM chats c
        INNER JOIN chat_members cm ON cm.chat_id = c.id
        WHERE c.id IN (
            SELECT chat_id
            FROM chat_members
            WHERE user_id = ?
        )
        GROUP BY c.id, c.created_at
        ORDER BY c.created_at DESC`,
        [userId]
    );

    return rows.map((row) => ({
        chatId: Number(row.chatId),
        memberIds: String(row.memberIds)
            .split(",")
            .map(Number),
        createdAt: new Date(row.createdAt).toISOString(),
    }));
};