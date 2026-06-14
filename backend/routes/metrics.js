const express = require("express");
const router = express.Router();
const Event = require("../models/Event");
const Session = require("../models/Session");

// GET /api/metrics
router.get("/", async (req, res) => {
  try {
    // 1. Total events
    const totalEvents = await Event.countDocuments();

    // 2. Average latency across all events
    const latencyResult = await Event.aggregate([
      { $match: { processing_latency_ms: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: null,
          avg_processing: { $avg: "$processing_latency_ms" },
          avg_response: { $avg: "$response_latency_ms" },
        },
      },
    ]);
    const avgProcessingLatency =
      latencyResult[0]?.avg_processing?.toFixed(0) || 0;
    const avgResponseLatency = latencyResult[0]?.avg_response?.toFixed(0) || 0;

    // 3. Overall success rate
    const successCount = await Event.countDocuments({ success: true });
    const successRate =
      totalEvents > 0 ? ((successCount / totalEvents) * 100).toFixed(1) : 0;

    // 4. Event count broken down by type
    const byType = await Event.aggregate([
      { $group: { _id: "$event_type", count: { $sum: 1 } } },
    ]);

    // 5. Active sessions right now
    const activeSessions = await Session.countDocuments({ is_active: true });

    // 6. Total sessions ever
    const totalSessions = await Session.countDocuments();

    // 7. Latency over time (last 60 minutes, bucketed per minute)
    const sixtyMinsAgo = new Date(Date.now() - 60 * 60 * 1000);
    const latencyOverTime = await Event.aggregate([
      {
        $match: {
          timestamp: { $gte: sixtyMinsAgo },
          processing_latency_ms: { $exists: true },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%H:%M", date: "$timestamp" },
          },
          avg_latency: { $avg: "$processing_latency_ms" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 8. Wake word success vs failure breakdown
    const wakeWordStats = await Event.aggregate([
      { $match: { event_type: "wake_word" } },
      { $group: { _id: "$success", count: { $sum: 1 } } },
    ]);

    res.json({
      totalEvents,
      totalSessions,
      activeSessions,
      avgProcessingLatency,
      avgResponseLatency,
      successRate,
      byType,
      latencyOverTime,
      wakeWordStats,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
