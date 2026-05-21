const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
  //Identity
  session_id: { type: String, required: true, unique: true },
  robot_id: { type: String, default: "bot_01" },
  user_id: { type: String, default: null },

  //Timing
  start_ts: { type: Date, default: Date.now },
  end_ts: { type: Date, default: null },
  duration_s: { type: Number, default: null },
  is_active: { type: Boolean, default: true },

  //Ending
  end_reason: {
    type: String,
    enum: ["user_ended", "timeout", "error", "robot_ended", null],
    default: null,
  },

  //Event summary
  total_events: { type: Number, default: 0 },
  event_type_counts: {
    voice_command: { type: Number, default: 0 },
    gesture: { type: Number, default: 0 },
    wake_word: { type: Number, default: 0 },
  },

  //Quality summary (computed on session end)
  avg_confidence: { type: Number, default: null },
  success_rate: { type: Number, default: null },
  low_quality_event_count: { type: Number, default: null }, // confidence < 0.6
  retry_count_total: { type: Number, default: 0 },

  //Performance summary (computed on session end)
  avg_processing_latency_ms: { type: Number, default: null },
  avg_response_latency_ms: { type: Number, default: null },
});

module.exports = mongoose.model("Session", sessionSchema);
