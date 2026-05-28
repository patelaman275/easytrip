# EasyTrip Multi-Rider Trip Coordination and Safety Platform

EasyTrip is a modern, full-stack, real-time multi-rider trip coordination and safety platform built for travel groups, cyclists, and motorcycle riders. It couples real-time telemetry (GPS, Speed, Battery) with high-priority SOS emergency overlays, group chats, checkpoints monitoring matrices, and automated separation radar.

---

## 🚀 Key Features

1. **Active Real-Time GPS Tracking**: Moving vectors on Leaflet showing group positions, speed tags, and battery telemetry.
2. **Synchronized Route Broadcasts**: Trip leader can update path coordinates, which sync automatically in real-time across other riders.
3. **Milestone Checkpoint Dashboards**: Calculates distances, remaining ETAs, and updates checkpoint status (Reached, Pending).
4. **Interactive GPS Simulator**: A scenic road trip simulator around San Francisco's coastal headlands, enabling full end-to-end testing of real-time positions, speed depleters, and checkpoint alerts offline.
5. **High-Priority SOS Alerts**: Hold panic trigger for 1.2s to broadcast a full-screen red warning popup that interrupts other users' screens with location details.
6. **Separation Alarms**: Geodesic radar tracking distances, warning riders if they drift more than 600m from the pack.
7. **Modular Administration**: Leaders can start/end trips, broadcast custom flash announcements, and kick participants.

---

## 🛠️ Technology Stack

* **Frontend**: React (Vite) + Tailwind CSS + Lucide Icons + Leaflet + Socket.io-client
* **Backend**: Node.js + Express.js + Socket.io + Mongoose
* **Database**: MongoDB (Local or MongoDB Atlas)
* **Authentication**: JWT + bcryptjs

---

## 📂 Project Structure

```text
easytrip/
├── backend/
│   ├── src/
│   │   ├── config/db.js            # Mongoose MongoDB Connection
│   │   ├── middleware/auth.js      # JWT Verification Route Guard
│   │   ├── models/                 # MongoDB Schemas (User, Trip, Location, Chat, SOS, Checkpoints)
│   │   ├── routes/                 # REST Controller Endpoints (Auth, Trips, Analytics)
│   │   ├── sockets/socketHandler.js # Real-time Sockets Logic
│   │   └── server.js               # Main Entry setup
│   ├── .env
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/             # Modular Glassmorphic Components (Map, Chat, SOS, Stats)
    │   ├── context/                # Context API Providers (Auth, Socket, ActiveTrip)
    │   ├── pages/                  # AuthPage, DashboardPage, TripRoomPage
    │   ├── utils/                  # api.js client, geoUtils.js distance calculators
    │   └── App.jsx                 # Routing and security wrappers
    ├── index.html
    └── package.json
```

---

## ⚡ Quick Start & Installation

### Prerequisite
Ensure you have [Node.js](https://nodejs.org) installed on your system.

### Step 1: Run Backend Server
1. Navigate into the `backend/` directory:
   ```bash
   cd backend
   ```
2. Start the local server:
   ```bash
   npm run dev
   ```
   *(The server will run on `http://localhost:5000`. If you do not have MongoDB running, the server is equipped with a robust safety wrapper that runs in "offline-fallback mode" without crashing, so you can still test other interfaces!)*

### Step 2: Run Frontend React App
1. Open a new terminal and navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Start the Vite React development server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:5173` in your browser.

---

## 🔧 Environment Variables

### Backend (`backend/.env`)
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/easytrip
JWT_SECRET=easytrip_super_secret_session_token_key_9876
NODE_ENV=development
```

---

## 📡 Socket.io Events

* **Client to Server**:
  - `join_trip_room`: Bind socket to specific trip chat room.
  - `update_location`: Stream current coordinates, speed, and battery percentage.
  - `send_message`: Push chat text to room history.
  - `typing_status`: Broadcasters typing presence indicators.
  - `trigger_sos`: Raise high-priority emergency flag.
  - `resolve_sos`: Mark safety issue as resolved.
* **Server to Client**:
  - `online_riders_update`: Lists active group sizes.
  - `rider_locations_updated`: Broadcasts telemetry coordinate sets of all riders.
  - `new_chat_message`: Renders chat balloon pings.
  - `sos_broadcast`: Triggers emergency red overlays.
  - `route_synchronized`: Synced redrawing of polylines.
  - `checkpoint_notification`: milestone toast warnings.

---

## 🤝 Verification Guidelines

To test the application locally in full multi-client simulation mode:
1. Open two separate browser tabs at `http://localhost:5173`.
2. Register/Login as **Rider A** in Tab 1, and **Rider B** in Tab 2.
3. As Rider A, press **Create Trip** to configure a room (which automatically populates 4 scenic checkpoints and golden-gate route polylines).
4. Note the generated 6-character **Invite Code** in Rider A's navbar.
5. In Tab 2, enter that code in Rider B's navbar and press **Join Ride**.
6. Open the **Live Coordinates Map** tab on both. You will see both riders mapped together!
7. On Rider B's screen, press **Start Simulator**. You will see Rider B's marker begin moving along the scenic route polyline!
8. Observe Rider A's screen: Rider B is moving in real-time, their speed changes, and milestone progress toast alerts flash as they pass checkpoints!
9. Press **Hold SOS** on Rider B's screen: Rider A's screen is instantly locked with a flashing full-screen red warning popup containing Rider B's GPS coordinates!
