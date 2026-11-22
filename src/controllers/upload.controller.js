const env = require("../config/env");
const ApiError = require("../utils/api-error");

const uploadImage = async (req, res, next) => {
  try {
    if (!env.imgbbKey || env.imgbbKey.startsWith("REPLACE_ME")) {
      throw ApiError.serviceUnavailable("Image upload is not configured. Set IMGBB_KEY first.");
    }
    if (!req.file) throw ApiError.badRequest("Attach an image using the 'image' field.");

    const form = new FormData();
    form.append(
      "image",
      new Blob([req.file.buffer], { type: req.file.mimetype }),
      req.file.originalname,
    );

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${env.imgbbKey}`, {
      method: "POST",
      body: form,
    });
    const body = await response.json().catch(() => ({}));

    if (!response.ok || !body.success) {
      throw new ApiError(502, body.error?.message || "ImgBB rejected the image.");
    }

    res.json({ success: true, url: body.data.url, image: body.data });
  } catch (error) {
    next(error);
  }
};

module.exports = { uploadImage };
