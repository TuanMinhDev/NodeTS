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
messageRouter.post("/conversation", checkPermission(["admin", "user"]), createConversation);
messageRouter.get("/conversations", checkPermission(["admin", "user"]), getConversations);
messageRouter.get("/conversation/:id", checkPermission(["admin", "user"]), getConversationById);

// Message operations
messageRouter.post("/send", checkPermission(["admin", "user"]), uploadMessageImage, uploadMessageImageToCloudinary, sendMessage);
messageRouter.get("/messages/:conversationId", checkPermission(["admin", "user"]), getMessages);
messageRouter.put("/read/:conversationId", checkPermission(["admin", "user"]), markAsRead);
messageRouter.delete("/message/:id", checkPermission(["admin", "user"]), deleteMessage);
messageRouter.put("/message/:id", checkPermission(["admin", "user"]), editMessage);

export default messageRouter;
