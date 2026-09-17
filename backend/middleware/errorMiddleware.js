function errorMiddleware(err, req, res, next) {
  console.error(err);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'Image size must not exceed 5 MB' });
  }

  if (err.message === 'Only JPG, JPEG and PNG images are allowed') {
    return res.status(400).json({ success: false, message: err.message });
  }

  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message;

  res.status(statusCode).json({
    success: false,
    message
  });
}

module.exports = errorMiddleware;
