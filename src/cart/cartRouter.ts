import express from "express";
import { checkPermission } from "../auth_user/middleware";
import { createCart, deleteProductCart, getCart, updateQuantityProductCart } from "./controller/cartController";


const cartRouter = express.Router();

cartRouter.post("/create", checkPermission(["admin", "user"]), createCart);
cartRouter.get("/get", checkPermission(["admin", "user"]), getCart);

cartRouter.delete("/delete", checkPermission(["admin", "user"]), deleteProductCart);
cartRouter.put("/update/:id/:itemId", checkPermission(["admin", "user"]), updateQuantityProductCart);

export default cartRouter;

