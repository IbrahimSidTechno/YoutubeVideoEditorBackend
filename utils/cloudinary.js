import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"



// Configuration
cloudinary.config({
    cloud_name: "dbgijflic",
    api_key: "725495478124257",
    api_secret: "5Xyr1XiZ62VEfwdHwnqLN3WKYnQ" // Click 'View Credentials' below to copy your API secret
});


const uploadResult = async (file) => {
    try {

        if (!file) return null
        const response = await cloudinary.uploader.upload(file, {
            resource_type: "auto"
        })


        return response
    } catch (e) {
    }
}


export default uploadResult;