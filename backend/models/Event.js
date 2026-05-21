const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  //Identity
  event_id: { type: String, required: true, unique: true },
  session_id: { type: String, ref: "Session", required: true },
  robot_id: { type: String, default: "bot_01" },
  timestamp: { type: Date, default: Date.now },

  //Event classification
  event_type: {
    type: String,
    enum: ["voice_command", "gesture", "wake_word"],
    required: true,
  },
  trigger: {
    type: String,
    enum: ["wake_word", "button", "api", "scheduled", null],
    default: null,
  },

  //Voice specific
  wake_word: { type: String, default: null }, // e.g. "Hey Robot"
  command_text: { type: String, default: null }, // e.g. "Raise your left arm"
  response_text: { type: String, default: null }, // e.g. "Raising left arm"
  language: { type: String, default: "en" },

  //Gesture specific
  gesture_detected: { type: String, default: null },

  //Quality signals
  confidence_score: { type: Number, min: 0, max: 1, default: null },
  noise_level: {
    type: String,
    enum: ["low", "medium", "high", null],
    default: null,
  },
  retry_count: { type: Number, default: 0 }, // how many times user repeated

  //Performance
  processing_latency_ms: { type: Number, default: null },
  response_latency_ms: { type: Number, default: null },

  //Outcome
  success: { type: Boolean, required: true },
  error_code: {
    type: String,
    enum: [
      "LOW_CONFIDENCE",
      "COMMAND_NOT_FOUND",
      "ROBOT_BUSY",
      "HARDWARE_ERROR",
      "TIMEOUT",
      null,
    ],
    default: null,
  },

  //Context
  robot_state: {
    type: String,
    enum: ["idle", "moving", "charging", "speaking", "error", null],
    default: null,
  },
});

module.exports = mongoose.model("Event", eventSchema);
