import requests
import random
import time
import uuid

BASE_URL = "http://localhost:3000/api"

COMMANDS = [
    "Raise your left arm",
    "Move forward",
    "Turn right",
    "Turn left",
    "Stop",
    "Wave hello",
    "Sit down",
    "Stand up",
    "Pick up the object",
    "Follow me",
    "Look left",
    "Look right",
    "Dance",
    "Shake hands",
    "Go to charging station",
]

GESTURES = [
    "thumbs_up",
    "wave",
    "point_left",
    "point_right",
    "stop_hand",
    "clap",
    "fist_pump",
]

RESPONSE_MAP = {
    "Raise your left arm":      "Raising left arm",
    "Move forward":             "Moving forward",
    "Turn right":               "Turning right",
    "Turn left":                "Turning left",
    "Stop":                     "Stopping now",
    "Wave hello":               "Waving hello",
    "Sit down":                 "Sitting down",
    "Stand up":                 "Standing up",
    "Pick up the object":       "Picking up object",
    "Follow me":                "Following you",
    "Look left":                "Looking left",
    "Look right":               "Looking right",
    "Dance":                    "Let's dance!",
    "Shake hands":              "Extending hand",
    "Go to charging station":   "Heading to charger",
}

USER_IDS   = ["user_01", "user_02", "user_03", "user_04"]

ERROR_CODES = {
    "voice_command": ["LOW_CONFIDENCE", "COMMAND_NOT_FOUND", "ROBOT_BUSY", "TIMEOUT"],
    "gesture":       ["LOW_CONFIDENCE", "HARDWARE_ERROR"],
    "wake_word":     ["LOW_CONFIDENCE", "TIMEOUT"],
}

# ── Helpers ────────────────────────────────────────────────────────────────────

def generate_event_id():
    return f"evt_{uuid.uuid4().hex[:8]}"

def generate_session_id():
    return f"sess_{uuid.uuid4().hex[:6]}"

def clip(value, lo, hi):
    return max(lo, min(hi, value))

# ── Session calls ──────────────────────────────────────────────────────────────

def start_session(session_id, user_id):
    payload = {
        "session_id": session_id,
        "robot_id":   "bot_01",
        "user_id":    user_id,
    }
    try:
        res = requests.post(f"{BASE_URL}/sessions/start", json=payload)
        if res.status_code == 201:
            print(f"\n--- Session started: {session_id} | user: {user_id} ---")
            return True
        else:
            print(f"Failed to start session: {res.text}")
            return False
    except requests.exceptions.ConnectionError:
        print("Cannot connect to backend. Is it running on port 3000?")
        return False

def end_session(session_id, end_reason):
    payload = { "end_reason": end_reason }
    try:
        res = requests.post(f"{BASE_URL}/sessions/end/{session_id}", json=payload)
        print(f"--- Session ended: {session_id} | reason: {end_reason} ---\n")
    except requests.exceptions.ConnectionError:
        print("Could not end session — backend connection lost.")

# ── Event builder ──────────────────────────────────────────────────────────────

def build_event(session_id, event_type):
    success          = random.random() > 0.10
    confidence_score = clip(round(random.gauss(0.80, 0.12), 2), 0.0, 1.0)

    # Low confidence events are more likely to fail
    if confidence_score < 0.60:
        success = random.random() > 0.50

    event = {
        "event_id":              generate_event_id(),
        "session_id":            session_id,
        "robot_id":              "bot_01",
        "event_type":            event_type,
        "trigger":               None,
        "wake_word":             None,
        "command_text":          None,
        "response_text":         None,
        "gesture_detected":      None,
        "language":              "en",
        "confidence_score":      confidence_score,
        "noise_level":           random.choices(
                                     ["low", "medium", "high"],
                                     weights=[60, 30, 10]
                                 )[0],
        "retry_count":           random.choices([0, 1, 2], weights=[85, 12, 3])[0],
        "processing_latency_ms": max(100, int(random.gauss(800, 200))),
        "response_latency_ms":   max(50,  int(random.gauss(350, 100))),
        "success":               success,
        "error_code":            None,
        "robot_state":           random.choices(
                                     ["idle", "moving", "speaking"],
                                     weights=[60, 25, 15]
                                 )[0],
    }

    # ── wake_word ──────────────────────────────────────────
    if event_type == "wake_word":
        event["wake_word"]             = random.choice(["Hey Robot", "OK Robot", "Robot wake up"])
        event["trigger"]               = "wake_word"
        event["response_text"]         = "Yes, I'm listening"
        event["processing_latency_ms"] = max(50, int(random.gauss(300, 80)))
        event["response_latency_ms"]   = None
        if not success:
            event["error_code"] = random.choice(ERROR_CODES["wake_word"])

    # ── voice_command ──────────────────────────────────────
    elif event_type == "voice_command":
        command                = random.choice(COMMANDS)
        event["command_text"]  = command
        event["trigger"]       = "wake_word"
        event["response_text"] = RESPONSE_MAP[command] if success else "Sorry, I could not do that"
        if not success:
            event["error_code"] = random.choice(ERROR_CODES["voice_command"])

    # ── gesture ────────────────────────────────────────────
    elif event_type == "gesture":
        event["gesture_detected"] = random.choice(GESTURES)
        event["trigger"]          = "button"
        event["response_text"]    = "Gesture recognised" if success else "Gesture not recognised"
        event["response_latency_ms"] = max(30, int(random.gauss(200, 60)))
        if not success:
            event["error_code"] = random.choice(ERROR_CODES["gesture"])

    return event

# ── Send one event ─────────────────────────────────────────────────────────────

def send_event(session_id, event_type):
    event = build_event(session_id, event_type)
    try:
        res    = requests.post(f"{BASE_URL}/events", json=event)
        status = "OK  " if event["success"] else "FAIL"
        code   = f" | error: {event['error_code']}" if event["error_code"] else ""
        print(
            f"  [{status}] {event_type:15s}"
            f" | conf: {event['confidence_score']:.2f}"
            f" | latency: {event['processing_latency_ms']}ms"
            f" | noise: {event['noise_level']}"
            f" | retries: {event['retry_count']}"
            f"{code}"
        )
    except requests.exceptions.ConnectionError:
        print("  [ERR ] Could not send event — backend down.")

# ── One full session ───────────────────────────────────────────────────────────

def run_session():
    session_id = generate_session_id()
    user_id    = random.choice(USER_IDS)

    if not start_session(session_id, user_id):
        return

    # Every session begins with a wake word
    send_event(session_id, "wake_word")
    time.sleep(random.uniform(0.3, 0.7))

    # Random mix of voice commands and gestures
    num_events = random.randint(5, 15)
    for _ in range(num_events):
        event_type = random.choices(
            ["voice_command", "gesture"],
            weights=[70, 30]
        )[0]
        send_event(session_id, event_type)
        time.sleep(random.uniform(0.5, 1.5))

    # End reason is mostly user_ended, occasionally timeout or error
    end_reason = random.choices(
        ["user_ended", "timeout", "error", "robot_ended"],
        weights=[75, 15, 7, 3]
    )[0]
    end_session(session_id, end_reason)

# ── Main loop ──────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  Robot Simulator — press Ctrl+C to stop")
    print("=" * 60)
    try:
        while True:
            run_session()
            gap = random.uniform(2, 5)
            print(f"Waiting {gap:.1f}s before next session...\n")
            time.sleep(gap)
    except KeyboardInterrupt:
        print("\nSimulator stopped.")

if __name__ == "__main__":
    main()