import pool from "../config/mysql.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { CreateUserResponse } from "../types/user.types.js";

export const createUser = async (
    name: string,
    email: string
): Promise<CreateUserResponse> => {
    try {
        const [result] = await pool.execute<ResultSetHeader>(
            `INSERT INTO users (name, email)
             VALUES (?, ?)`,
            [name, email]
        );

        return {
            userId: result.insertId,
            name,
            email,
        };
    } catch (error) {
        if (
            error instanceof Error &&
            "code" in error &&
            error.code === "ER_DUP_ENTRY"
        ) {
            throw new Error("Email already exists");
        }

        throw error;
    }
};