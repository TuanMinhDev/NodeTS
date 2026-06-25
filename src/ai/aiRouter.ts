import express from "express";
import { checkPermission } from "../auth_user/middleware";
import {
    getRecommendations,
    getPopularProducts,
    healthCheck,
    chatWithAi,
} from "./controller/aiController";

const aiRouter = express.Router();

// Recommendation (cần auth)
aiRouter.get("/recommend", checkPermission(["admin", "user"]), getRecommendations);

// Popular Products (không cần auth)
aiRouter.get("/recommend/popular", getPopularProducts);

// AI Chat (không cần auth)
aiRouter.post("/chat", chatWithAi);

// Health check
aiRouter.get("/health", healthCheck);

export default aiRouter;
