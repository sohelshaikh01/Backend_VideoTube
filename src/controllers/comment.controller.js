import mongoose from "mongoose";
import {Comment} from "../models/comment.models.js";
import {Video} from "../models/video.models.js";


import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js";


// TODO: Fetch all comments for a specific video using aggregation pipeline.
// 1. Extract videoId from req.params and pagination details from req.query.

// 2. Perform aggregation:
//    - $match: Filter comments by videoId.
//    - $lookup: Populate 'owner' details from the User collection.
//    - $skip & $limit: Implement pagination.
const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if(!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const comments = await Comment.aggregate([
        { $match: { video: new mongoose.Types.ObjectId(videoId) } },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
            },
        },
        { $unwind: "$ownerDetails" }, 
        { $skip: (page - 1) * limit },
        { $limit: parseInt(limit) },
        {
            $project: {
                content: 1,
                createdAt: 1,
                updatedAt: 1,
                owner: {
                    _id: "$ownerDetails._id",
                    username: "$ownerDetails.username",
                }, // Get the first element from the array
            },
        }
    ]);

    if(!comments || comments.length === 0) {
        return res.status(404).json(new ApiResponse(404, [], "No comments found for this video"));
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, comments, "Comments fetched successfully")
        );

});
// Endpoint: /api/comments/:videoId
// Method: GET
// Authentication: Yes (JWT Token required)
// Headers: 'Authorization': 'Bearer <token>' (stored in localStorage or cookies)


// TODO: Add a comment to a video.
// 1. Extract videoId from req.params and content from req.body.
// 2. Create and save the comment.

// ---- For Now User Can Comment On Own Video ----
const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;
    // Owner cannot comment on their own video
    // Anyone Can comment multiple times on a video

    if(!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    if(!content || content.trim() === "") {
        throw new ApiError(400, "Comment content cannot be empty");
    }

    const video = await Video.findById(videoId);

    if(!video) {
        throw new ApiError(404, "Video not found");
    }

    // User can comment on their own video
    // if(video.owner.toString() === userId.toString()) {
    //     throw new ApiError(400, "You cannot comment on your own video");
    // }
   
    const comment = await Comment.create({ content, video: videoId, owner: userId });

    return res
        .status(201)
        .json(new ApiResponse(201, "Comment added successfully", comment));

});


// TODO: Update a comment by ID.
// 1. Extract commentId from req.params and updated content from req.body.
// 2. Update the comment.
const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    if(!mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "Invalid comment ID");
    }

    if(!content || content.trim() === "") {
        throw new ApiError(400, "Comment content cannot be empty");
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        { content },
        { new: true }
    );

    if (!updatedComment) {
        throw new ApiError(404, "Comment not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedComment, "Comment updated successfully")
        );

});


// TODO: Delete a comment by ID.
// 1. Extract commentId from req.params.
// 2. Delete the comment.
const deleteComment = asyncHandler(async (req, res) => {
    
    const { commentId } = req.params;

    if(!mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "Invalid comment ID");
    }

    const deletedComment = await Comment.findByIdAndDelete(commentId);

    if (!deletedComment) {
        throw new ApiError(404, "Comment not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, "Comment deleted successfully", deletedComment));

});


export {
    getVideoComments, 
    addComment, 
    updateComment,
    deleteComment
}
