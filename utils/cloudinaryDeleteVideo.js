import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const DeleteFile = async (filename) => {
    try {
        if (!filename) return null;
        const image = filename.split('/');
        const imageName = image[image.length - 1].split(".")[0];
        
        const response = await cloudinary.uploader.destroy(imageName, { resource_type: 'video' });

        if (response.result === "not found") {
            return false;
        } else {
            return true;
        }
    } catch (error) {
        return false;
    }
};

export default DeleteFile;