import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGO_URI_LOCAL}/${DB_NAME}`);
        // It give return object as response
        console.log(`MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`);
        // It is for not connect on another database host: there are production, development different databases
    }
    catch (error) {
        console.log("MONGODB connection error", error);
        process.exit(1);
    }
}

export default connectDB;