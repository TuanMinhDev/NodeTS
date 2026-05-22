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

const io = initializeSocketIO(server);
initializeMessageSocket(io);

app.use(cors({
  origin: ["http://localhost:3000", "http://192.168.1.47:3000", "http://localhost:5173", "http://localhost:4000"],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

app.use("/api/v1",router);
server.listen(3000, "0.0.0.0", () => {
  console.log("Server is running on http://192.168.1.47:3000");
});

export default app;