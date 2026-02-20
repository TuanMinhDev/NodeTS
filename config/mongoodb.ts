import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const connectDB = async () => {
  try {
    const PASSWORD = process.env.DB_PW;
    const CLOUD_DB_COMPASS = `mongodb+srv://hotuanminh1802:${PASSWORD}@cluster0.tgbwv0n.mongodb.net/?appName=Cluster0`;

    await mongoose.connect(CLOUD_DB_COMPASS, {});
    console.log("Connect Successful!");
  } catch (err) {
    console.log("Connect failed!", err);
  }
};

export default connectDB;
