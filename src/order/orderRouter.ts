import express from "express";
import { checkPermission } from "../auth_user/middleware";
import { createOrder, getOrders, getOrder, updateStatusOrder } from "./controller/orderController";

const orderRouter = express.Router();

orderRouter.post("/create", checkPermission(["admin", "user", "seller"]), createOrder);
orderRouter.get("/", checkPermission(["admin", "user", "seller"]), getOrders);
orderRouter.get("/:id", checkPermission(["admin", "user", "seller"]), getOrder);
orderRouter.put("/status/:id", checkPermission(["admin", "seller"]), updateStatusOrder);

export default orderRouter;