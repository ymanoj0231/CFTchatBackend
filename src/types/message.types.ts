export interface SendMessageRequest {
    senderId: number;
    text: string;
}

export interface MessageResponse {
    messageId: string;
    chatId: number;
    senderId: number;
    text: string;
    createdAt: string;
}