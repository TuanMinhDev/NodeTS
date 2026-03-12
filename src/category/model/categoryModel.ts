import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },
    description: {
        type: String,
        trim: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    image: {
        type: String,
        trim: true,
    },
},
    { timestamps: true });

const Category = mongoose.model("Category", categorySchema);

export default Category;
