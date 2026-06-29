import mongoose from "mongoose";

const searchLogSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        keyword: {
            type: String,
            required: true,
            trim: true,
        },
        resultProductIds: {
            type: [mongoose.Schema.Types.ObjectId],
            default: [],
        },
        searchedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: false }
);

searchLogSchema.index({ userId: 1, searchedAt: -1 });
searchLogSchema.index({ searchedAt: -1 });

const SearchLog = mongoose.model("SearchLog", searchLogSchema, "search_logs");

export default SearchLog;
