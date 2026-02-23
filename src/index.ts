import express from "express";
import userRouter from "./auth_user/router";
import productRouter from "./product/productRouter";
import cartRouter from "./cart/cartRouter";

const router = express.Router();

router.use("/user", userRouter);
router.use("/product", productRouter);
router.use("/cart", cartRouter);
export default router;