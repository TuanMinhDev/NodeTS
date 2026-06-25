import express from "express";
import { checkPermission } from "../auth_user/middleware";
import { uploadMessageMedia, uploadMessageMediaToCloudinary } from "./middleware/mediaUpload";
import {
    getMyConversation,
    getConversations,
    getConversationById,
    sendMessage,
    getMessages,
    markAsRead,
    deleteMessage,
    editMessage,
} from "./controller/messageController";

const messageRouter = express.Router();

messageRouter.get("/my-conversation", checkPermission(["user"]), getMyConversation);
messageRouter.get("/conversations", checkPermission(["admin", "user"]), getConversations);
messageRouter.get("/conversation/:id", checkPermission(["admin", "user"]), getConversationById);

messageRouter.post(
    "/send",
    checkPermission(["admin", "user"]),
    uploadMessageMedia,
    uploadMessageMediaToCloudinary,
    sendMessage
);
messageRouter.get("/messages/:conversationId", checkPermission(["admin", "user"]), getMessages);
messageRouter.put("/read/:conversationId", checkPermission(["admin", "user"]), markAsRead);
messageRouter.delete("/message/:id", checkPermission(["admin", "user"]), deleteMessage);
messageRouter.put("/message/:id", checkPermission(["admin", "user"]), editMessage);

export default messageRouter;
