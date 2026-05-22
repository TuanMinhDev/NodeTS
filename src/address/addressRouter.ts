import express from "express";
import { checkPermission } from "../auth_user/middleware";
import { addAddress, getAddresses, getAddressById, updateAddress, deleteAddress, setDefaultAddress } from "./controller/addressController";

const addressRouter = express.Router();

addressRouter.post("/",             checkPermission(["admin", "user"]), addAddress);
addressRouter.get("/",              checkPermission(["admin", "user"]), getAddresses);
addressRouter.get("/:id",           checkPermission(["admin", "user"]), getAddressById);
addressRouter.put("/:id",           checkPermission(["admin", "user"]), updateAddress);
addressRouter.delete("/:id",        checkPermission(["admin", "user"]), deleteAddress);
addressRouter.put("/:id/default",   checkPermission(["admin", "user"]), setDefaultAddress);

export default addressRouter;
