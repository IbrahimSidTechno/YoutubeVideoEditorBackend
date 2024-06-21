import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: "dbgijflic",
    api_key: "725495478124257",
    api_secret: "5Xyr1XiZ62VEfwdHwnqLN3WKYnQ"
});

const uploadLargeFile = async (file) => {
    try {
        // Check if file path exists and is valid
        if (!file || typeof file !== 'string') {
            throw new Error('Invalid file path provided.');
        }

        // Upload large file to Cloudinary using upload_large method
        const uploadResult = cloudinary.uploader.upload(req.file.path, (err, result) => {
            if (err) { console.log('Error: ' + err); }
            image.url = result.secure_url;
            console.log(image.url);
        });

        console.log("Upload result:", uploadResult);

        // Check if secure_url is present in the result
        if (!uploadResult.secure_url) {
            throw new Error('Cloudinary upload result did not contain a secure URL.');
        }

        return uploadResult.secure_url;
    } catch (error) {
        console.error("Error uploading large file to Cloudinary:", error);
        throw error;
    }
};

export default uploadLargeFile;