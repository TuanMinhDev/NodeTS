import express from "express";
import { checkPermission } from "../auth_user/middleware";
import { createNotification, getNotifications, markAsRead, markAllAsRead, deleteNotification } from "./controller/notificationController";

const notificationRouter = express.Router();

notificationRouter.post("/", checkPermission(["admin"]), createNotification);
notificationRouter.get("/", checkPermission(["admin", "user", "seller"]), getNotifications);
notificationRouter.put("/:id/read", checkPermission(["admin", "user", "seller"]), markAsRead);
notificationRouter.put("/read-all", checkPermission(["admin", "user", "seller"]), markAllAsRead);
notificationRouter.delete("/:id", checkPermission(["admin", "user", "seller"]), deleteNotification);

export default notificationRouter;
