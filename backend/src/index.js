require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "waqfchain-backend" });
});

// TODO: add Waqf asset, user, and transaction routes

app.listen(PORT, () => {
  console.log(`WaqfChain backend running on port ${PORT}`);
});
