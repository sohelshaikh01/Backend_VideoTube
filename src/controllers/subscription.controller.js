import mongoose from "mongoose";
import { Subscription } from "../models/subscription.models.js";

import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// When finding subscribed channels
// get userId as user
// get channelId as channel
// insert the data
// remove by channelId
    
// TODO: Toggle subscription to a channel.
// 1. Extract channelId from req.params and subscriberId from req.user._id.
// 2. Use $or operator to check if the subscription already exists.
// 3. If it exists, delete it. Otherwise, create a new subscription.

// 1. Get `{ channelId }` and `userId` from request.
// 2. Validate `channelId`.
// 3. If already subscribed:

//    * Remove subscription.
// 4. Else:

//    * Create a new subscription with `subscriberId = userId` and `channelId`.
// 5. Return updated subscription status.

const toggleSubscription = asyncHandler(async (req, res) => {

    const { channelId } = req.params;
    if(!mongoose.Types.ObjectId.isValid(channelId.toString())) {
        throw new ApiError(400, "Invalid Channeld ID");
    }

    const subscriberId = req.user._id;

    if(subscriberId.toString() === channelId.toString()) {
        throw new ApiError(400, "You cannot subscribe to your own channel");
    }
 

    const subscription = await Subscription.findOne({
           channel: channelId, 
           subscriber: subscriberId
    });

    if(subscription) {
        const deletedSubscription = await Subscription.deleteOne(
            { channel: channelId, subscriber: subscriberId },
        )

        return res
            .status(200)
            .json(
                new ApiResponse(200, deletedSubscription, "Channel unsubscribed successfully")
            );
    } else {
        const newSubscription = await Subscription.create({
            channel: channelId,
            subscriber: subscriberId
        });
        return res
            .status(200)
            .json(
                new ApiResponse(200, newSubscription, "Channel subscribed successfully")
            );
    }

});
  
// --------- Both Controllers Remaining -----------

// Get userId as user.
// find as subscirber in table.

// TODO: Get all channels a user is subscribed to.
// 1. Extract subscriberId from req.user._id.
// 2. Use $lookup to join Subscription collection with User collection.
// 3. Use $match to filter by subscriberId.

// 1. Get `userId` from auth.
// 2. Fetch all subscriptions where `subscriberId = userId`.
// 3. Populate channel info (username, avatar, etc.).
// 4. Return list of subscribed channels.

const getSubscribedChannels = asyncHandler(async (req, res) => {

    const { channelId } = req.params;
    if(!mongoose.Types.ObjectId.isValid(channelId.toString())) {
        throw new ApiError(400, "Invalid Authorization");
    }

    const data = await Subscription.aggregate([
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channel"
            }
        },
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(channelId),
            }
        },
        {
            $unwind: "$channel"
        },
        {
            $project: {
                _id: 1,
                channelId: "$channel._id",
                channelName: "$channel.username",
                channelImage: "$channel.avatar"
            }
        }
    ]);
    
    if(!data || data.length === 0) {
        return res
            .status(200)
            .json(
                new ApiResponse(200, [], "No channels subscribed")
            );
    }

    const formatted = data.map((channel) => ({
        ...channel,
        channelId: channel.channelId.toString()
    }));

    return res
        .status(200)
        .json(
            new ApiResponse(200, formatted, "Channels fetched successfully")
        );
});

// Get user._id as channel
// Find as channelId in table.
// TODO: Get all subscribers of a channel.
// 1. Extract channelId from req.params.
// 2. Use $lookup to join Subscription collection with User collection.
// 3. Use $match to filter by channelId.

// 1. Get `userId` from auth.
// 2. Fetch all subscriptions where `channelId = userId`.
// 3. Count total subscribers.
// 4. Return subscriber count and list of subscribers (optional).

const getUserChannelSubscribers = asyncHandler(async (req, res) => {

    const { subscriberId } = req.params;

    if(!mongoose.Types.ObjectId.isValid(subscriberId.toString())) {
        throw new ApiError(400, "Invalid Channel ID format");
    }
    
    const data = await Subscription.aggregate([
        { $lookup: {
            from: "users",
            localField: "subscriber",
            foreignField: "_id",
            as: "subscriber"
        }},
        {
            $match: {
                channel: subscriberId,
            }
        },
        {
            $unwind: "$subscriber"
        },
        {
            $project: {
                _id: 1,
                subscriberId: "$subscriber._id",
                subscriberName: "$subscriber.username",
                subscriberImage: "$subscriber.avatar",
            }
        },
        {
            $sort: {
                subscriberName: 1
            }
        }
    ]);

    if(!data || data.length === 0) {
        return res
            .status(200)
            .json(
                new ApiResponse(200, [], "No subscribers found")
            );
    }

    const formatted = data.map((subscriber) => ({
        ...subscriber,
        subscriberId: subscriber.subscriberId.toString()
    }));

    return res
        .status(200)
        .json(
            new ApiResponse(200, formatted, "Subscribers fetched successfully")
        );

});

export { toggleSubscription, getSubscribedChannels, getUserChannelSubscribers };
