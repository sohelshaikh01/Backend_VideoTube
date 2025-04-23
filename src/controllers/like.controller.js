import mongoose from "mongoose";
import { Like } from "../models/like.models.js";

import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// TODO: Toggle like on a video.
// 1. Extract videoId from req.params and userId from req.user._id.
// 2. Use $or operator to check if the like already exists.
// 3. If it exists, delete it. Otherwise, create a new like.
const toggleVideoLike = asyncHandler(async (req, res) => {

    const { videoId } = req.params; 

    if(!videoId) {
        throw new ApiError(400, "Video ID is required");
    }

    const userId = req.user._id;

    const existingLike = await Like.findOne({
        video: videoId,
        likeBy: userId
    });

    if (existingLike) {
        await Like.deleteOne({ _id: existingLike._id });
        return res
            .status(200)
            .json(
                new ApiResponse(200, existingLike, "Video unliked successfully")
            );
    }
    else{
        const newLike = await Like.create({
            video: videoId,
            likeBy: userId
        })
        return res
            .status(201)
            .json(
                new ApiResponse(201, newLike, "Video liked successfully")
            );
    }
    
});
// fetch(`/api/like/toggle/v/${videoId}`, {
//   method: 'POST',
//   headers: {
//     'Authorization': `Bearer ${localStorage.getItem('authToken')}`
//   }
// })
//   .then(response => response.json())
//   .then(data => console.log('Video Liked/Unliked:', data));


// TODO: Toggle like on a comment.
// 1. Extract commentId from req.params and userId from req.user._id.
// 2. Use $or operator to check if the like already exists.
// 3. If it exists, delete it. Otherwise, create a new like.

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user._id;

    if(!commentId) {
        throw new ApiError(400, "Comment ID is required");
    }

    const existingLike = await Like.findOne({
        comment: commentId,
        likeBy: userId
    });

    if(existingLike) {
        const deletedLike = await Like.deleteOne({ _id: existingLike._id });
        return res
            .status(200)
            .json(
                new ApiResponse(200, deletedLike, "Comment unliked successfully")
            );
    }
    else {
        const newLike = await Like.create({
            comment: commentId,
            likeBy: userId
        });
        return res
            .status(201)
            .json(
                new ApiResponse(201, newLike, "Comment liked successfully")
            );
    }
    

});

// TODO: Toggle like on a tweet.
// 1. Extract tweetId from req.params and userId from req.user._id.
// 2. Use $or operator to check if the like already exists.
// 3. If it exists, delete it. Otherwise, create a new like.
const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const userId = req.user._id;

    if(!tweetId) {
        throw new ApiError(400, "Tweet ID is required");
    }

    const existing = await Like.findOne({
        tweet: tweetId,
        likeBy: userId
    });

    if(existing) {
        const deletedLike = await Like.deleteOne({ _id: existing._id });
        return res
            .status(200)
            .json(
                new ApiResponse(200, deletedLike, "Tweet unliked successfully")
            );
    }
    else {
        const newLike = await Like.create({
            tweet: tweetId,
            likeBy: userId
        });
        return res
            .status(201)
            .json(
                new ApiResponse(201, newLike, "Tweet liked successfully")
            );
    }

});

// TODO: Fetch all videos liked by the user.
// 1. Extract userId from req.user._id.
// 2. Use $lookup to join Like collection with Video collection.
// 3. Use $match to filter by userId in the likeBy field.
// 4. Project video details.
const getLikedVideos = asyncHandler(async (req, res) => {
    
    const userId = req.user._id;
    
    const likedVideo = await Like.aggregate([
        {
            $match: {
              likeBy: userId,
              video: { $exists: true, $ne: null },
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "videoDetails"
            }
        },
        { $unwind: "$videoDetails" },
        {
            $project: {
                _id: 0,
                videoId: "$video",
                videoDetails: {
                    title: "$videoDetails.title",
                    description: "$videoDetails.description",
                    thumbnail: "$videoDetails.thumbnail",
                    createdAt: "$videoDetails.createdAt"
                }
            }
        }
    ]);

    if(likedVideo && likedVideo.length > 0) {
        return res
            .status(200)
            .json(
                new ApiResponse(200, likedVideo, "Liked Videos Fetched Successfully")
            );
    } else {
        return res
            .status(404)
            .json(
                new ApiResponse(404, [], "No Liked Videos Found")
            );
    }


});



export { toggleVideoLike, toggleCommentLike, toggleTweetLike, getLikedVideos };
