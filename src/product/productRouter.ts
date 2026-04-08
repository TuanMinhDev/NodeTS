import express from "express";
import { createProduct, getProduct, getProductById, updateProduct, deleteProduct } from "./controller/productController";
import { checkPermission } from "../auth_user/middleware";
import { uploadProductImages } from "./middleware";

const productRouter = express.Router();

productRouter.post("/create", checkPermission(["admin", "seller"]), uploadProductImages.array("images", 10), createProduct);
productRouter.get("/get", getProduct);
productRouter.get("/:id", getProductById);
productRouter.put("/:id", checkPermission(["admin", "seller"]), uploadProductImages.array("images", 10), updateProduct);
productRouter.delete("/:id", checkPermission(["admin", "seller"]), deleteProduct);

export default productRouter;
