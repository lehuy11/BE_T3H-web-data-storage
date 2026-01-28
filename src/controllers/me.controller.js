const meService = require("../services/me.service");

exports.getTree = async (req, res) => {
  try {
    const user = req.user; // { id, role }

    const data = await meService.getUserTree(user);

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};
