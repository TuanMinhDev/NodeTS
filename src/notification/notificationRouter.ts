import express from "express";
import { checkPermission } from "../auth_user/middleware";
import { getNotifications, markAsRead, markAllAsRead, deleteNotification } from "./controller/notificationController";

const notificationRouter = express.Router();

notificationRouter.get("/", checkPermission(["admin", "user"]), getNotifications);
notificationRouter.put("/:id/read", checkPermission(["admin", "user"]), markAsRead);
notificationRouter.put("/read-all", checkPermission(["admin", "user"]), markAllAsRead);
notificationRouter.delete("/:id", checkPermission(["admin", "user"]), deleteNotification);

export default notificationRouter;
