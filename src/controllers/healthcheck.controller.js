import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// TODO: Return a simple health status message.
const healthcheck = asyncHandler(async (req, res) => {

    res.status(200).json(new ApiResponse(200, "Server is healthy"));
    
});
  
export { healthcheck };
