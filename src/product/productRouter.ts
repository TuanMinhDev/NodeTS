import express from "express";
import { createProduct, getProduct, updateProduct, deleteProduct } from "./controller/productController";
import { checkPermission } from "../auth_user/middleware";
const productRouter = express.Router();

productRouter.post("/create", checkPermission(["admin", "seller"]), createProduct);
productRouter.get("/get", getProduct);
productRouter.put("/update/:id", checkPermission(["admin", "seller"]), updateProduct);
productRouter.delete("/delete/:id", checkPermission(["admin", "seller"]), deleteProduct);

export default productRouter;