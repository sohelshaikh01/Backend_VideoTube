// require('dotenv').config({path: "./env"}); // Improved Below

import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path: './.env' // Added later
});

connectDB()
.then(() => {
    app.on("error", (error)=> {
        console.log("ERROR", error);
        throw error;
    })

    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running at port: ${process.env.PORT}`);
    });
})
.catch((err) => {
    console.log("MONGO db connnection failed !!!", err);
});



/*
// First approach
( async () => {
    try{
        await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);

        app.on("error", (error) => {
            console.log("Application not able to talk");
            throw error;
        })

        app.listen(process.env.PORT, () => {
            console.log(`App is listening on port ${process.env.PORT}`);
        })
    }
    catch (error) {
        console.error("ERROR: ", error);
    }
})()

*/