import express from "express";
import { checkPermission } from "../auth_user/middleware";
import { addToCart, deleteProductCart, getCart, updateQuantityProductCart } from "./controller/cartController";


const cartRouter = express.Router();

cartRouter.post("/add", checkPermission(["admin", "user", "seller"]), addToCart);
cartRouter.get("/get", checkPermission(["admin", "user"]), getCart);

cartRouter.delete("/delete", checkPermission(["admin", "user"]), deleteProductCart);
cartRouter.put("/update/:id", checkPermission(["admin", "user"]), updateQuantityProductCart);

export default cartRouter;

