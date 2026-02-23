import express from "express";
import { checkPermission } from "../auth_user/middleware";
import { createCart, deleteProductCart, getCart, updateQuantityProductCart } from "./controller/cartController";


const cartRouter = express.Router();

cartRouter.post("/create", checkPermission(["admin", "seller", 'user']), createCart);
cartRouter.get("/get", checkPermission(["admin", "seller", 'user']), getCart);

cartRouter.delete("/delete", checkPermission(["admin", "seller", 'user']), deleteProductCart);
cartRouter.put("/update/:id", checkPermission(["admin", "seller", 'user']), updateQuantityProductCart);

export default cartRouter;

