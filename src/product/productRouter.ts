import express from "express";
import { createProduct, getProduct, updateProduct, deleteProduct } from "./controller/productController";
import { checkPermission } from "../auth_user/middleware";
import { uploadProductImages } from "./middleware";

const productRouter = express.Router();

productRouter.post("/create", uploadProductImages.array("images", 10), checkPermission(["admin", "seller"]), createProduct);
productRouter.get("/get", getProduct);
productRouter.put("/update/:id", uploadProductImages.array("images", 10), checkPermission(["admin", "seller"]), updateProduct);
productRouter.delete("/delete/:id", checkPermission(["admin", "seller"]), deleteProduct);

export default productRouter;
