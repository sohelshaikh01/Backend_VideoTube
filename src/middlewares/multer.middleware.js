import multer from "multer";

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, "./public/temp");
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});
// Gives option to take 'req.files' or 'req.file' if single file have to access.

export const upload = multer({
    storage
});

