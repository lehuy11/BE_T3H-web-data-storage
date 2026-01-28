const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth");
const meController = require("../controllers/me.controller");

router.get("/tree", auth, meController.getTree);

module.exports = router;
