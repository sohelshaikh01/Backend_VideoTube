import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

import {  
    registerUser, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    changeCurrentPassword, 
    getCurrentUser, 
    updateAccountDetails, 
    updateUserAvatar, 
    updateUserCoverImage, 
    getUserChannelProfile, 
    getWatchHistory 
} from "../controllers/user.controller.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1 // how many file
        },
        {
            name: "coverImage",
            maxCount: 1
        },

    ]), // accepts array
    registerUser
);

// post - information taking
router.route("/login").post(loginUser);


// secured routes
router.route("/logout").post(verifyJWT, logoutUser);

router.route("/refresh-token").post(refreshAccessToken);

// update routes
router.route("/change-password").post(verifyJWT, changeCurrentPassword);

router.route("/current-user").get(verifyJWT, getCurrentUser);

router.route("/update-account").patch(verifyJWT, updateAccountDetails);
// use patch other all details updated in post

router.route("/update-avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar);

router.route("/update-coverimage").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);
// This may not need / in this route

router.route("/c/:username").get(verifyJWT, getUserChannelProfile); // /c is channel name here

router.route("/watch-history").get(verifyJWT, getWatchHistory);


export default router;