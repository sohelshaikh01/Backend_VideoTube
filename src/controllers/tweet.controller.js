import mongoose from "mongoose";
import { Tweet } from "../models/tweet.models.js";

import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// TODO: Create a new tweet.
// 1. Extract content from req.body and ownerId from req.user._id.
// 2. Save the tweet.

const createTweet = asyncHandler(async (req, res) => {

    const { content } = req.body;
    const { _id: ownerId } = req.user;
    
    if(!content) {
        throw new ApiError(400, "Content is required");
    }

    const newTweet = await Tweet.create({
        content,
        owner: ownerId
    });

    return res
        .status(201)
        .json(
            new ApiResponse(201, newTweet, "Tweet created successfully")
        );

});


// const tweetData = { content: 'This is a tweet' };
// fetch('/api/tweet', {
//   method: 'POST',
//   headers: {
//     'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
//     'Content-Type': 'application/json'
//   },
//   body: JSON.stringify(tweetData)
// })
//   .then(response => response.json())
//   .then(data => console.log('Tweet Created:', data));



// TODO: Fetch all tweets by a user.
// 1. Extract userId from req.params.
// 2. Use find to fetch tweets.

const getUserTweets = asyncHandler(async (req, res) => {

    const { userId } = req.params;
    const { _id: ownerId } = req.user;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    const tweets = await Tweet.find({ owner: userId }).populate("owner", "username");

    if (!tweets) {
        throw new ApiError(404, "No tweets found for this user");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, tweets, "Tweets fetched successfully")
        );

});


// TODO: Update a tweet by its ID.
// 1. Extract tweetId from req.params and updated content from req.body.
// 2. Use $set to update the document.

const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const { content } = req.body;
    const { _id: ownerId } = req.user;

    if(!mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID");
    }

    if(!content) {
        throw new ApiError(400, "Content is required");
    } 

    const tweet = await Tweet.findById(tweetId);

    if(!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    if(tweet.owner.toString() !== ownerId.toString()) {
        throw new ApiError(403, "You are not authorized to update this tweet");
    }

    tweet.content = content;
    await tweet.save();

    return res
        .status(200)
        .json(
            new ApiResponse(200, tweet, "Tweet updated successfully")
        );

});


// TODO: Delete a tweet by its ID.
// 1. Extract tweetId from req.params.
// 2. Delete the document.

const deleteTweet = asyncHandler(async (req, res) => {

    const { tweetId } = req.params;
    const { _id: ownerId } = req.user;

    if(!mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID");
    }

    const tweet = await Tweet.findById(tweetId);
    
    if(!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    if(tweet.owner.toString() !== ownerId.toString()) {
        throw new ApiError(403, "You are not authorized to delete this tweet");
    }

    await tweet.deleteOne();

    return res
        .status(200)
        .json(
            new ApiResponse(200, tweet, "Tweet deleted successfully")
        );


});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
