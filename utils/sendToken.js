const sendToken = async (user, statusCode, res, message = 'Success') => {
  const accessToken = user.getSignedJWT();
  const refreshToken = user.getRefreshToken();

  // Persist refresh token
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  // Remove sensitive fields
  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.refreshToken;
  delete userObj.resetPasswordToken;
  delete userObj.resetPasswordExpire;

  res.status(statusCode).json({
    success: true,
    message,
    accessToken,
    refreshToken,
    user: userObj,
  });
};

module.exports = sendToken;