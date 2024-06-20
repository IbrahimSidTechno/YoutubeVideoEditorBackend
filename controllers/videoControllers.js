
import ytdl from "ytdl-core";
import ffmpeg from 'fluent-ffmpeg'
import fs from "fs"
import uploadResult from "../utils/cloudinary.js";
import file from '../models/VideosModel.js'
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import DeleteFile from "../utils/cloudinaryDeleteVideo.js";


const sanitizeFilename = (filename) => {
    // Replace invalid characters with underscores
    return filename.replace(/[^\w.-]/g, '_');
};
const videosend = asyncHandler(async (req, res) => {
    try {
        // Extract the 'url' parameter from the request body
        const { url } = req.body;


        if (!url) {
            throw new ApiError(404,"Url Is Undefined")
        }

        // Log the URL to verify it's received correctly

        // Get video information using ytdl library
        const info = await ytdl.getInfo(url);
        if (!info) {
            throw new ApiError(404,"Url not Correct")
        }

        // Choose the highest quality format for the video
        const format = ytdl.chooseFormat(info.formats, { filter: 'videoandaudio', quality: 'highestvideo' });

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
        if (!filePath) {
            throw new ApiError(404,"file Path Not Defined")
            
        }
        console.log(filePath);
        const cloudinaryResult = await uploadResult(filePath); // Adjust the function call accordingly
        if (!cloudinaryResult) {
            throw new ApiError(404,"Image Size Large")
            
        }

        const data = await file.create({

            downloadedlink: cloudinaryResult.url,
            filename: filePath
        })

        if (!data) {
            throw new ApiError(404,"Data Not Save")
            
        }
        // Respond with success message and Cloudinary result
        res.status(200).json(new ApiResponse(200,data,"Data Add Successfully"));
    } catch (error) {
        // Handle errors gracefully
        console.error("Error:", error);
        res.status(500).send(error.message);
    }
})


const videoGetById = asyncHandler(async (req, res) => {
    const { id } = req.params
    if (!id) {
        throw new ApiError(404,"Id Is Undefined")
    }
    const response = await file.findById(id)
    if (!response) {
        throw new ApiError(404,"Id Not Correct")
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

        // Get video information using ytdl library
        const info = await ytdl.getInfo(url);
        if (!info) {
            throw new ApiError(404, "Url not Correct");
        }

        // Choose the format with both video and audio (highest quality)
        const format = ytdl.chooseFormat(info.formats, { filter: 'videoandaudio', quality: 'highestvideo' });

        // Extract video title from the video information
        const title = info.videoDetails.title;

        // Set response headers to indicate file download
        res.setHeader(
          "Content-Disposition",
          `attachment; filename*=UTF-8''${encodeURIComponent(title)}.mp4`
        );

        // Log the title to verify it's correctly set

        // Pipe the video stream from ytdl to the response stream
        ytdl(url, { format }).pipe(res);
    } catch (error) {
        // Handle errors gracefully
        console.error("Error:", error);
        res.status(500).send(error.message);
    }
});


const downloadTrim = asyncHandler(async (req, res) => {
    const { startTime, endTime, _id } = req.body;

    // if(!startTime || !endTime || !_id){
    //     throw new ApiError(404," All Field Is Required")
    // }

    const data = await file.findById(_id)
    const videoPath = data.filename

   
    // Output file path for trimmed video
    const trimmedFilePath = './public/uploads/trimmed_video.mp4';

    // Trim the video using ffmpeg
    ffmpeg(videoPath)
        .setStartTime(startTime)
        .setDuration(endTime - startTime)
        .output(trimmedFilePath)
        .on('end', function () {
            res.status(200).download(trimmedFilePath, 'trimmed_video.mp4', async (err) => {
                if (err) {
                    console.error(`Error sending trimmed video: ${err}`);
                    return res.status(500).json({ error: 'Error sending trimmed video.' });
                }
                // Uncomment the line below if you want to delete the trimmed video file after sending
                fs.unlinkSync(videoPath);
                fs.unlinkSync(trimmedFilePath);
                const isDeleteFile = await DeleteFile(data.downloadedlink)

                if(!isDeleteFile){
                    throw new ApiError(401,"Video Not Deleted")
                }
                const dataDelete = await file.findByIdAndDelete(_id)
                
                if(!dataDelete){
                    throw new ApiError(401,"Data Not Deleted")
                    
                }
            });
        })
        .on('error', function (err) {
            console.error('Error trimming video:', err);
            return res.status(500).json({ error: 'Error trimming video.' });
        })
        .run();
})



    

export {
    downloadTrim,
    videoGet,
    videoGetById,
    videosend
}
