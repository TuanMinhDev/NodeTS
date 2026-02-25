import express from "express";
import cors from "cors";
import connectDB from "./config/mongoodb";
import router from "./src/index";
const app = express();

connectDB();

// Cấu hình CORS
app.use(cors({
  origin: "*", // Cho phép tất cả origins, hoặc thay bằng domain cụ thể như "http://localhost:5173"
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

app.use("/api/v1",router);
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});

export default app;