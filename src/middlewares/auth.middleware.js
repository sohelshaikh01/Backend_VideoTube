// Verify User present or not.
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

// Adding user to req.body object

export const verifyJWT = asyncHandler( async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        // May user send cookie in header
    
        if(!token) {
            throw new ApiError(401, "Unauthorized User trying to login");
            // Earlier here is logout
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken?._id)
        .select("-password -refreshToken");
    
        if(!user) {
            // TODO: next video(15) discuss about Frontend
            throw new ApiError(401, "Invalid Access Token");
        }
    
        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Access Token");
    }

});

// req has cookie access through cookieparser
