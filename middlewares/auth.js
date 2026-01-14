module.exports = (req, res, next) => {
  req.user = {
    id: "demo-user",
    role: "user" // tạm thời
  };
  next();
};
