import express from "express";
import cors from "cors";
import chatRoutes from "./routes/chat.routes.js";
import { listUserChatsController } from "./controllers/chat.controller.js";
import { createUserController } from "./controllers/user.controller.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
    res.status(200).json({
        success: true,
        message: "Chat backend is running"
    });
});

app.use("/chat", chatRoutes);
app.get("/user/:userId/chats", listUserChatsController);
app.post("/user/create", createUserController);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);

    res.status(500).json({
        success: false,
        message: "Internal server error"
    });
});

export default app;