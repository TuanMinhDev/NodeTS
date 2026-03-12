import express from "express";
import { checkPermission } from "../auth_user/middleware";
import { createAddress, getAddresses, getAddress, updateAddress, deleteAddress, setDefaultAddress } from "./controller/addressController";

const addressRouter = express.Router();

addressRouter.post("/", checkPermission(["admin", "user", "seller"]), createAddress);
addressRouter.get("/", checkPermission(["admin", "user", "seller"]), getAddresses);
addressRouter.get("/:id", checkPermission(["admin", "user", "seller"]), getAddress);
addressRouter.put("/:id", checkPermission(["admin", "user", "seller"]), updateAddress);
addressRouter.delete("/:id", checkPermission(["admin", "user", "seller"]), deleteAddress);
addressRouter.put("/:id/default", checkPermission(["admin", "user", "seller"]), setDefaultAddress);

export default addressRouter;
