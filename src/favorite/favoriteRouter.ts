import express from "express";
import { checkPermission } from "../auth_user/middleware";
import { addToFavorites, removeFromFavorites, getFavorites } from "./controller/favoriteController";

const favoriteRouter = express.Router();

favoriteRouter.post("/", checkPermission(["admin", "user"]), addToFavorites);
favoriteRouter.delete("/:productId", checkPermission(["admin", "user"]), removeFromFavorites);
favoriteRouter.get("/", checkPermission(["admin", "user"]), getFavorites);

export default favoriteRouter;
