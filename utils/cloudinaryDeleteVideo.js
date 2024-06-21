import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: "dbgijflic",
    api_key: "725495478124257",
    api_secret: "5Xyr1XiZ62VEfwdHwnqLN3WKYnQ"
});

const DeleteFile = async (filename) => {
    console.log(filename);
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