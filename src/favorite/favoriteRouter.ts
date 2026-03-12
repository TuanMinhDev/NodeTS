import express from "express";
import { checkPermission } from "../auth_user/middleware";
import { addToFavorites, removeFromFavorites, getFavorites, checkFavorite } from "./controller/favoriteController";

const favoriteRouter = express.Router();

favoriteRouter.post("/", checkPermission(["admin", "user", "seller"]), addToFavorites);
favoriteRouter.delete("/:productId", checkPermission(["admin", "user", "seller"]), removeFromFavorites);
favoriteRouter.get("/", checkPermission(["admin", "user", "seller"]), getFavorites);
favoriteRouter.get("/check/:productId", checkPermission(["admin", "user", "seller"]), checkFavorite);

export default favoriteRouter;
