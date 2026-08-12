const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const db = new Database(path.join(__dirname, 'habitgarden.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    frequency TEXT DEFAULT 'daily',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    UNIQUE(habit_id, date),
    FOREIGN KEY(habit_id) REFERENCES habits(id)
  );
`);

function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
if (userCount === 0) {
  const hash = bcrypt.hashSync('demo1234', 10);
  const userId = db
    .prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
    .run('demo', hash).lastInsertRowid;

  const insertHabit = db.prepare(
    'INSERT INTO habits (user_id, name, frequency) VALUES (?, ?, ?)'
  );
  const waterId = insertHabit.run(userId, 'Drink water', 'daily').lastInsertRowid;
  const walkId = insertHabit.run(userId, 'Morning walk', 'daily').lastInsertRowid;
  insertHabit.run(userId, 'Read 20 min', 'daily');

  const insertCheckin = db.prepare(
    'INSERT OR IGNORE INTO checkins (habit_id, date) VALUES (?, ?)'
  );

  // "Morning walk" is pre-seeded with a 6-day streak ending yesterday.
  // Checking it off today during a demo pushes it to a 7-day streak live.
  for (let i = 1; i <= 6; i++) insertCheckin.run(walkId, isoDaysAgo(i));

  // small starter streak on "Drink water"
  for (let i = 1; i <= 2; i++) insertCheckin.run(waterId, isoDaysAgo(i));

  console.log('Seeded demo user -> username: demo / password: demo1234');
}

module.exports = db;
