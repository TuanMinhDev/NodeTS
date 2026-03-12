import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const connectDB = async () => {
  try {
    const PASSWORD = process.env.DB_PW;
    const CLOUD_DB_COMPASS = `mongodb+srv://hotuanminh1802_db_user:${PASSWORD}@cluster0.ipf4kez.mongodb.net/`;
    

    await mongoose.connect(CLOUD_DB_COMPASS, {});
    console.log("Connect Successful!");
  } catch (err) {
    console.log("Connect failed!", err);
  }
};

export default connectDB;
