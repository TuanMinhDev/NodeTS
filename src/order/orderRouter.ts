import express from "express";
import { checkPermission } from "../auth_user/middleware";
import {
    createOrder,
    getOrders,
    getOrdersForSeller,
    getOrder,
    getOrderForSeller,
    updateStatusOrder,
} from "./controller/orderController";

const orderRouter = express.Router();


orderRouter.post("/create", checkPermission(["admin", "user"]), createOrder);
orderRouter.get("/", checkPermission(["admin", "user"]), getOrders);
orderRouter.get("/seller", checkPermission(["admin"]), getOrdersForSeller);
orderRouter.get("/seller/:id", checkPermission(["admin"]), getOrderForSeller);
orderRouter.get("/:id", checkPermission(["admin", "user"]), getOrder);
orderRouter.put("/status/:id", checkPermission(["admin"]), updateStatusOrder);

export default orderRouter;