import express from "express";
import userRouter from "./auth_user/router";
import productRouter from "./product/productRouter";
import cartRouter from "./cart/cartRouter";
import orderRouter from "./order/orderRouter";

import notificationRouter from "./notification/notificationRouter";

const router = express.Router();

router.use("/user", userRouter);
router.use("/product", productRouter);
router.use("/cart", cartRouter);
router.use("/order", orderRouter);
router.use("/notification", notificationRouter);

export default router;