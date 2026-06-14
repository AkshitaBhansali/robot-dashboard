# Interaction Analytics Dashboard — Robot Logging Pipeline

A full-stack pipeline that captures robot interaction events (voice commands, gestures, wake-word triggers), stores them in MongoDB, and exposes usage and quality metrics through a REST API.

## Project Structure

```text
robot-dashboard/
├── schema/
├── backend/
├── simulator/
└── frontend/
```

- **schema/** — JSON Schema contracts for events, sessions, and API responses
- **backend/** — Express.js + MongoDB API
- **simulator/** — Python script that generates simulated robot events
- **frontend/** — React dashboard (in progress)

## Prerequisites

- Node.js 18+
- Python 3.9+
- MongoDB Atlas account (Free Tier supported)

## Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit the `.env` file and add your MongoDB connection string.

### 2. Simulator

```bash
cd simulator
pip install requests
```

## Running the Project

Open two terminals.

### Terminal 1 — Backend

```bash
cd backend
npm start
```

Expected output:

```text
MongoDB connected!
Server running on http://localhost:3000
```

### Terminal 2 — Simulator

```bash
cd simulator
python simulator.py
```

## API Endpoints

| Method | Endpoint                        | Description                                                       |
| ------ | ------------------------------- | ----------------------------------------------------------------- |
| POST   | `/api/sessions/start`           | Start a new session                                               |
| POST   | `/api/sessions/end/:session_id` | End a session and compute summaries                               |
| GET    | `/api/sessions`                 | Retrieve all sessions                                             |
| GET    | `/api/sessions/:id/events`      | Retrieve all events for a session                                 |
| POST   | `/api/events`                   | Create a new event (validated against `schema/event.schema.json`) |
| GET    | `/api/events`                   | Retrieve or filter events                                         |
| GET    | `/api/metrics`                  | Retrieve usage metrics                                            |
| GET    | `/api/quality`                  | Retrieve quality metrics                                          |

## Schema and Contracts

All event, session, and API response structures are defined in the `schema/` directory as JSON Schema Draft-07 documents.

The `POST /api/events` endpoint validates incoming payloads against `schema/event.schema.json` using **AJV** before storing them in MongoDB.

## Technology Stack

- **Backend:** Node.js, Express.js
- **Database:** MongoDB Atlas
- **Validation:** AJV (JSON Schema Validation)
- **Simulator:** Python
- **Frontend:** React (under development)

## Features

- Robot session lifecycle management
- Event ingestion and validation
- Usage analytics and metrics
- Quality monitoring endpoints
- JSON Schema–based API contracts
- Simulated robot event generation for testing
