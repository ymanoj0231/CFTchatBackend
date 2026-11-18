import pool from "./mysql.js";

async function checkDatabase(): Promise<void> {
    try {
        const connection = await pool.getConnection();

        console.log("MySQL connection successful!");

        connection.release();
    } catch (error) {
        console.error("MySQL connection failed:", error);
    } finally {
        await pool.end();
    }
}

checkDatabase();