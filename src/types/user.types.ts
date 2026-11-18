export interface CreateUserRequest {
    name: string;
    email: string;
}

export interface CreateUserResponse {
    userId: number;
    name: string;
    email: string;
}