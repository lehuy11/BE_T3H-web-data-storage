require("dotenv").config();
const express = require("express");
const cors = require("cors");

const nodeRoutes = require("./routes/me.route");

const app = express();
app.use(
  cors({
    origin: "*", // dev LAN
  }),
);
app.use(express.json());

app.use("/api/me", nodeRoutes);
// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
