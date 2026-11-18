import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { registerUser } from "../services/user.service.js";

export const createUserController = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const schema = z.object({
            name: z.string().trim().min(2).max(100),
            email: z.string().trim().email().max(255),
        });

        const parsedBody = schema.safeParse(req.body);

        if (!parsedBody.success) {
            return res.status(400).json({
                success: false,
                message: "Valid name and email are required",
            });
        }

        const user = await registerUser(
            parsedBody.data.name,
            parsedBody.data.email
        );

        return res.status(201).json({
            success: true,
            message: "User created successfully",
            data: user,
        });
    } catch (error) {
        if (
            error instanceof Error &&
            error.message === "Email already exists"
        ) {
            return res.status(409).json({
                success: false,
                message: error.message,
            });
        }

        next(error);
    }
};