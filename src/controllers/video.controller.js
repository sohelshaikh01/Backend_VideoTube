import mongoose from "mongoose";
import { Video } from "../models/video.models.js";

import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

// getAllVideos (Fetch all videos with pagination)
//     const page = 1; // Default page number
//     const limit = 10; // Default limit of videos per page

//     const response = await fetch(`/api/videos?page=${page}&limit=${limit}`, {
//         method: 'GET',
//         headers: {
//             'Authorization': `Bearer ${localStorage.getItem('authToken')}` // Send token in the Authorization header
//         }
//     });


// TODO: Fetch all videos with pagination.
// 1. Extract page and limit from req.query.
// 2. Use $skip and $limit for pagination.
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
        } ,  // Pagination data
    ))

});

// publishAVideo (Publish a new video)
// TODO: Publish a new video.
    // 1. Extract video details from req.body and file URLs from req.files.
    // 2. Save the video.
    // View and duration through cloudinary

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

    // Increament view count
    // await Video.findByIdAndUpdate(videoId, { $inc: { view: 1 } });

    if(!video) {
        throw new ApiError(400, "Video Not Published!");
    }


    return res
        .status(201)
        .json(
            new ApiResponse(201, video, "Video published successfully")
        )
        
});

//     const formData = new FormData();
//     formData.append('title', videoDetails.title);
//     formData.append('description', videoDetails.description);
//     formData.append('videoFile', videoFile);
//     formData.append('thumbnail', thumbnailFile);

// TODO: Fetch a video by its ID.
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


//  updateVideo (Update video details)
// const updateVideo = async (videoId, updatedDetails, updatedThumbnailFile) => {}

// TODO: Update video details by ID.
// 1. Extract videoId from req.params and updated details from req.body.
// 2. Use $set to update the document.
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

    // Check if the user is the owner of the video
    if (isVideo.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this video"); 
    }

    isVideo.title = title;
    isVideo.description = description;

    // Not File Only Files is working
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path || null;

    if(thumbnailLocalPath) {
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
        isVideo.thumbnail = thumbnail.url || "";
    }

    await isVideo.save();
    // if (!updatedVideo) {
    
    return res
        .status(200)
        .json(
            new ApiResponse(200, isVideo, "Video updated successfully")
        );


});

//     const formData = new FormData();
//     formData.append('title', updatedDetails.title);
//     formData.append('description', updatedDetails.description);
//     formData.append('thumbnail', updatedThumbnailFile);

// TODO: Delete a video by its ID.
const deleteVideo = asyncHandler(async (req, res) => {

    const { videoId } = req.params;

    if(!videoId) {
        throw new ApiError(404, "Invalid video ID format")
    }

    const video = await Video.findByIdAndDelete(videoId).lean();

    if(!video) {
        throw new ApiError(404, "Video Not Found!")
    }

    return res  
        .status(200)
        .json(
            new ApiResponse(200, video, "Video deleted Successfully")
        )


});


// togglePublishStatus (Toggle publish status of a video)
// TODO: Toggle publish status of a video.
// Not used $set in 

const togglePublishStatus = asyncHandler(async (req, res) => {

    const { videoId } = req.params;

    if (!videoId) {
        throw new ApiError(400, "Invalid video ID format");
    }

    const video = await Video.findById(videoId);

    if(!video) {
        throw new ApiError(404, "Video not found")
    }

    video.isPublished  = !video.isPublished;
    await video.save();

    return res
        .status(200)
        .json(
            new ApiResponse(200, video, "The Video publish status has been toggle")
        )

});

//     const response = await fetch(`/api/videos/toggle/publish/${videoId}`, options);


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
//     const response = await fetch(`/api/videos/${videoId}/view`

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
};
