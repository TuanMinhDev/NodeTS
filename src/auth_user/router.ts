import express from "express";
import { register, login, changePassword, refreshToken } from "./controller/authController";
import { getMe, updateInfoUser, getAllUser, deleteUser } from "./controller/userController";
import { checkPermission } from "./middleware/index";
const userRouter = express.Router();

userRouter.post("/register", register);
userRouter.post("/login", login);
userRouter.get("/me", checkPermission(["admin", "seller", "user"]), getMe);
userRouter.put("/update-info", checkPermission(["admin", "seller", "user"]), updateInfoUser);
userRouter.get("/all", checkPermission(["admin"]), getAllUser);
userRouter.delete("/delete/:id", checkPermission(["admin"]), deleteUser);
userRouter.post("/change-password", checkPermission(["admin", "seller", "user"]), changePassword);
userRouter.post("/refresh-token", refreshToken);
export default userRouter;