
import { Like } from "../models/like.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// --- Properly show like status in frontend

// TODO: Toggle like on a video.
// 1. Extract videoId from req.params and userId from req.user._id.
// 2. Use $or operator to check if the like already exists.
// 3. If it exists, delete it. Otherwise, create a new like.

// 1. Get `videoId` and `userId` from request.
// 2. Validate `videoId`.
// 3. Check if a like by `userId` for this `videoId` exists.

//    * If yes, remove it (dislike).
//    * If no, create a new like entry.
// 4. Update total like count on video (optional).
// 5. Return current like status or like object.

// > ✅ **Frontend logic:**

// * On page load: call an API to check if video is liked by user — show `Like` or `Liked` UI accordingly.
// * On click: call toggle endpoint — update UI state instantly (optimistic update).

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


// TODO: Toggle like on a comment.
// 1. Extract commentId from req.params and userId from req.user._id.
// 2. Use $or operator to check if the like already exists.
// 3. If it exists, delete it. Otherwise, create a new like.

// * Same steps as `toggleVideoLike`, but with `commentId` instead of `videoId`.
// * Update comment's like count if needed.
// * Return updated like status.

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

// * Same logic as above but for `tweetId`.
// * Toggle like based on presence.
// * Return like status.

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

// 1. Get `userId` from auth middleware.
// 2. Fetch all likes by this user where `videoId` exists.
// 3. Populate video details for each liked entry.
// 4. Return array of liked video objects.

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

export { 
    toggleVideoLike, 
    toggleCommentLike, 
    toggleTweetLike, 
    getLikedVideos 
};
