import express from "express";
import { register, login, logout, changePassword, refreshToken } from "./controller/authController";
import { getMe, updateInfoUser, getAllUser, deleteUser, getPublicSellerProfile } from "./controller/userController";
import { getRecentViews } from "../product/controller/productViewController";
import { checkPermission } from "./middleware/index";
const userRouter = express.Router();




userRouter.post("/register", register);
userRouter.post("/login", login);
userRouter.post("/logout", logout);
userRouter.get("/seller/:sellerId", getPublicSellerProfile);
userRouter.get("/me", checkPermission(["admin", "user"]), getMe);
userRouter.get("/me/recent-views", checkPermission(["admin", "user"]), getRecentViews);
userRouter.put("/update-info", checkPermission(["admin", "user"]), updateInfoUser);
userRouter.get("/all", checkPermission(["admin"]), getAllUser);
userRouter.delete("/delete/:id", checkPermission(["admin"]), deleteUser);
userRouter.post("/change-password", checkPermission(["admin", "user"]), changePassword);
userRouter.post("/refresh-token", refreshToken);
export default userRouter;