import mongoose from "mongoose";
import { Playlist } from "../models/playlist.models.js";

import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// TODO: Create a new playlist.
// 1. Extract name, description, and userId from req.body and req.user._id.
// 2. Save the playlist.

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const userId = req.user._id;

  if (!name || !description) {
    throw new ApiError(400, "All fields are required");
  }

  const playlist = await Playlist.create({
    name,
    description,
    owner: userId,
  });

  if (!playlist) {
    throw new ApiError(500, "Failed to create playlist");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, playlist, "Playlist created successfully"));
});
// const playlistData = { name: 'My Playlist', description: 'Playlist description' };
// fetch('/api/playlist', {
//   method: 'POST',
//   headers: {
//     'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
//     'Content-Type': 'application/json'
//   },
//   body: JSON.stringify(playlistData)
// })
//   .then(response => response.json())
//   .then(data => console.log('Playlist Created:', data));

// TODO: Get a playlist by its ID.
// 1. Extract playlistId from req.params.
// 2. Use $lookup to populate videos with their details.

// ----- Watch Videos in Return array, Check Array for each endpoint -----

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "Invalid playlist ID");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  const populatedPlaylist = await Playlist.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(playlistId.toString()) },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        populatedPlaylist[0],
        "Playlist fetched successfully"
      )
    );
});

// TODO: Update a playlist by its ID.
// 1. Extract playlistId from req.params and updated fields from req.body.
// 2. Use $set to update the document.

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "Invalid playlist ID");
  }

  if (!name || !description) {
    throw new ApiError(400, "All fields are required");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    { name, description },
    { new: true }
  );

  if (!updatedPlaylist) {
    throw new ApiError(500, "Failed to update playlist");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedPlaylist, "Playlist updated successfully")
    );
});

// TODO: Delete a playlist by its ID.
// 1. Extract playlistId from req.params.
// 2. Delete the document.

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "Invalid playlist ID");
  }

  const playlist = await Playlist.findByIdAndDelete(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist deleted successfully"));
});

// TODO: Add a video to a playlist.
// 1. Extract videoId and playlistId from req.params.
// 2. Use $addToSet to add the video if it doesn't already exist.

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { videoId, playlistId } = req.params;

  if (
    !mongoose.Types.ObjectId.isValid(videoId) ||
    !mongoose.Types.ObjectId.isValid(playlistId)
  ) {
    throw new ApiError(400, "Invalid video or playlist ID");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist Not Found");
  }

  const alreadyExists = playlist.videos.includes(videoId);
  if (alreadyExists) {
    return res
      .status(200)
      .json(new ApiResponse(200, playlist, "Video already exists in playlist"));
  }

  playlist.videos.addToSet(videoId);
  playlist.save();
  return res
    .status(200)
    .json(
      new ApiResponse(200, playlist, "Video added to playlist successfully")
    );

  //     const playlist = await Playlist.findByIdAndUpdate(
  //         playlistId,
  //         { $addToSet: { videos: videoId } },
  //         { new: true }
  //     );
});

// TODO: Remove a video from a playlist.
// 1. Extract videoId and playlistId from req.params.
// 2. Use $pull to remove the video.

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { videoId, playlistId } = req.params;

  if (
    !mongoose.Types.ObjectId.isValid(videoId) ||
    !mongoose.Types.ObjectId.isValid(playlistId)
  ) {
    throw new ApiError(400, "Invalid video or playlist ID");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  const videoExists = playlist.videos.includes(videoId);
  if (!videoExists) {
    return res
      .status(200)
      .json(new ApiResponse(200, videoExists, "Video not existed in playlist"));
  }

  // if (playlist.videos.length === 1) {
  //     throw new ApiError(400, "Playlist should have at least one video");
  // }

  const videoDelete = await Playlist.findByIdAndUpdate(
    playlistId,
    { $pull: { videos: videoId } },
    { new: true }
  ).populate("videos");

  if (!videoDelete) {
    throw new ApiError(400, "Failed to delete video");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        videoDelete,
        "Video removed from playlist successfully"
      )
    );
});

// TODO: Get all playlists for a user.
// 1. Extract userId from req.params.
// 2. Find playlists by owner field.

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid user ID format");
  }

  const playlists = await Playlist.find({ owner: userId })
    .select("name description videos")
    .populate({
        path: "videos",
        select: "_id title thumbnail duration videoFile"
    });

  if (!playlists || playlists.length === 0) {
    return res.status(404).json(new ApiResponse(404, [], "No Playlist Found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlists, "Playlists Fetched Successfully"));
});


export {
  createPlaylist,
  getPlaylistById,
  updatePlaylist,
  deletePlaylist,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  getUserPlaylists,
};
