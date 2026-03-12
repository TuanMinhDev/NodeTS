import express from "express";
import { checkPermission } from "../auth_user/middleware";
import { followSeller, unfollowSeller, getFollowedSellers, getSellerFollowers, checkFollowStatus } from "./controller/followerController";

const followerRouter = express.Router();

followerRouter.post("/follow", checkPermission(["admin", "user", "seller"]), followSeller);
followerRouter.delete("/unfollow/:sellerId", checkPermission(["admin", "user", "seller"]), unfollowSeller);
followerRouter.get("/following", checkPermission(["admin", "user", "seller"]), getFollowedSellers);
followerRouter.get("/followers/:sellerId", checkPermission(["admin", "user", "seller"]), getSellerFollowers);
followerRouter.get("/status/:sellerId", checkPermission(["admin", "user", "seller"]), checkFollowStatus);

export default followerRouter;
