const path = require("path");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  timeout: 120000,
});

const getResourceType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  if ([".mp4", ".mov", ".avi", ".mkv", ".webm"].includes(ext)) return "video";
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].includes(ext)) return "image";
  return "auto"; // fallback
};

const uploadMediaToCloudinary = async (filePath) => {
  const maxRetries = 2;
  let attempt = 0;
  const resource_type = getResourceType(filePath);

  const upload = () =>
    new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type, folder: "media" },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );

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

const deleteMediaFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "auto" });
  } catch (error) {
    console.error("Failed to delete asset from Cloudinary:", error);
    throw new Error("Failed to delete asset from Cloudinary");
  }
};

module.exports = { uploadMediaToCloudinary, deleteMediaFromCloudinary };
