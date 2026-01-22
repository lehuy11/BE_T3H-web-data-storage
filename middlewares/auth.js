// middlewares/auth.js
module.exports = (req, res, next) => {
  /*
    DEV MODE:
    - FE / Postman gửi header:
      x-user-id: demo-user
      x-role: admin | user
  */

  const userId = req.headers["x-user-id"] || req.query["x-user-id"];
  const role = req.headers["x-role"] || req.query["x-role"];
  if (!userId || !role) {
    return res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Chưa đăng nhập hoặc thiếu thông tin xác thực",
    });
  }

  req.user = {
    id: userId,
    role,
  };

  next();
};
