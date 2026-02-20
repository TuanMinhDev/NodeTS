import express from "express";
import connectDB from "./config/mongoodb";
import router from "./src/index";
const app = express();

connectDB();
app.use(express.json());

app.use("/api/v1",router);
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});

export default app;