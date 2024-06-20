import express from "express";
import { downloadTrim, videoGet, videoGetById, videosend } from "../controllers/videoControllers.js";
import upload from "../midlewares.js/multer.js";


const route = express.Router();


route.route("/videosend").post(upload.single('video'),videosend)
route.route("/videoget/:id").get(videoGetById)
route.route("/videoget").get(videoGet)
route.route("/download/trim").post(downloadTrim)




export default route;
