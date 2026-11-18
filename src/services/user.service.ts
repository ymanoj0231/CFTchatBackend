import { createUser as createUserRepository } from "../repositories/user.repository.js";
import type { CreateUserResponse } from "../types/user.types.js";

export const registerUser = async (
    name: string,
    email: string
): Promise<CreateUserResponse> => {
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedName || !normalizedEmail) {
        throw new Error("Name and email are required");
    }

    return await createUserRepository(
        normalizedName,
        normalizedEmail
    );
};