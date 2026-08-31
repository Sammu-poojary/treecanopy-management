const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// @route   GET /api/upload/files
// @desc    List uploaded image files
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
// @desc    Upload a single image, returns URL path
// @access  Protected
router.post('/', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ msg: 'No image file uploaded' });
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  res.status(201).json({
    msg: 'Image uploaded successfully',
    url: fileUrl,
    filename: req.file.filename,
  });
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
