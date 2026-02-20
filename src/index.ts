import express from "express";
import userRouter from "./auth_user/router";
import productRouter from "./product/productRouter";

const router = express.Router();

router.use("/user", userRouter);
router.use("/product", productRouter);
export default router;