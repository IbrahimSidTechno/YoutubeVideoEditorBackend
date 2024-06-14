import express from "express";
import ytdl from "ytdl-core";
import { exec } from "child_process";
import multer from "multer";
import ffmpeg from 'fluent-ffmpeg'
import uploadResult from "../utils/cloudinary.js";
import fs from "fs"
import file from '../models/VideosModel.js'


const route = express.Router();
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/uploads")
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
});
const upload = multer({ storage: storage });


// Multer middleware to handle file uploads

// POST route to handle downloading and saving videos

const sanitizeFilename = (filename) => {
  // Replace invalid characters with underscores
  return filename.replace(/[^\w.-]/g, '_');
};
route.post('/videosend', upload.single('video'), async (req, res) => {
  try {
    // Extract the 'url' parameter from the request body
    const { url } = req.body;

    // Log the URL to verify it's received correctly

    // Get video information using ytdl library
    const info = await ytdl.getInfo(url);

    // Choose the highest quality format for the video
    const format = ytdl.chooseFormat(info.formats, { quality: 'highest' });

    // Set the filename for the downloaded video
    const filename = sanitizeFilename(info.videoDetails.title) + '.mp4';
    const filePath = './public/uploads/' + filename;

    

    // Pipe the video stream from ytdl to the file stream for saving
    const fileStream = fs.createWriteStream(filePath);
    ytdl(url, { format }).pipe(fileStream);

    // Wait for the file to finish writing
    await new Promise((resolve, reject) => {
      fileStream.on('finish', resolve);
      fileStream.on('error', reject);
    });
    // Upload the video to Cloudinary
    const cloudinaryResult = await uploadResult(filePath); // Adjust the function call accordingly

    const data =  await file.create({

      downloadedlink:cloudinaryResult.url,
      filename:filePath
    })
    // Respond with success message and Cloudinary result
    res.status(200).json({ message: 'Video saved and uploaded successfully.', data });
  } catch (error) {
    // Handle errors gracefully
    console.error("Error:", error);
    res.status(500).send(error.message);
  }
});

route.get('/videoget/:id', async (req, res) => {
const {id} = req.params
const response = await file.findById(id)

res.json(
  response
)

})



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

route.post("/download/trim", async (req, res) => {
  const { startTime, endTime ,_id } = req.body;
  console.log(startTime, endTime,_id);

const data = await file.findById(_id)
console.log(data);
  const videoPath = data.filename

  const re = await uploadResult(videoPath)

  console.log(re.url);
  // Output file path for trimmed video
  const trimmedFilePath = './public/uploads/trimmed_video.mp4';

  // Trim the video using ffmpeg
  ffmpeg(videoPath)
    .setStartTime(startTime)
    .setDuration(endTime - startTime)
    .output(trimmedFilePath)
    .on('end', function () {
      console.log('Trimmed video saved at:', trimmedFilePath);
      res.download(trimmedFilePath, 'trimmed_video.mp4', (err) => {
        if (err) {
          console.error(`Error sending trimmed video: ${err}`);
          return res.status(500).json({ error: 'Error sending trimmed video.' });
        }
        console.log('Trimmed video sent successfully.');
        // Uncomment the line below if you want to delete the trimmed video file after sending
        fs.unlinkSync(trimmedFilePath);
      });
    })
    .on('error', function (err) {
      console.error('Error trimming video:', err);
      return res.status(500).json({ error: 'Error trimming video.' });
    })
    .run();
});
export default route;
