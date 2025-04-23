const conf = {
    ServerPort: process.env.PORT || "8000",

    Mongo_URI_Local: process.env.MONGO_URI_LOCAL || "",
    Mongo_URI_Cloud: process.env.MONGO_URI_CLOUD || "",

    Cors_Origin: process.env.CORS_ORIGIN || "",   

    Access_Token_Secret: process.env.ACCESS_TOKEN_SECRET || "",
    Access_Token_Expiry: process.env.ACCESS_TOKEN_EXPIRY || "",

    Refresh_Token_Secret: process.env.REFRESH_TOKEN_SECRET || "",
    Refresh_Token_Expiry: process.env.REFRESH_TOKEN_EXPIRY || "",

    Cloudinary_Cloud_Key: process.env.CLOUDINARY_CLOUD_KEY || "",
    Cloudinary_Api_Key: process.env.CLOUDINARY_API_KEY || "",
    Cloudinary_Api_Secret: process.env.CLOUDINARY_API_SECRET || "",
};

export default conf;
