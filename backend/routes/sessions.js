const express = require("express");
const router = express.Router();
const Session = require("../models/Session");
const Event = require("../models/Event");
const { CONFIDENCE_LOW } = require("../config/confidence");

//POST /api/sessions/start
router.post("/start", async (req, res) => {
  try {
    const session = new Session({
      session_id: req.body.session_id,
      robot_id: req.body.robot_id || "bot_01",
      user_id: req.body.user_id || null,
    });
    await session.save();
    res.status(201).json({ message: "Session started!", session });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

//POST /api/sessions/end/:session_id
router.post("/end/:session_id", async (req, res) => {
  try {
    const session = await Session.findOne({
      session_id: req.params.session_id,
    });
    if (!session) return res.status(404).json({ error: "Session not found" });

    const events = await Event.find({ session_id: req.params.session_id });
    const end_ts = new Date();
    const duration_s = Math.round((end_ts - session.start_ts) / 1000);

    //Confidence
    const withConfidence = events.filter((e) => e.confidence_score != null);
    const avg_confidence =
      withConfidence.length > 0
        ? parseFloat(
            (
              withConfidence.reduce((s, e) => s + e.confidence_score, 0) /
              withConfidence.length
            ).toFixed(3),
          )
        : null;

    //Success rate
    const success_rate =
      events.length > 0
        ? parseFloat(
            (events.filter((e) => e.success).length / events.length).toFixed(3),
          )
        : null;

    //Latency averages
    const withProcessing = events.filter(
      (e) => e.processing_latency_ms != null,
    );
    const avg_processing_latency_ms =
      withProcessing.length > 0
        ? Math.round(
            withProcessing.reduce((s, e) => s + e.processing_latency_ms, 0) /
              withProcessing.length,
          )
        : null;

    const withResponse = events.filter((e) => e.response_latency_ms != null);
    const avg_response_latency_ms =
      withResponse.length > 0
        ? Math.round(
            withResponse.reduce((s, e) => s + e.response_latency_ms, 0) /
              withResponse.length,
          )
        : null;

    //Quality and retry counts
    const low_quality_event_count = events.filter(
      (e) => e.confidence_score != null && e.confidence_score < CONFIDENCE_LOW,
    ).length;
    const retry_count_total = events.reduce(
      (s, e) => s + (e.retry_count || 0),
      0,
    );

    //Event type counts
    const event_type_counts = {
      voice_command: events.filter((e) => e.event_type === "voice_command")
        .length,
      gesture: events.filter((e) => e.event_type === "gesture").length,
      wake_word: events.filter((e) => e.event_type === "wake_word").length,
    };

    const updated = await Session.findOneAndUpdate(
      { session_id: req.params.session_id },
      {
        end_ts,
        is_active: false,
        duration_s,
        end_reason: req.body.end_reason || "user_ended",
        avg_confidence,
        success_rate,
        avg_processing_latency_ms,
        avg_response_latency_ms,
        low_quality_event_count,
        retry_count_total,
        event_type_counts,
      },
      { new: true },
    );

    res.json({ message: "Session ended!", session: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

//GET /api/sessions
router.get("/", async (req, res) => {
  try {
    const sessions = await Session.find().sort({ start_ts: -1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//GET /api/sessions/:session_id/events
router.get("/:session_id/events", async (req, res) => {
  try {
    const events = await Event.find({ session_id: req.params.session_id }).sort(
      { timestamp: 1 },
    );
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
