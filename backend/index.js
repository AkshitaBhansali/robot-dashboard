const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const eventsRouter = require("./routes/events");
const sessionsRouter = require("./routes/sessions");
const metricsRouter = require("./routes/metrics");
const qualityRouter = require("./routes/quality");

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected!"))
  .catch((err) => console.log("MongoDB error:", err));

app.get("/", (req, res) => {
  res.json({ message: "Robot Dashboard API is running!" });
});

app.use("/api/events", eventsRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/metrics", metricsRouter);
app.use("/api/quality", qualityRouter);

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
