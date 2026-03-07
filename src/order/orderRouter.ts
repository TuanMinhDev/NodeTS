import express from "express";
import { checkPermission } from "../auth_user/middleware";
import { createOrder, getOrder, updateStatusOrder, deleteOrder } from "./controller/orderController";

const orderRouter = express.Router();

orderRouter.post("/create", checkPermission(["admin", "user"]), createOrder);
orderRouter.get("/get",checkPermission(["admin", "user"]), getOrder);
orderRouter.put("/:id/status", checkPermission(["admin"]), updateStatusOrder);
orderRouter.delete("/:id", checkPermission(["admin"]), deleteOrder);

export default orderRouter;