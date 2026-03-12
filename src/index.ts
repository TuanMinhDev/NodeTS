import express from "express";
import userRouter from "./auth_user/router";
import productRouter from "./product/productRouter";
import cartRouter from "./cart/cartRouter";
import orderRouter from "./order/orderRouter";
import categoryRouter from "./category/categoryRouter";
import commentRouter from "./comment/commentRouter";
import favoriteRouter from "./favorite/favoriteRouter";
import notificationRouter from "./notification/notificationRouter";
import addressRouter from "./address/addressRouter";
import followerRouter from "./follower/followerRouter";
import messageRouter from "./message/messageRouter";

const router = express.Router();

router.use("/user", userRouter);
router.use("/product", productRouter);
router.use("/cart", cartRouter);
router.use("/order", orderRouter);
router.use("/category", categoryRouter);
router.use("/comment", commentRouter);
router.use("/favorite", favoriteRouter);
router.use("/notification", notificationRouter);
router.use("/address", addressRouter);
router.use("/follower", followerRouter);
router.use("/message", messageRouter);

export default router;