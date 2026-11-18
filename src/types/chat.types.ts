export interface CreateChatRequest {
    userAId: number;
    userBId: number;
}

export interface CreateChatResponse {
    chatId: number;
    isNew: boolean;
}