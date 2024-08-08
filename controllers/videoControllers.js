
import ytdlp from 'ytdlp-nodejs';
import ffmpeg from 'fluent-ffmpeg'
import fs from "fs"
import uploadResult from "../utils/cloudinary.js";
import file from '../models/VideosModel.js'
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import DeleteFile from "../utils/cloudinaryDeleteVideo.js";
import { fileURLToPath } from 'url';
import path, { dirname, join } from 'path';
import ytdl from 'ytdl-core';


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





const videosend = asyncHandler(async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            throw new ApiError(404, "Url Is Undefined");
        }
        const info = await ytdl.getInfo(url);
        if (!info) {
            throw new ApiError(404, "Url not Correct");
        }
        // Validate ytdlp object
        if (!ytdlp || typeof ytdlp.download !== 'function') {
            throw new ApiError(500, "ytdlp library is not properly imported or used");
        }


        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);

        // Define the download options
        const fileName = sanitizeFilename(info.videoDetails.title) + '.mp4';
        const filePath = path.join(__dirname, '../public/uploads', fileName);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        // Check if file already exists


        // Ensure the directory exists
        fs.mkdirSync(path.dirname(filePath), { recursive: true });

        // Download the video
        try {
            await new Promise((resolve, reject) => {
                const downloadStream = ytdlp.download(url, {
                    filter: 'audioandvideo',
                    quality: 'highest',
                    format: 'mp4',
                    output: {
                        outDir: path.dirname(filePath),
                        fileName: fileName
                    }
                });
                downloadStream.on('finished', () => {
                    console.log("Starting download...");
                    console.log("Download completed");
                    resolve();
                });
                downloadStream.on('error', (err) => {
                    console.error("Download error:", err);
                    reject(err);
                });

                // Optional: Log data events to track progress
                downloadStream.on('progress', (data) => {
                    // console.log('Download progress:', data.percentage_str);
                })
            });

            console.log("File saved at:", filePath);

            // Optionally upload the video to Cloudinary
            // const cloudinaryResult = await uploadResult(filePath); // Adjust the function call accordingly

            // Save data to database or perform further actions
            const data = await file.create({
                downloadedlink: `http://localhost:4000/uploads/${fileName}`,
                filename: filePath,
                isPublished: false
            });

            // Respond with success message
            res.status(200).json(new ApiResponse(200, data, "Data Added Successfully"));
        } catch (error) {
            console.error("Error during download:", error);
            throw new ApiError(500, "Error downloading video");
        }
    } catch (error) {
        // Handle errors gracefully
        console.error("Unhandled Error:", error);
        res.status(error.statusCode || 500).send(error.message);
    }
});

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
        const { url } = req.query;

        // Validate URL presence
        if (!url) {
            return res.status(400).send('Url is required');
        }

        console.log("Requested URL:", url);

        // Stream video to response
        const stream = ytdlp.stream(url, {
            filter: 'audioandvideo',
            quality: 'highest',
        }).on('error', (err) => {
            console.error('Stream error:', err);
            res.status(500).send('Error streaming video');
        });

        // Set response headers for streaming
        const fileName = 'video.mp4';
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        res.setHeader("Content-Type", "video/mp4");

        // Pipe the stream to response
        stream.pipe(res);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
});





const downloadTrim = asyncHandler(async (req, res) => {
    const { startTime, endTime, _id, isPublished } = req.body;
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    try {
        // Update isPublished status if necessary
        if (isPublished) {
            await file.findByIdAndUpdate(_id, { $set: { isPublished } }, { new: true });
        }

        // Fetch video information from database based on _id
        const data = await file.findById(_id);
        if (!data) {
            return res.status(404).json({ error: 'File not found' });
        }

        const videoPath = data.filename; // Assuming this is the path to the original video file

        // Output file path for trimmed video (public/trim/trimmed_video_<_id>.mp4)
        const trimmedFileName = `trimmed_video_${_id}.mp4`;
        const trimmedFilePath = join(__dirname, '../public/trim', trimmedFileName);

        // Trim the video using ffmpeg
        await new Promise((resolve, reject) => {
            ffmpeg(videoPath)
                .setStartTime(startTime)
                .setDuration(endTime - startTime)
                .output(trimmedFilePath)
                .on('end', resolve)
                .on('error', reject)
                .run();
        });
        fs.unlink(data.filename, (err) => {
            if (err) {
                console.error('Error deleting trimmed file:', err);
            }
            console.log('Trimmed file deleted successfully.');
        });

        // Send trimmed video file as a download
        console.log(trimmedFilePath);
        res.download(trimmedFilePath, trimmedFileName, async (err) => {
            if (err) {
                console.error('Error downloading trimmed video:', err);
                return res.status(500).json({ error: 'Error downloading trimmed video.' });
            }

            // Clean up the trimmed file after download completes


            const updateLink = await file.findByIdAndUpdate(_id, { $set: { downloadedlink: `http://localhost:4000/trim/${trimmedFileName}` } }, { new: true });

            console.log(updateLink);
        });

    } catch (error) {
        console.error('Error processing request:', error);
        // Ensure no headers are set after sending a response
        if (!res.headerSent) {
            res.status(500).json({ error: 'Error processing request.' });
        }
    }
});





const getAllStatus = asyncHandler(async (req, res) => {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1; // Current page number, default 1 if not provided
    const limit = 16; // Items per page

    // Calculate the number of items to skip
    const skip = (page - 1) * limit;

    // Query to fetch data with pagination
    const data = await file.find({ isPublished: true })
        .skip(skip)
        .limit(limit);

    // Total number of items in the database (you might want to use this for client-side pagination)
    const totalCount = await file.countDocuments({ isPublished: true });

    // You can calculate the total number of pages based on totalCount and limit
    const totalPages = Math.ceil(totalCount / limit);

    // Constructing the response
    res.status(200).json(
        new ApiResponse(200, {
            data: data,
            message: "Data Fetched Successfully",
            pagination: {
                totalPages: totalPages,
                currentPage: page,
                totalItems: totalCount,
                itemsPerPage: limit
            }
        })
    );

});



export {
    getAllStatus,
    downloadTrim,
    videoGet,
    videoGetById,
    videosend
}

