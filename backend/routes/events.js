const express = require("express");
const router = express.Router();
const Event = require("../models/Event");
const Session = require("../models/Session");

//POST /api/events — save a new event
router.post("/", async (req, res) => {
  try {
    const event = new Event({
      event_id: req.body.event_id,
      session_id: req.body.session_id,
      robot_id: req.body.robot_id || "bot_01",
      event_type: req.body.event_type,
      trigger: req.body.trigger || null,
      wake_word: req.body.wake_word || null,
      command_text: req.body.command_text || null,
      response_text: req.body.response_text || null,
      gesture_detected: req.body.gesture_detected || null,
      language: req.body.language || "en",
      confidence_score: req.body.confidence_score ?? null,
      noise_level: req.body.noise_level || null,
      retry_count: req.body.retry_count ?? 0,
      processing_latency_ms: req.body.processing_latency_ms ?? null,
      response_latency_ms: req.body.response_latency_ms ?? null,
      success: req.body.success,
      error_code: req.body.error_code || null,
      robot_state: req.body.robot_state || null,
    });

    await event.save();

    //Update parent session — increment total_events and event_type_counts
    await Session.findOneAndUpdate(
      { session_id: req.body.session_id },
      {
        $inc: {
          total_events: 1,
          [`event_type_counts.${req.body.event_type}`]: 1,
        },
      }
    );

    res.status(201).json({ message: "Event saved!", event });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

//GET /api/events — last 50 events, newest first
router.get("/", async (req, res) => {
  try {
    const {
      type, // filter by event_type
      success, // filter by success true/false
      session, // filter by session_id
      limit = 50,
      page = 1,
    } = req.query;

    const filter = {};
    if (type) filter.event_type = type;
    if (session) filter.session_id = session;
    if (success !== undefined) filter.success = success === "true";

    const events = await Event.find(filter)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Event.countDocuments(filter);

    res.json({ total, page: parseInt(page), limit: parseInt(limit), events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//GET /api/events/:event_id — single event by ID
router.get("/:event_id", async (req, res) => {
  try {
    const event = await Event.findOne({ event_id: req.params.event_id });
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
