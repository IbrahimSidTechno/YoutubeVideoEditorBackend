import express from "express";
import ytdl from "ytdl-core";

const route = express.Router();

// POST route to handle creating new download statistics
route.get('/videoget', async (req, res) => {
    try {
        // Extract the 'url' parameter from the request query
        const { url } = req.query;
        console.log(url); // Log the URL to verify it's received correctly

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
        console.log(url); // Log the URL to verify it's received correctly
        
        // Pipe the video stream from ytdl to the response stream
        ytdl(url, { format }).pipe(res);
    } catch (error) {
        // Handle errors gracefully
        console.error(error);
        res.status(500).send(error.message);
    }
});

// GET route to retrieve video download statistics
// route.get('/videoget/:id', async (req, res) => {
//     try {
//         const downloadStatistics = await Video.findById(req.params.id);
//         res.json({
//             status: 200,
//             data: downloadStatistics,
//             message: 'Successfully retrieved download statistics'
//         });
//     } catch (error) {
//         console.error("Error retrieving download statistics:", error);
//         res.status(500).json({ error: "Internal server error" });
//     }
// });

export default route;
