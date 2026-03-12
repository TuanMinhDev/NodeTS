import express from "express";
import { checkPermission } from "../auth_user/middleware";
import { createComment, getCommentsByProduct, updateComment, deleteComment, likeComment, replyToComment } from "./controller/commentController";

const commentRouter = express.Router();

commentRouter.post("/", checkPermission(["admin", "user", "seller"]), createComment);
commentRouter.get("/product/:productId", getCommentsByProduct);
commentRouter.put("/:id", checkPermission(["admin", "user", "seller"]), updateComment);
commentRouter.delete("/:id", checkPermission(["admin", "user", "seller"]), deleteComment);
commentRouter.post("/:id/like", checkPermission(["admin", "user", "seller"]), likeComment);
commentRouter.post("/:id/reply", checkPermission(["admin", "user", "seller"]), replyToComment);

export default commentRouter;
