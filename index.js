import express from 'express';
// require("dotenv").config();
import cors from 'cors'
// import {sendResponse} from './helper/helper.js'
import mongoose from 'mongoose';
import userRouter from './routes/VideosRoute.js'
const app = express();
app.use(express.json());
app.use(cors());
app.use("/uploads/", express.static("uploads"));

app.use(
  "/api",
  userRouter
);

const PORT = 4000;
const MONGODB_URI =
  "mongodb+srv://ibrahimsidtechno:ibrahim123@cluster0.e5wtkps.mongodb.net/";
  
const connectWithRetry = () => {
  mongoose
    .connect(MONGODB_URI)
    .then(() => {
      console.log(
        `Database Is Successfuly Connect And Running On => ${PORT} Port`
      );
      app.listen(process.env.PORT);
    })
    .catch((err) => {
      console.log("Database connection unsuccessful, retry after 5 seconds.");
      console.error(err);
      setTimeout(connectWithRetry, 5000);
    });
};
connectWithRetry();

const server = app.listen(PORT, () => {
  console.log(`Server successFully Running on ${PORT}`);
});
