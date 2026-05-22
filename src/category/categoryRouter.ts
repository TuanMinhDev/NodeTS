import express from "express";
import { checkPermission } from "../auth_user/middleware";
import { createCategory, getCategories, getCategory, updateCategory, deleteCategory } from "./controller/categoryController";

const categoryRouter = express.Router();

categoryRouter.post("/", checkPermission(["admin"]), createCategory);
categoryRouter.get("/", getCategories);
categoryRouter.get("/:id", getCategory);
categoryRouter.put("/:id", checkPermission(["admin"]), updateCategory);
categoryRouter.delete("/:id", checkPermission(["admin"]), deleteCategory);

export default categoryRouter;
