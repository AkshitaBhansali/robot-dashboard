const express = require("express");
const router = express.Router();
const Event = require("../models/Event");
const Session = require("../models/Session");
const {
  CONFIDENCE_LOW,
  CONFIDENCE_MEDIUM,
  CONFIDENCE_HIGH,
} = require("../config/confidence");

router.get("/", async (req, res) => {
  try {
    // 1. Average confidence score overall
    const confidenceResult = await Event.aggregate([
      { $match: { confidence_score: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: null,
          avg_confidence: { $avg: "$confidence_score" },
        },
      },
    ]);
    const avgConfidence = confidenceResult[0]?.avg_confidence?.toFixed(3) || 0;

    // 2. Confidence buckets — how often is the robot sure vs unsure?
    const confidenceBuckets = await Event.aggregate([
      { $match: { confidence_score: { $exists: true } } },
      {
        $bucket: {
          groupBy: "$confidence_score",
          boundaries: [
            0,
            CONFIDENCE_LOW,
            CONFIDENCE_MEDIUM,
            CONFIDENCE_HIGH,
            1.01,
          ],
          default: "other",
          output: { count: { $sum: 1 } },
        },
      },
    ]);

    // 3. Quality categories
    // great    = confidence >= CONFIDENCE_HIGH AND success
    // lucky    = confidence <  CONFIDENCE_HIGH AND success
    // broken   = confidence >= CONFIDENCE_HIGH AND failed
    // bad      = confidence <  CONFIDENCE_HIGH AND failed
    const great = await Event.countDocuments({
      confidence_score: { $gte: CONFIDENCE_HIGH },
      success: true,
    });
    const lucky = await Event.countDocuments({
      confidence_score: { $lt: CONFIDENCE_HIGH },
      success: true,
    });
    const broken = await Event.countDocuments({
      confidence_score: { $gte: CONFIDENCE_HIGH },
      success: false,
    });
    const bad = await Event.countDocuments({
      confidence_score: { $lt: CONFIDENCE_HIGH },
      success: false,
    });

    // 4. Avg confidence per event type
    const confidenceByType = await Event.aggregate([
      { $match: { confidence_score: { $exists: true } } },
      {
        $group: {
          _id: "$event_type",
          avg_confidence: { $avg: "$confidence_score" },
          avg_latency: { $avg: "$processing_latency_ms" },
          total: { $sum: 1 },
          success_count: { $sum: { $cond: ["$success", 1, 0] } },
        },
      },
      {
        $addFields: {
          success_rate: {
            $round: [
              { $multiply: [{ $divide: ["$success_count", "$total"] }, 100] },
              1,
            ],
          },
          avg_confidence: { $round: ["$avg_confidence", 3] },
          avg_latency: { $round: ["$avg_latency", 0] },
        },
      },
    ]);

    // 5. Low quality events (confidence < CONFIDENCE_LOW) — for the dashboard alert feed
    const lowQualityEvents = await Event.find({
      confidence_score: { $lt: CONFIDENCE_LOW },
    })
      .sort({ timestamp: -1 })
      .limit(10)
      .select(
        "event_id event_type command_text confidence_score success timestamp session_id",
      );

    // 6. Quality trend over time (last 60 mins, per minute)
    const sixtyMinsAgo = new Date(Date.now() - 60 * 60 * 1000);
    const qualityOverTime = await Event.aggregate([
      {
        $match: {
          timestamp: { $gte: sixtyMinsAgo },
          confidence_score: { $exists: true },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%H:%M", date: "$timestamp" } },
          avg_confidence: { $avg: "$confidence_score" },
          total: { $sum: 1 },
          success_count: { $sum: { $cond: ["$success", 1, 0] } },
        },
      },
      {
        $addFields: {
          avg_confidence: { $round: ["$avg_confidence", 3] },
          success_rate: {
            $round: [
              { $multiply: [{ $divide: ["$success_count", "$total"] }, 100] },
              1,
            ],
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 7. Per session quality summary
    const sessionQuality = await Event.aggregate([
      {
        $group: {
          _id: "$session_id",
          avg_confidence: { $avg: "$confidence_score" },
          total_events: { $sum: 1 },
          success_count: { $sum: { $cond: ["$success", 1, 0] } },
          avg_latency: { $avg: "$processing_latency_ms" },
        },
      },
      {
        $addFields: {
          avg_confidence: { $round: ["$avg_confidence", 3] },
          avg_latency: { $round: ["$avg_latency", 0] },
          success_rate: {
            $round: [
              {
                $multiply: [
                  { $divide: ["$success_count", "$total_events"] },
                  100,
                ],
              },
              1,
            ],
          },
        },
      },
      { $sort: { avg_confidence: -1 } },
    ]);

    res.json({
      avgConfidence,
      confidenceBuckets,
      qualityCategories: { great, lucky, broken, bad },
      confidenceByType,
      lowQualityEvents,
      qualityOverTime,
      sessionQuality,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
