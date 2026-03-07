import { Router } from "express";
import { checkPermission } from "../auth_user/middleware";
import {
    createNotification,
    getNotificationsByUser,
    getNotificationById,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    getUnreadCount,
    createBulkNotifications
} from "./controller/notificationController";

const router = Router();

router.post("/", checkPermission(["admin", "user"]), createNotification);
router.post("/bulk", checkPermission(["admin"]), createBulkNotifications);
router.get("/", checkPermission(["admin", "user"]), getNotificationsByUser);
router.get("/unread-count", checkPermission(["admin", "user"]), getUnreadCount);
router.get("/:id", checkPermission(["admin", "user"]), getNotificationById);
router.patch("/:id/read", checkPermission(["admin", "user"]), markAsRead);
router.patch("/read-all", checkPermission(["admin", "user"]), markAllAsRead);
router.delete("/:id", checkPermission(["admin", "user"]), deleteNotification);
router.delete("/clear-all", checkPermission(["admin", "user"]), clearAllNotifications);

export default router;
