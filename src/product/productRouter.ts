import express from "express";
import {
    createProduct,
    getProduct,
    getProductsForSeller,
    getProductById,
    updateProduct,
    deleteProduct,
} from "./controller/productController";
import { recordProductView } from "./controller/productViewController";
import { checkPermission } from "../auth_user/middleware";
import { uploadProductImages } from "./middleware";

const productRouter = express.Router();

productRouter.post("/create", checkPermission(["admin"]), uploadProductImages.array("images", 10), createProduct);
productRouter.get("/get", getProduct);
productRouter.get("/seller", checkPermission(["admin"]), getProductsForSeller);
productRouter.post("/:productId/view", checkPermission(["admin", "user"]), recordProductView);
productRouter.get("/:id", getProductById);
productRouter.put("/:id", checkPermission(["admin"]), uploadProductImages.array("images", 10), updateProduct);
productRouter.delete("/:id", checkPermission(["admin"]), deleteProduct);

export default productRouter;
