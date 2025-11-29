import mongoose from "mongoose";
import { Video } from "../models/video.models.js";

import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// TODO: Fetch total videos and total views for a channel using aggregation.
// 1. Extract channelId from req.user._id.
// 2. Perform aggregation:
//    - $match: Filter videos by owner (channelId).
//    - $group: Sum views and count videos.

const getChannelStats = asyncHandler(async (req, res) => {

    const channelId = req.user._id;

    const stats = await Video.aggregate([
        { $match: { owner: new mongoose.Types.ObjectId(channelId) } },
        {
            $group: {
                _id: null,
                totalViews: { $sum: "$view" },
                totalVideos: { $sum: 1 },
            },
        },
    ]);

    return res.status(200).json(new ApiResponse(200, stats[0], "Channel stats fetched successfully"));
});


// TODO: Fetch all videos for a channel.
// 1. Extract channelId from req.user._id.
// 2. Fetch videos directly.

const getChannelVideos = asyncHandler(async (req, res) => {
    
    const channelId = req.user._id;

    const videos = await Video.find({ owner: channelId });

    if (!videos) {
        throw new ApiError(404, "No videos found for this channel");
    }

    return res.status(200).json(new ApiResponse(200, videos, "Channel videos fetched successfully"));

});


export { getChannelStats, getChannelVideos };
