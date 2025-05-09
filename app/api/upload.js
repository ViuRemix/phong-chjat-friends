import cloudinary from "cloudinary";

// Thiết lập Cloudinary với API key và secret từ biến môi trường
cloudinary.config({
  cloud_name: "dqe5syxc0",  // Sử dụng cloud_name của bạn
  api_key: process.env.CLOUDINARY_API_KEY,  // API key từ biến môi trường
  api_secret: process.env.CLOUDINARY_API_SECRET,  // API secret từ biến môi trường
});

export async function POST(req, res) {
  try {
    const { file } = req.body;  // Lấy file từ request body

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Upload ảnh lên Cloudinary
    cloudinary.v2.uploader.upload(file, { upload_preset: "ml_default" }, (error, result) => {
      if (error) {
        return res.status(500).json({ error: "Failed to upload image" });
      }

      // Trả về URL ảnh đã upload
      return res.status(200).json({ url: result.secure_url });
    });
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
