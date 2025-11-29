import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import mongoose from "mongoose";

import { User } from "../models/user.models.js";
import conf from "../conf/conf.js";
import jwt from "jsonwebtoken";

const generateAccessandRefreshTokens = async function(userId) {

    try {
        const user  = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        user.save({ validateBeforeSave: false});

        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token");
    }
}


// 1. Get `{ fullName, email, username, password }` from body.
// 2. Validate all required fields.
// 3. Check if a user with the same email or username exists — throw error if exists.
// 4. Upload `avatar` and `coverImage` to Cloudinary (if provided).
// 5. Create a new user in the database with these fields and uploaded images.
// 6. If created successfully, return the user object.
const registerUser = asyncHandler( async (req, res) => {

    const { fullName, email, username, password } = req.body;

    if( [fullName, email, username, password].some((field) => 
        field?.trim() === "" ) ) {
            throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({ // added await 
        $or: [{ username : username.toLowerCase() }, { email }]
    });

    if(existedUser) {
        throw new ApiError(400, "User with email or username already exists");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path || null; 
    
    let coverImageLocalPath;
    
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    
    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar File is required");
    }
    
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar) {
        throw new ApiError(400, "Avatar is required");
    }
    
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",  
        email,
        password,
        username: username.toLowerCase()
    });
    
    const createdUser = await User.findById( user._id ).select(
        "-password -refreshToken"
    ).lean();

    if(!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    return res
        .status(201)
        .json( 
            new ApiResponse(201, createdUser, "User registered successfully")
        );

});


// 1. Get `{ email or username, password }` from body.
// 2. Validate fields — throw error if missing.
// 3. Find user by email or username.
// 4. If user exists, compare passwords — if not matched, throw error.
// 5. If matched, generate access & refresh tokens.
// 6. Set tokens in cookies.
// 7. Return user object.
const loginUser = asyncHandler( async(req, res) => {

    const { email, username, password } = req.body;

    if(!(username || email)) {
        throw new ApiError(400, "username or email is required");
    }

    const user = await User.findOne({
        $or: [{ username }, { email }] 
    });

    if(!user) {
        throw new ApiError(404, "User does not exists");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    const { accessToken, refreshToken } = await generateAccessandRefreshTokens(user._id); 

    const loggedInUser = await User.findById(user._id)
    .select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse( 200, {
                user: loggedInUser, 
                accessToken, 
                refreshToken
            },
            "User Logged in Successfully"
        )
    );

});   


// 1. Get userId from auth middleware.
// 2. Delete access and refresh tokens from database.
// 3. Clear cookies from the frontend.
// 4. Return success message.
// Logout - Not removing refresh token from database
const logoutUser = asyncHandler( async (req, res) => {


    const userId = req.user._id;

    // Using this so no more user, validate, refreshtoken delete and save
    await User.findByIdAndUpdate(
        userId,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
    }

    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json( 
        new ApiResponse(200, {}, "User logged out successfully")
    )

});


// 1. Check for `refreshToken` in cookies.
// 2. Verify token — extract user ID.
// 3. Check if token is stored and valid for that user.
// 4. Generate new access and refresh tokens.
// 5. Update cookies.
// 6. Return success message with user data.

const refreshAccessToken = asyncHandler( async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken) {
        throw new ApiError(401, "Unauthrorized, please login again");
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, conf.Refresh_Token_Secret);
    
        const user = await User.findById(decodedToken?._id);
    
        if(!user) {
            throw new ApiError(401, "Invalid Refresh Token");
        }
    
        if(incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {  accessToken, newrefreshToken } = await generateAccessandRefreshTokens(user._id);
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newrefreshToken, options)
        .json(
            new ApiResponse(
                200,
                { accessToken, refreshToken: newrefreshToken },
                "Access Token refresh"
            )
        );
        
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh Token");
    }

});


// 1. Get `{ oldPassword, newPassword }` from body.
// 2. Get current user from auth.
// 3. Validate old password — if not match, throw error.
// 4. Hash and update new password.
// 5. Return success message.

const changeCurrentPassword = asyncHandler( async (req, res) => {
    const { oldPassword, newPassword } = req.body; 

    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if(!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password");
    }

    user.password = newPassword;
    user.save({ validateBeforeSave: false });

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
    
});


// 1. Get user from auth middleware.
// 2. Return user object.

