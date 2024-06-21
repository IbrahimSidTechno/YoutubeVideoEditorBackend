import express from "express";
import { downloadTrim, getAllStatus, videoGet, videoGetById, videosend } from "../controllers/videoControllers.js";
import upload from "../midlewares.js/multer.js";


const route = express.Router();

route.route("/getallstatus").get(getAllStatus)
route.route("/videosend").post(videosend)
route.route("/videoget/:id").get(videoGetById)
route.route("/videoget").get(videoGet)
route.route("/download/trim").post(downloadTrim)




export default route;
