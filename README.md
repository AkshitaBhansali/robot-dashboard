# Interaction Analytics Dashboard — Robot Logging Pipeline

A full-stack pipeline that captures robot interaction events
(voice commands, gestures, wake-word triggers), stores them in
MongoDB, and exposes usage and quality metrics via a REST API.

## Project structure

\`\`\`
robot-dashboard/
├── schema/ JSON Schema contracts for events, sessions, and API responses
├── backend/ Express + MongoDB API
├── simulator/ Python script that generates fake robot events
└── frontend/ React dashboard (in progress)
\`\`\`

## Prerequisites

- Node.js 18+
- Python 3.9+
- A MongoDB Atlas account (free tier works)

## Setup

### 1. Backend

\`\`\`bash
cd backend
npm install
cp .env.example .env

# edit .env and paste your MongoDB connection string

\`\`\`

### 2. Simulator

\`\`\`bash
cd simulator
pip install requests
\`\`\`

## Running the project

Open two terminals.

**Terminal 1 — backend**
\`\`\`bash
cd backend
npm start
\`\`\`
Expected output:
\`\`\`
MongoDB connected!
Server running on http://localhost:3000
\`\`\`

**Terminal 2 — simulator**
\`\`\`bash
cd simulator
python simulator.py
\`\`\`

## API endpoints

| Method | Endpoint                      | Description                                                   |
| ------ | ----------------------------- | ------------------------------------------------------------- |
| POST   | /api/sessions/start           | Start a new session                                           |
| POST   | /api/sessions/end/:session_id | End a session, computes summaries                             |
| GET    | /api/sessions                 | List all sessions                                             |
| GET    | /api/sessions/:id/events      | All events in a session                                       |
| POST   | /api/events                   | Save a new event (validated against schema/event.schema.json) |
| GET    | /api/events                   | List/filter events                                            |
| GET    | /api/metrics                  | Usage metrics — see schema/metrics.contract.json              |
| GET    | /api/quality                  | Quality metrics — see schema/quality.contract.json            |

## Schema and contracts

All event, session, and API response shapes are defined in `/schema`
as JSON Schema (draft-07) documents. `POST /api/events` validates
incoming payloads against `schema/event.schema.json` using ajv.
