const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadBaseDir = path.join(__dirname, '..', 'uploads');
const identityDir = path.join(uploadBaseDir, 'identity');
const receiptDir = path.join(uploadBaseDir, 'receipts');

fs.mkdirSync(identityDir, { recursive: true });
fs.mkdirSync(receiptDir, { recursive: true });

const makeStorage = (targetDir, prefix) =>
  multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, targetDir),
    filename: (_req, file, cb) => {
      const unique = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname || '') || '.png';
      cb(null, `${unique}${ext}`);
    },
  });

const imageOnlyFilter = (_req, file, cb) => {
  const ok = !!file.mimetype && file.mimetype.startsWith('image/');
  cb(null, ok);
};

const receiptUpload = multer({
  storage: makeStorage(receiptDir, 'receipt'),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: imageOnlyFilter,
});

const identityUpload = multer({
  storage: makeStorage(identityDir, 'identity'),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: imageOnlyFilter,
});

module.exports = {
  receiptUpload,
  identityUpload,
};
