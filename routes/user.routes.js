const express = require('express');
const router = express.Router();
const user = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `avatar-${req.user._id}-${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only images allowed'), false);
}});

router.get('/profile', protect, user.getProfile);
router.put('/profile', protect, user.updateProfile);
router.put('/avatar', protect, upload.single('avatar'), user.uploadAvatar);
router.get('/stats', protect, user.getUserStats);
router.delete('/account', protect, user.deleteAccount);

module.exports = router;