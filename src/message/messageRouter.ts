import express from "express";
import { checkPermission } from "../auth_user/middleware";
import { uploadMessageImage, uploadMessageImageToCloudinary } from "./middleware/imageUpload";
import { 
    createConversation, 
    getConversations, 
    getConversationById, 
    sendMessage, 
    getMessages, 
    markAsRead, 
    deleteMessage, 
    editMessage 
} from "./controller/messageController";

const messageRouter = express.Router();

// Conversation management
messageRouter.post("/conversation", checkPermission(["admin", "user", "seller"]), createConversation);
messageRouter.get("/conversations", checkPermission(["admin", "user", "seller"]), getConversations);
messageRouter.get("/conversation/:id", checkPermission(["admin", "user", "seller"]), getConversationById);

// Message operations
messageRouter.post("/send", checkPermission(["admin", "user", "seller"]), uploadMessageImage, uploadMessageImageToCloudinary, sendMessage);
messageRouter.get("/messages/:conversationId", checkPermission(["admin", "user", "seller"]), getMessages);
messageRouter.put("/read/:conversationId", checkPermission(["admin", "user", "seller"]), markAsRead);
messageRouter.delete("/message/:id", checkPermission(["admin", "user", "seller"]), deleteMessage);
messageRouter.put("/message/:id", checkPermission(["admin", "user", "seller"]), editMessage);

export default messageRouter;
