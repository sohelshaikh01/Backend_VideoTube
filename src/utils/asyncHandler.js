const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
    }
}

export { asyncHandler };

/* Another Logics */
// const asynchHandler = () => {}
// const asynchHandler = (func) => () => {}
// const asynchHandler = (func) => async () => {}

// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
//         await fn(req, res, next);
//     } catch (err) {
//         res.status(err.code || 500).json({
//             success: false,
//             message: err.message
//         })        
//     }
// }

// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
//         await fn(req, res, next);
//     } catch (err) {
//         res.status(err.code || 500).json({
//             success: false,
//             message: err.message
//         });        
//     }
// }