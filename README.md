# SPECTRA Coding Challenge

A complete full-stack coding challenge platform for college contests, built with React + Vite, Node.js + Express, MySQL, Socket.IO, Monaco editor, and Docker-based isolated execution.

## Features

- Host/admin login and contest dashboard
- Create contests with 3 levels (Beginner, Intermediate, Advanced)
- Add problems, hidden tests, marks, languages, time limits, memory limits
- Student join flow using participant ID, name, and contest code
- Real-time leaderboard and status updates via Socket.IO
- Automatic code judging for C, Java, and Python using isolated Docker containers
- Violation logging and configurable response policy
- CSV and Excel export support for final evaluation sheet
- Responsive dark interface with Monaco editor

## Project structure

- `frontend/` – Vite React application
- `backend/` – Express API, auth, judge, Socket.IO server
- `docker/` – container templates for C, Java, Python sandbox images
- `database/` – MySQL schema
- `docker-compose.yml` – local stack launcher

## Quick start

1. Install dependencies:
   `npm install --prefix frontend`
   `npm install --prefix backend`
2. Start MySQL and services:
   `docker compose up -d mysql`
   `npm --prefix backend run dev`
   `npm --prefix frontend run dev`
3. Open the frontend in the browser at: http://localhost:5173
4. Host login credentials are configured in the backend environment as `admin@spectra.local` / `Spectra@123`

## Host instructions

1. Log in via the Host panel.
2. Create a contest and set the contest code and duration.
3. Add the three required levels and problems.
4. Add hidden test cases and marks.
5. Start the contest.
6. Use the live dashboard to monitor participants and violations.
7. Export results using the CSV/Excel buttons.

## Student instructions

1. Open the student panel.
2. Enter participant ID, name, and contest code.
3. Select a language and solve the problems.
4. Use Run for sample test validation and Submit for hidden test evaluation.

## Local LAN deployment

To run this across a college LAN, deploy the backend and MySQL on a shared server and point the frontend to the backend URL through the host environment. For example:

- backend: http://192.168.1.10:5000
- frontend: http://192.168.1.10:5173

Set the same `VITE_API_URL` in the frontend and allow inbound access to port 5000 and 3306 on the server firewall.

## Docker judge notes

This implementation isolates code execution in containers with restricted networking, read-only root filesystem, memory usage limits, CPU caps, and enforced timeouts. The judge includes a fallback mock mode for environments where Docker is not available during local development.

## Vercel deployment

Deploy this as two Vercel projects:

1. Create a project with root directory `backend`. Vercel will use `api/index.js` as the serverless API entrypoint.
2. Create a second project with root directory `frontend`, framework preset `Vite`, build command `npm run build`, and output directory `dist`.
3. In the frontend project, set `VITE_API_URL` to the deployed backend URL, for example `https://spectra-api.vercel.app`.
4. In the backend project, set `JWT_SECRET` and the external MySQL variables `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`.

The backend uses in-memory storage when MySQL variables are missing, so data will not persist across serverless invocations in that mode. Socket.IO live updates and Docker-based code judging require a persistent/container-capable backend service; the Vercel deployment supports the HTTP API, but those features should be hosted separately if they are required in production. When using such a service, set `VITE_SOCKET_URL` to its public URL in the frontend project.
