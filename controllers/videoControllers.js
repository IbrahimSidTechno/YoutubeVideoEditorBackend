
import ytdl from "ytdl-core";
import ffmpeg from 'fluent-ffmpeg'
import fs from "fs"
import uploadResult from "../utils/cloudinary.js";
import file from '../models/VideosModel.js'
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import DeleteFile from "../utils/cloudinaryDeleteVideo.js";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';


const getFileSizeInMB = (filePath) => {
    try {
        const stats = fs.statSync(filePath); // Get file stats synchronously
        const fileSizeInBytes = stats.size; // File size in bytes
        const fileSizeInMB = fileSizeInBytes / (1024 * 1024); // Convert bytes to megabytes
        return fileSizeInMB.toFixed(2); // Return size rounded to 2 decimal places
    } catch (error) {
        console.error('Error getting file size:', error);
        return null;
    }
};



const sanitizeFilename = (filename) => {
    // Replace invalid characters with underscores
    return filename.replace(/[^\w.-]/g, '_');
};






const videosend = async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            throw new ApiError(404, "Url Is Undefined");
        }

        // Get video information using ytdl library
        const info = await ytdl.getInfo(url);
        if (!info) {
            throw new ApiError(404, "Url not Correct");
        }

        // Choose the highest quality format for the video
        const format = ytdl.chooseFormat(info.formats, { filter: 'videoandaudio', quality: 'highestvideo' });

        // Set the filename for the downloaded video
        const filename = sanitizeFilename(info.videoDetails.title) + '.mp4';

        // Construct the file path relative to the current script's directory
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const filePath = join(__dirname, '../public/uploads', filename);

        // Pipe the video stream from ytdl to the file stream for saving
        const fileStream = fs.createWriteStream(filePath);
        ytdl(url, { format }).pipe(fileStream);

        // Wait for the file to finish writing
        await new Promise((resolve, reject) => {
            fileStream.on('finish', resolve);
            fileStream.on('error', reject);
        });

        // Upload the video to Cloudinary
        const mb = getFileSizeInMB(filePath);
        // console.log(mb);
        // const cloudinaryResult = await uploadResult(filePath); // Adjust the function call accordingly

        // Save data to database or perform further actions
        const data = await file.create({
            downloadedlink: `http://192.168.18.196:4000/uploads/${filename}`,
            filename: filePath
        });

        // Respond with success message and Cloudinary result
        res.status(200).json(new ApiResponse(200, data, "Data Add Successfully"));
    } catch (error) {
        // Handle errors gracefully
        console.error("Error:", error);
        res.status(500).send(error.message);
    }
};


const videoGetById = asyncHandler(async (req, res) => {
    const { id } = req.params
    if (!id) {
        throw new ApiError(404, "Id Is Undefined")
    }
    const response = await file.findById(id)
    if (!response) {
        throw new ApiError(404, "Id Not Correct")
    }
    res.json(
        response
    )
})

const videoGet = asyncHandler(async (req, res) => {
    try {
        // Extract the 'url' parameter from the request query
        const { url } = req.query;
        if (!url) {
            throw new ApiError(404, "Url Is Undefined");
        }

        // Log the URL to verify it's received correctly
        console.log("Requested URL:", url);

        // Get video information using ytdl library
        const info = await ytdl.getInfo(url);
        if (!info) {
            throw new ApiError(404, "Url not Correct");
        }

        // Choose the format with both video and audio (highest quality)
        const format = ytdl.chooseFormat(info.formats, { filter: 'videoandaudio', quality: 'highestvideo' });

        // Extract video title from the video information
        const title = info.videoDetails.title;

        // Calculate file size in megabytes
        let fileSizeInBytes = 0;
        if (format && format.contentLength) {
            fileSizeInBytes = parseInt(format.contentLength);
        } else {
            // Fallback mechanism: Estimate file size based on duration and bitrate
            const durationInSeconds = info.videoDetails.lengthSeconds;
            const estimatedBitrate = format.bitrate || 1; // Default to 1 if bitrate is not available
            fileSizeInBytes = durationInSeconds * estimatedBitrate / 8; // Calculate estimated file size in bytes
        }
        const fileSizeInMB = fileSizeInBytes / (1024 * 1024);

        // Log the title and file size to verify they're correctly set
        console.log(`Title: ${title}, File Size: ${Math.round(fileSizeInMB)} MB`);

        // Set response headers to indicate file download and size
        res.setHeader(
            "Content-Disposition",
            `attachment; filename*=UTF-8''${encodeURIComponent(title)}.mp4`
        );
        res.setHeader("File-Size-MB", Math.round(fileSizeInMB));

        // Pipe the video stream from ytdl to the response stream
        ytdl(url, { format }).pipe(res);
    } catch (error) {
        // Handle errors gracefully
        console.error("Error:", error);
        res.status(error.statusCode || 500).send(error.message);
    }
});







const downloadTrim = asyncHandler(async (req, res) => {
    const { startTime, endTime, _id ,isPublished} = req.body;
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    if(isPublished){
        const isDeleted = await file.findByIdAndUpdate(_id,{
            $set:{
                isPublished
            },
        },{new:true});
        console.log(isDeleted);
    }
    // Fetch video information from database based on _id
    const data = await file.findById(_id);
    if (!data) {
        throw new Error('File not found');
    }

    const videoPath = data.filename; // Assuming this is the path to the original video file

    // Output file path for trimmed video (public/trim/trimmed_video_<_id>.mp4)
    const trimmedFileName = `trimmed_video_${_id}.mp4`;
    const trimmedFilePath = join(__dirname, '../public/trim', trimmedFileName);

    // Trim the video using ffmpeg
    ffmpeg(videoPath)
        .setStartTime(startTime)
        .setDuration(endTime - startTime)
        .output(trimmedFilePath)
        .on('end', async () => {
            // Send trimmed video file as a download
            res.status(200).download(trimmedFilePath, 'trimmed_video.mp4', async (err) => {
                if (err) {
                    console.error(`Error sending trimmed video: ${err}`);
                    return res.status(500).json({ error: 'Error sending trimmed video.' });
                }

                // Clean up: Delete original video file and database entry
                try {
                    await fs.promises.unlink(videoPath);
                    const isDeleted = await file.findByIdAndUpdate(_id,{
                        $set:{
                            downloadedlink: `http://192.168.18.196:4000/trim/${trimmedFileName}`
                        },
                    },{new:true});
                    
                    console.log(isDeleted);
                } catch (error) {
                    console.error('Error deleting files:', error);
                    return res.status(500).json({ error: 'Error deleting files.' });
                }
            });
        })
        .on('error', (err) => {
            console.error('Error trimming video:', err);
            return res.status(500).json({ error: 'Error trimming video.' });
        })
        .run();
});




const getAllStatus = asyncHandler(async(req,res) =>{
    const data = await file.find({isPublished:true})


    res.status(200).json(new ApiResponse(200,data,"All Data Fetched Successfully"))

})


export {
    getAllStatus,
    downloadTrim,
    videoGet,
    videoGetById,
    videosend
}
