import express from "express";
import connectDB from "./config/mongoodb";

const app = express();

connectDB();

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});

export default app;