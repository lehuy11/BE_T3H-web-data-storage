require("dotenv").config();
const express = require("express");
const cors = require("cors");

const nodeRoutes = require("./routes/nodes.route");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/nodes", nodeRoutes);

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});
