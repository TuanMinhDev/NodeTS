import express from "express";
import { checkPermission } from "../auth_user/middleware";
import { createComment, getCommentsByProduct, getReviewableItems } from "./controller/commentController";

const commentRouter = express.Router();

commentRouter.post("/", checkPermission(["admin", "user"]), createComment);
commentRouter.get("/product/:productId", getCommentsByProduct);
commentRouter.get("/order/:orderId/reviewable-items", checkPermission(["admin", "user"]), getReviewableItems);

export default commentRouter;
