const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary if environment variables exist
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Ensure local uploads directory exists (used for fallback & temp storage)
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// @route   GET /api/upload/files
// @desc    List uploaded local image files
// @access  Public
router.get('/files', async (req, res) => {
  try {
    const files = await fs.promises.readdir(uploadDir);
    const images = files
      .filter((file) => /\.(png|jpg|jpeg|webp)$/i.test(file))
      .map((file) => ({
        filename: file,
        url: `/uploads/${file}`,
      }));
    res.json(images);
  } catch (err) {
    console.error('Error reading uploads directory:', err);
    res.status(500).json({ msg: 'Unable to list upload files' });
  }
});

// @route   POST /api/upload
// @desc    Upload an image (Cloudinary if configured, otherwise local disk)
// @access  Public
router.post('/', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ msg: 'No image file uploaded' });
  }

  try {
    const isCloudinaryConfigured = Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );

    if (isCloudinaryConfigured) {
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'treecanopy_uploads',
      });

      // Cleanup local temp file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(201).json({
        msg: 'Image uploaded to Cloudinary successfully',
        url: result.secure_url,
        public_id: result.public_id,
        filename: req.file.filename,
      });
    }

    // Local Disk Fallback
    const fileUrl = `/uploads/${req.file.filename}`;
    return res.status(201).json({
      msg: 'Image uploaded to local storage successfully',
      url: fileUrl,
      filename: req.file.filename,
    });
  } catch (error) {
    console.error('Upload Error:', error);
    // Cleanup local temp file if Cloudinary upload failed
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    return res.status(500).json({ msg: 'Failed to upload image', error: error.message });
  }
});

// Handle multer errors
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ msg: `Upload error: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ msg: err.message });
  }
  next();
});

module.exports = router;
