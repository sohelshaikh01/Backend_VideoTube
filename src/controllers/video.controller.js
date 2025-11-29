import mongoose from "mongoose";
import { Video } from "../models/video.models.js";

import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary, removeFromCloudinary } from "../utils/cloudinary.js";


// TODO: Fetch all videos with pagination.
    // 1. Extract page and limit from req.query.
    // 2. Use $skip and $limit for pagination.

// 1. Get `{ page, limit }` from query.
// 2. Find all **published videos** with pagination.
// 3. Return paginated array of video objects.

const getAllVideos = asyncHandler(async (req, res) => {

    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit) 

    const videos = await Video.aggregate([
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner" 
            }
        },
        {
            $unwind: "$owner",
        },
        {
            $project: {
                title: 1,
                videoFile: 1,
                thumbnail: 1,
                description: 1,
                duration: 1,
                views: 1,
                owner: "$owner.username",
            }
        },
        {
            $sort: { createdAt: -1 }
        },
        { $skip: skip },
        { $limit: Number(limit) },
    ]);

    if(!videos?.length) {
        throw new ApiError(404, "Videos Not Found!")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, videos, "Videos fetched successfully", {
            total: videos.length,   
            page: page || 1,
            limit: limit || 10,
        } ,  
    ))

});


// TODO: Publish a new video.
    // 1. Extract video details from req.body and file URLs from req.files.
    // 2. Save the video.
    // View and duration through cloudinary

// 1. Get `{ title, description, file, thumbnail }` from body/files.
// 2. Validate all required fields.
// 3. Upload video file and thumbnail to Cloudinary.
// 4. Create a new video document in the database.
// 5. Return the created video.

const publishAVideo = asyncHandler(async (req, res) => {
    
    const { title, description } = req.body;

    if(!title || !description) {
        throw new ApiError(400, "All fields are required!")
    }

    const videoFilePath = req.files?.videoFile[0]?.path || null;
    const thumbnailPath = req.files?.thumbnail[0]?.path || null;

    if(!videoFilePath || !thumbnailPath) {
        throw new ApiError(400, "videoFile or Avatar Files Required");
    } 

    const videoFile = await uploadOnCloudinary(videoFilePath);
    const thumbnail = await uploadOnCloudinary(thumbnailPath);

    const user = req.user._id;

    const video = await Video.create({
        title,
        description,
        videoFile: videoFile.url,
        thumbnail: thumbnail.url || "",
        owner: user,
        duration: videoFile.duration,
    });

    if(!video) {
        throw new ApiError(400, "Video Not Published!");
    }

    return res
        .status(201)
        .json(
            new ApiResponse(201, video, "Video published successfully")
        )  
});

// TODO: Fetch a video by its ID.
    // 1. Get `videoId` from request params.
    // 2. Validate `videoId`.
    // 3. Find video by ID and ensure it's published.
    // 4. Return video details.

const getVideoById = asyncHandler(async (req, res) => {

    const { videoId } = req.params;

    if(!videoId) {
        throw new ApiError(400, "InValid video ID format");
    }

    const video = await Video.findById(videoId).lean();

    if(!video) {
        throw new ApiError(404, "Video Not Found");
    }

    return res  
        .status(200)
        .json(
            new ApiResponse(200, video, "Video Details Fetched Successfully")
        )
});


// TODO: Update video details by ID.
    // 1. Extract videoId from req.params and updated details from req.body.
    // 2. Use $set to update the document.

// 1. Get `{ videoId, title, description, thumbnail }` from body.
// 2. Validate `videoId`, title/description presence.
// 3. Find video by ID.
// 4. If not found, return error.
// 5. Check if current user is video owner — if not, return error.
// 6. Update title and description.
// 7. If thumbnail is present:

//    * Delete old thumbnail from Cloudinary.
//    * Upload new thumbnail and update URL.
// 8. Save updated video.
// 9. Return updated video data.

const updateVideo = asyncHandler(async (req, res) => {

    const { videoId } = req.params;
    const { title, description } = req.body;
    
    
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video ID format");
    }

    if(!title || !description) {
        throw new ApiError(400, "All fields are required!")
    }

    const isVideo = await Video.findById(videoId);

    if(!isVideo) {
        throw new ApiError(404, "Video Not Found!")
    }

    if (isVideo.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this video"); 
    }

    isVideo.title = title;
    isVideo.description = description;

    const thumbnailLocalPath = req.files?.thumbnail[0]?.path || null;

    if(thumbnailLocalPath) {
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
        isVideo.thumbnail = thumbnail.url || "";
    }

    await isVideo.save();
    
    return res
        .status(200)
        .json(
            new ApiResponse(200, isVideo, "Video updated successfully")
        );


});

// --- Check owner in delete
// TODO: Delete a video by its ID.

// 1. Get `videoId` from request.
// 2. Validate `videoId`.
// 3. Find video by ID — if not found, return error.
// 4. Delete the video file and thumbnail from Cloudinary.
// 5. Delete the video from database.
// 6. Remove videoId from related models:
//    * Comments
//    * WatchHistory
//    * Likes
//    * Playlists
// 7. Return success message or deleted video ID.

const deleteVideo = asyncHandler(async (req, res) => {

    const { videoId } = req.params;

    if(!videoId) {
        throw new ApiError(404, "Invalid video ID format");
    }

    const video = await Video.findByIdAndDelete(videoId).lean();

    if(!video) {
        throw new ApiError(404, "Video Not Found!");
    }

    return res  
        .status(200)
        .json(
            new ApiResponse(200, video, "Video deleted successfully")
        );
});


// --- Not used $set in 
// TODO: Toggle publish status of a video.

// 1. Get `videoId` from body or query.
// 2. Validate `videoId`.
// 3. Find video by ID.
// 4. If not found, return error.
// 5. Flip `isPublished` boolean.
// 6. Save updated video.
// 7. Return updated video data.

const togglePublishStatus = asyncHandler(async (req, res) => {

    const { videoId } = req.params;

    if (!videoId) {
        throw new ApiError(400, "Invalid video ID format");
    }

    const video = await Video.findById(videoId);

    if(!video) {
        throw new ApiError(404, "Video not found");
    }

    video.isPublished  = !video.isPublished;
    await video.save();

    return res
        .status(200)
        .json(
            new ApiResponse(200, video, "The Video publish status has been toggle")
        )

});


// --- Check that view increment properly
// 1. Get `videoId` and `userId`.
// 2. Validate `videoId`.
// 3. Increment `views` count on video document.
// 4. If `userId` exists:

//    * Add videoId to user's `watchHistory` (if not already there).
// 5. Save video and user.
// 6. Return updated view count or success message.

const addVideoView = asyncHandler(async (req, res) => {

    const { videoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video ID format");
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        { $inc: { view: 1 } },  // increment the 'view' field by 1
        { new: true }           // return the updated document
    );

    if (!updatedVideo) {
        return res.status(404).json(new ApiResponse(404, null, "Video not found"));
    }

    return res.status(200).json(new ApiResponse(200, updatedVideo, "View added successfully"));
});



export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
    addVideoView
};