const getCurrentUser = asyncHandler( async (req, res) => {

    return res
    .status(200)
    .json( new ApiResponse(200, req.user, "Current user details fetched successfully"));
});


// 1. Get `{ fullName, email }` from body.
// 2. If provided, update the respective fields.
// 3. Save the user.
// 4. Return updated user object.

const updateAccountDetails = asyncHandler( async(req, res) => {
    
    const { fullName, email } = req.body;


    if(!fullName || !email) {
        throw new ApiError(400, "All fields are required");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        { new: true }
    ).select("-password");


    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Account details updated successfully")
    )
});


// 1. Get avatar file from request.
// 2. Validate file exists.
// 3. Delete the old avatar from Cloudinary.
// 4. Upload the new avatar.
// 5. Save user with updated avatar URL.
// 6. Return updated user object.

const updateUserAvatar = asyncHandler( async(req, res) => {
    const avatarLocalPath = req.file?.path; 

    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true}
    ).select("-password");

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar image updated successfully")
    )

});


// 1. Get coverImage file from request.
// 2. Validate file exists.
// 3. Delete old coverImage from Cloudinary.
// 4. Upload new coverImage.
// 5. Save user with updated cover image URL.
// 6. Return updated user object.

const updateUserCoverImage = asyncHandler( async(req, res) => {
    const coverImageLocalPath = req.file?.path; // req.file (not files here) for single file

    if(!coverImageLocalPath) {
        throw new ApiError(400, "Cover Image file is missing");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!coverImage.url) {
        throw new ApiError(400, "Error while uploading on coverImage");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true}
    ).select("-password");

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover image updated successfully")
    )

});


// Aggregation comments remains
// 1. Extract the username from the request parameters.
// 2. Match the username in the User collection (case-insensitive).
// 3. Perform a lookup to find all subscribers for the user.
// 4. Perform another lookup to find all channels the user is subscribed to.
// 5. Add computed fields for:
//    - Subscriber count.
//    - Subscription count.
//    - Whether the requesting user is subscribed to this channel.
// 6. Project only the required fields for the frontend.
// 7. Handle cases where the channel does not exist.
// 8. Return the aggregated result in the response.

// 1. Get `username` from route/query.
// 2. Search for user by username.
// 3. If not found, return error.
// 4. Else, return public channel data (like avatar, videos, etc.).

const getUserChannelProfile = asyncHandler( async(req, res) => {

    const { username } = req.params;


    if( !(username.trim()))  {
        throw new ApiError(400, "Username is missing");
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }, // getting user
        },
        { // using lookup to get its subscribers
            $lookup: {
                // model in lowercase and plural in database
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel", // what basis to get docs
                as: "subscribers"  // name of outcome new document
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: { // To Add Additional fields
                subscribersCount: {
                    $size: "$subscribers" // using $ because it is field now
                },
                channelisSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: { // check whether the user is subscribed or not
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: { // showing selected this to further access
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelisSubscribedToCount: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ]);
    // It returns array after using aggregate

    if(!channel?.length) {
        throw new ApiError(404, "channel does not exists");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    )    


});


 // 1. Match the user by `_id` in the User collection.
// 2. Lookup the videos in the user's `watchHistory` field.
// 3. Within each video, perform a sub-lookup to fetch the owner's details.
// 4. Project only the owner's basic information (e.g., fullName, username, avatar).
// 5. Flatten the owner field for easier frontend usage.
// 6. Return the user's watch history with aggregated details.

// 1. Get logged-in user from middleware.
// 2. Fetch `watchHistory` from user document.
// 3. Populate each video detail.
// 4. Return the array of videos.

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
                // Ensures the _id is treated as an ObjectId
            }
        },
        {
            $lookup: {
                from: "videos", // Name of the collection to join (Videos)
                localField: "watchHistory", // Field in User model
                foreignField: "_id", // Matching field in Video model
                as: "watchHistory", // Resulting array field name
                pipeline: [
                    {
                        $lookup: {
                            from: "users", // Join with Users collection
                            localField: "owner", // Owner field in Video
                            foreignField: "_id", // Match with _id in User
                            as: "owner", // Output field
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: { $first: "$owner" } // Flatten owner array
                        }
                    }
                ]
            }
        }
    ]);

    return res.status(200).json(
        new ApiResponse(200, user[0]?.watchHistory || [], "Watch History Fetched Successfully")
    );
});


export { 
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
};