import mongoose from "mongoose";
import {Comment} from "../models/comment.models.js";
import {Video} from "../models/video.models.js";

import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js";

// --- Check owner in update, delete Comment
// --- Can user comment own video

// TODO: Fetch all comments for a specific video using aggregation pipeline.
// 1. Extract videoId from req.params and pagination details from req.query.

// 2. Perform aggregation:
//    - $match: Filter comments by videoId.
//    - $lookup: Populate 'owner' details from the User collection.
//    - $skip & $limit: Implement pagination.

// 1. Get `videoId`, `page`, and `limit` from request query.
// 2. Validate `videoId` — if invalid, return error.
// 3. Fetch all comments for the video, with pagination and sorting (e.g., latest first).
// 4. If comments exist, return an array of comment objects (with user and like info populated).
// 5. Else, return an empty array.

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


// TODO: Add a comment to a video.
// 1. Extract videoId from req.params and content from req.body.
// 2. Create and save the comment.

// ---- For Now User Can Comment On Own Video ----

// 1. Get `{ videoId, content }` from request body. Get `userId` from auth middleware.
// 2. Validate all required fields — if missing, return error.
// 3. Check if `videoId` is valid and video exists — if not, return error.
// 4. Create a new comment document with `content`, `userId`, and `videoId`.
// 5. If comment is created successfully, return the comment.

// Anyone can comment multiple times includeing owner

const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

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
   
    const comment = await Comment.create({ content, video: videoId, owner: userId });

    return res
        .status(201)
        .json(new ApiResponse(201, "Comment added successfully", comment));

});


// TODO: Update a comment by ID.
// 1. Extract commentId from req.params and updated content from req.body.
// 2. Update the comment.

// 1. Get `{ commentId, content }` from request.
// 2. Validate `commentId` and `content` — if missing, return error.
// 3. Find comment by `commentId`.
// 4. Check if logged-in user is the comment owner — if not, return error.
// 5. Update `content` and set updated timestamp.
// 6. Save and return the updated comment.

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

// --- Delete Likes related Comment
// TODO: Delete a comment by ID.
// 1. Extract commentId from req.params.
// 2. Delete the comment.

// 1. Get `commentId` from request.
// 2. Validate `commentId` — if invalid, return error.
// 3. Find comment by `commentId`.
// 4. Check if current user is the comment owner — if not, return error.
// 5. Delete the comment from database.
// 6. Also remove the `commentId` from Likes collection.
// 7. Return success message or deleted comment ID.

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
