import express from "express";
import ytdl from "ytdl-core";
import { exec } from "child_process";
import multer from "multer";
import ffmpeg from 'fluent-ffmpeg'


const route = express.Router();
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/uploads")
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
});


// Multer middleware to handle file uploads
const upload = multer({ storage: storage });
// POST route to handle creating new download statistics
route.get('/videoget', async (req, res) => {
    try {
        // Extract the 'url' parameter from the request query
        const { url } = req.query;
        
        // Log the URL to verify it's received correctly
        console.log("Received URL:", url);

        // Get video information using ytdl library
        const info = await ytdl.getInfo(url);
        
        // Choose the highest quality format for the video
        const format = ytdl.chooseFormat(info.formats, { quality: "highest" });
        
        // Extract video title from the video information
        const title = info.videoDetails.title;
    
        // Set response headers to indicate file download
        res.setHeader(
          "Content-Disposition",
          `attachment; filename*=UTF-8''${encodeURIComponent(title)}.mp4`
        );
        
        // Log the title to verify it's correctly set
        console.log("Video Title:", title);
        
        // Pipe the video stream from ytdl to the response stream
        ytdl(url, { format }).pipe(res);
    } catch (error) {
        // Handle errors gracefully
        console.error("Error:", error);
        res.status(500).send(error.message);
    }
})

route.post("/download/trim", upload.single("video"), async (req, res) => {
  const { startTime, endTime } = req.body;
  const videoPath = req.file.path;

  // Output file path for trimmed video
  const trimmedFilePath = './public/uploads/trimmed_video.mp4';

  // Trim the video using ffmpeg
  ffmpeg(videoPath)
  .setStartTime(startTime)
  .setDuration(endTime - startTime)
  .output(trimmedFilePath)
  .on('end', function() {
    console.log('Trimmed video saved at:', trimmedFilePath);
    res.download(trimmedFilePath, 'trimmed_video.mp4', (err) => {
      if (err) {
        console.error(`Error sending trimmed video: ${err}`);
        return res.status(500).json({ error: 'Error sending trimmed video.' });
      }
      console.log('Trimmed video sent successfully.');
      // Uncomment the line below if you want to delete the trimmed video file after sending
      // fs.unlinkSync(trimmedFilePath);
    });
  })
  .on('error', function(err) {
    console.error('Error trimming video:', err);
    return res.status(500).json({ error: 'Error trimming video.' });
  })
  .run();
});
export default route;
