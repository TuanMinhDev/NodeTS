import express from "express";
import cors from "cors";
import { createServer } from "http";
import connectDB from "./config/mongoodb";
import router from "./src/index";
import { initializeSocketIO } from "./src/notification/service/notificationService";
import { initializeMessageSocket } from "./src/message/service/messageService";

const app = express();
const server = createServer(app);

connectDB();

// Initialize Socket.IO
const io = initializeSocketIO(server);
initializeMessageSocket(io);

// Cấu hình CORS
app.use(cors({
  origin: "*", // Cho phép tất cả origins, hoặc thay bằng domain cụ thể như "http://localhost:5173"
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

app.use("/api/v1",router);
server.listen(3000, () => {
  console.log("Server is running on port 3000");
});

export default app;