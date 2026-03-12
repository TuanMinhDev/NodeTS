import express from "express";
import { checkPermission } from "../auth_user/middleware";
import { createCategory, getCategories, getCategory, updateCategory, deleteCategory } from "./controller/categoryController";

const categoryRouter = express.Router();

categoryRouter.post("/", checkPermission(["admin", "seller"]), createCategory);
categoryRouter.get("/", getCategories);
categoryRouter.get("/:id", getCategory);
categoryRouter.put("/:id", checkPermission(["admin", "seller"]), updateCategory);
categoryRouter.delete("/:id", checkPermission(["admin", "seller"]), deleteCategory);

export default categoryRouter;
