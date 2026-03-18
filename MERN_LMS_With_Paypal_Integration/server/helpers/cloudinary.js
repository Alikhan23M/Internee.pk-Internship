const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const streamifier = require("streamifier");

// Configure with env data
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  timeout: 120000, // 2 minutes
});

/**
 * Uploads media to Cloudinary with retry and stream handling
 * @param {string} filePath - Local file path
 * @returns {Promise<Object>} - Cloudinary upload result
 */
const uploadMediaToCloudinary = async (filePath) => {
  const maxRetries = 2;
  let attempt = 0;

  const upload = () =>
    new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: "auto", folder: "media" },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );

      // Read file as stream
      const fileStream = fs.createReadStream(filePath);
      fileStream.on("error", (err) => reject(err));
      fileStream.pipe(uploadStream);
    });

  while (attempt <= maxRetries) {
    try {
      return await upload();
    } catch (error) {
      attempt++;
      console.warn(
        `Cloudinary upload attempt ${attempt} failed. Retrying...`,
        error.message
      );
      if (attempt > maxRetries) {
        console.error("Cloudinary upload failed after retries:", error);
        throw new Error("Error uploading to Cloudinary");
      }
    }
  }
};

/**
 * Deletes media from Cloudinary
 * @param {string} publicId - Public ID of the media
 */
const deleteMediaFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "auto" });
  } catch (error) {
    console.error("Failed to delete asset from Cloudinary:", error);
    throw new Error("Failed to delete asset from Cloudinary");
  }
};

module.exports = { uploadMediaToCloudinary, deleteMediaFromCloudinary };
