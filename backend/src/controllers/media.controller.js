const multer = require("multer");

const { v2: cloudinary } = require("cloudinary");

const mediaUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024
    },
    fileFilter: (req, file, callback) => {
        if (
            file.mimetype.startsWith("image/")
            || file.mimetype.startsWith("video/")
            || file.mimetype === "application/pdf"
        ) {
            return callback(null, true);
        }

        return callback(new Error("Only photograph, video, and PDF files are supported"));
    }
});

if (process.env.CLOUDINARY_URL) {
    cloudinary.config({ secure: true });
} else {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
    });
}

const uploadMedia = (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: "A photograph, video, or PDF file is required"
        });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
        {
            folder: process.env.CLOUDINARY_MEDIA_FOLDER || "cryoverse/resources",
            resource_type: "auto"
        },
        (error, result) => {
            if (error) {
                console.error("Media upload failed:", error.message);
                return res.status(502).json({
                    success: false,
                    message: "Unable to upload media"
                });
            }

            return res.status(201).json({
                success: true,
                fileUrl: result.secure_url,
                publicId: result.public_id,
                resourceType: result.resource_type
            });
        }
    );

    uploadStream.end(req.file.buffer);
};

const handleMediaUpload = (req, res, next) => {
    mediaUpload.single("file")(req, res, (error) => {
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return next();
    });
};

module.exports = {
    uploadMedia,
    handleMediaUpload
};
