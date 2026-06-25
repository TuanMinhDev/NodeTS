import { Response } from "express";
import { AuthedRequest } from "../../_component";

const PYTHON_AI_URL = process.env.PYTHON_AI_URL || "http://localhost:8000";

// ─── Recommendation ─────────────────────────────────────────

export const getRecommendations = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        const limit = req.query.limit || 10;

        const response = await fetch(`${PYTHON_AI_URL}/recommend/${userId}?limit=${limit}`);
        const data = await response.json();
        return res.status(200).json(data);
    } catch (error: any) {
        console.error("Recommendation error:", error.message);
        return res.status(500).json({ message: "Lỗi kết nối AI service", error: error.message });
    }
};

// ─── Popular Products ───────────────────────────────────────

export const getPopularProducts = async (req: AuthedRequest, res: Response) => {
    try {
        const limit = req.query.limit || 10;

        const response = await fetch(`${PYTHON_AI_URL}/recommend/popular/all?limit=${limit}`);
        const data = await response.json();
        return res.status(200).json(data);
    } catch (error: any) {
        console.error("Popular products error:", error.message);
        return res.status(500).json({ message: "Lỗi kết nối AI service", error: error.message });
    }
};

// ─── Health check ───────────────────────────────────────────

export const healthCheck = async (req: AuthedRequest, res: Response) => {
    try {
        const response = await fetch(`${PYTHON_AI_URL}/health`);
        const data = await response.json();
        return res.status(200).json({ nodeTS: "ok", pythonAI: data });
    } catch (error: any) {
        return res.status(200).json({ nodeTS: "ok", pythonAI: "offline" });
    }
};

// ─── AI Chat ────────────────────────────────────────────────

export const chatWithAi = async (req: AuthedRequest, res: Response) => {
    try {
        const { message } = req.body;
        if (!message || !message.trim()) {
            return res.status(400).json({ message: "Tin nhắn không được để trống" });
        }

        const response = await fetch(`${PYTHON_AI_URL}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: message.trim() }),
        });
        const data = await response.json();
        return res.status(200).json(data);
    } catch (error: any) {
        console.error("AI Chat error:", error.message);
        return res.status(500).json({
            reply: "Xin lỗi, mình gặp lỗi khi kết nối AI. Bạn thử lại nhé! 🙏",
            products: [],
            error: error.message,
        });
    }
};
