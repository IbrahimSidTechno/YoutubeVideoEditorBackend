import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import userRouter from './routes/VideosRoute.js';

const app = express();
app.use(express.json());
app.use(cors());
app.use("/uploads/", express.static("uploads"));
// app.use("/api", userRouter);
app.get('/api/videoget', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      throw new ApiError(400, 'URL parameter is missing');
    }

    // Get video information using ytdl library
    const info = await ytdl.getInfo(url);
    if (!info) {
      throw new ApiError(404, 'Video information not found');
    }

    // Choose the format with both video and audio (highest quality)
    const format = ytdl.chooseFormat(info.formats, { filter: 'videoandaudio', quality: 'highestvideo' });

    // Set response headers to indicate file download
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(info.videoDetails.title)}.mp4`
    );

    // Pipe the video stream from ytdl to the response stream
    ytdl(url, { format }).pipe(res);
  } catch (error) {
    // Handle errors gracefully
    console.error('Error:', error);
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});


const PORT = process.env.PORT || 4000;
const MONGODB_URI = "mongodb+srv://ibrahimsidtechno:ibrahim123@cluster0.e5wtkps.mongodb.net/";

const connectWithRetry = () => {
  mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
      console.log(`Database connected successfully.`);
    })
    .catch((err) => {
      console.error("Database connection unsuccessful:", err.message);
      setTimeout(connectWithRetry, 5000);
    });
};

connectWithRetry();

const server = app.listen(PORT, () => {
  console.log(`Server successfully running on port ${PORT}`);
});
