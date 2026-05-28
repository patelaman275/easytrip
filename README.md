# 🧭 EasyTrip - Real-Time Group Ride Tracking Platform

EasyTrip is a lightweight, simplified full-stack application designed to coordinate group rides in real-time. It features a modern dark Map interface, live GPS coordinate watching, dynamic destination selection, checkpoints management, invite code synchronization, and a high-priority SOS alert system.

This project is built with **zero database requirements** and **no user authentication screens**, using self-contained in-memory WebSockets room coordination for instant and resilient operation.

---

## 🚀 Core Features

1. **Direct Map Access**: No signup or login pages. Enter a display nickname and instantly access the full-screen tracking radar.
2. **Continuous GPS Location**: Traces and broadcasts current coordinates continuously using the browser's `navigator.geolocation.watchPosition()` API.
3. **Interactive Route Builder**: Click anywhere on the map to set the Destination and draw a direct route polyline from the creation point.
4. **Custom Milestones**: Click the map after a destination is selected to drop checkpoints that sync instantly to all joined riders.
5. **Frictionless Joining**: Generate a 6-character room code (e.g. `RIDE-4821`) and share it. Other riders can enter the code to instantly join the room.
6. **Real-Time Map Synchronization**: Instant updates to rider locations, newly added checkpoints, route endpoints, and distress signals via Socket.io.
7. **Distress SOS Panel**: Broadcasts a full-screen red flashing overlay to all riders in the room during emergencies.
8. **Scenic route simulator**: Built-in simulator to test and demonstrate live tracking, speeds, and battery drainage indoors.

---

## 🛠️ Simple Tech Stack

* **Frontend**: React (Vite) + Tailwind CSS + Lucide Icons + Leaflet (Map UI) + Socket.io-client
* **Backend**: Node.js + Express.js + Socket.io (In-memory storage)

---

## 📂 Project Structure

```text
easytrip/
├── backend/
│   ├── src/
│   │   └── server.js     # Single entry point for Express and Socket.io in-memory rooms
│   └── package.json
└── frontend/
    ├── src/
    │   ├── App.css
    │   ├── App.jsx       # Consolidated high-fidelity single-page mapping dashboard
    │   ├── index.css     # Dark mode, custom scrollbars, and marker styles
    │   └── main.jsx      # Bootstrapper
    ├── index.html
    └── package.json
```

---

## ⚡ Step-by-Step Local Setup

Ensure you have [Node.js](https://nodejs.org) (v18+) installed.

### Step 1: Run the Backend Socket Server
1. Open a new terminal and navigate to the backend folder:
   ```powershell
   cd backend
   ```
2. Install dependencies:
   ```powershell
   npm install
   ```
3. Start the node server:
   ```powershell
   npm start
   ```
   *(The in-memory socket server will run live on `http://localhost:5000`)*

### Step 2: Run the Frontend React App
1. Open a second terminal and navigate to the frontend folder:
   ```powershell
   cd frontend
   ```
2. Install dependencies:
   ```powershell
   npm install
   ```
3. Start the Vite development server:
   ```powershell
   npm run dev
   ```
4. Open the displayed URL in your browser (typically `http://localhost:5173`).

---

## 📡 Backend Socket Events

* `createRide`: Registers the room and adds the creator as the group leader.
* `joinRide`: Validates the invite code and joins the rider to the WebSocket room.
* `sendLocation`: Continuous stream of current latitude/longitude coordinates.
* `receiveLocation`: Delivers active rider coordinate maps to everyone in the room.
* `addCheckpoint`: Registers and syncs a custom milestone point.
* `updateRoute`: Sets and broadcasts the ride destination and route line.
* `sosAlert`: Triggers group-wide flashing distress notifications.

---

## 🤝 Verification Guidelines (How to Test)

1. Open two separate browser tabs at `http://localhost:5173` to simulate two riders.
2. Enter **Aman** as the Nickname in Tab 1, and **Rohan** in Tab 2.
3. In Tab 1, click **Create Ride**. The start point is automatically set to your current coordinates, and the control panel will prompt you to set a destination.
4. Click anywhere on the map to set your **Destination**. A route polyline is automatically drawn.
5. Copy the generated **Invite Code** (e.g. `RIDE-4821`) from Tab 1's top-left corner.
6. In Tab 2, enter this code in the **Join Code** input field and click **Join Ride**.
7. Tab 2 will instantly enter the map. Both markers will now appear together.
8. Click **Start Sim** (or **Sim Route**) in Tab 2. Rohan's marker will begin moving along the route, dynamically updating speed/battery, and streaming coordinates. Tab 1 will see Rohan moving in real-time.
9. Click **Trigger SOS** in Tab 2. Tab 1 will instantly show a full-screen flashing red emergency alert overlay with coordinate locating triggers.
10. Tab 1 can click **Locate Rider** to immediately center the map on Rohan's exact distress coordinates.
