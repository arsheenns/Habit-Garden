Habit Garden
A habit tracker where checking off habits grows a virtual garden. Build streaks, watch plants grow from seed → sprout → bloom, and hit a 7-day streak to unlock a special glowing bloom.

Stack:-
Frontend: HTML / CSS / vanilla JS
Backend: Node.js + Express
Database: SQLite (via better-sqlite3)
Auth: username/password with bcrypt + express-session

Setup
npm install
npm start

Then open http://localhost:3000 in your browser.

Demo login
A demo account is seeded automatically on first run:
username: demo
password: demo1234

This account's "Morning walk" habit is pre-seeded with a 6-day streak, so checking it off during a live demo pushes it to day 7 and triggers the milestone bloom + confetti in real time — no need to wait a week.

Project structure
habit-garden/
  server.js          Express app entry point
  db.js               SQLite schema + demo seed data
  routes/
    auth.js           signup / login / logout / session check
    habits.js          habit CRUD, check-in, streak + growth-stage logic
  middleware/
    requireAuth.js     blocks API routes for logged-out requests
  public/
    index.html          Today + Garden screens
    style.css
    app.js               fetch calls + rendering + confetti burst

How the streak logic works
Each check-in is a row in checkins (habit_id, date). On every request, the current streak for a habit is recalculated from that history: walk backward day by day from the most recent check-in — if it's today or yesterday, keep counting consecutive days; a gap resets the streak to 0.

Growth stage is derived directly from streak length:
0 → seed
1–6 → sprout
7+ → bloom (and milestone: true, which triggers the frontend's confetti)

The session secret in server.js is a placeholder — fine for local/demo use, change it before deploying anywhere real.