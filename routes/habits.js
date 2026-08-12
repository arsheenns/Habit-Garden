const express = require('express');
const db = require('../db');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();
router.use(requireAuth);

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Current streak = consecutive days checked in, ending today or yesterday.
// A gap of more than one day (missed a day) resets it to 0.
function computeStreak(habitId) {
  const rows = db
    .prepare('SELECT date FROM checkins WHERE habit_id = ? ORDER BY date DESC')
    .all(habitId);
  if (rows.length === 0) return 0;

  const dates = rows.map((r) => r.date);
  const today = todayStr();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  if (dates[0] !== today && dates[0] !== yesterdayStr) return 0;

  let streak = 1;
  const cursor = new Date(dates[0]);
  for (let i = 1; i < dates.length; i++) {
    cursor.setDate(cursor.getDate() - 1);
    const expected = cursor.toISOString().slice(0, 10);
    if (dates[i] === expected) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function growthStage(streak) {
  if (streak <= 0) return 'seed';
  if (streak < 7) return 'sprout';
  return 'bloom';
}

function serializeHabit(habit) {
  const streak = computeStreak(habit.id);
  const checkedToday = !!db
    .prepare('SELECT 1 FROM checkins WHERE habit_id = ? AND date = ?')
    .get(habit.id, todayStr());
  return {
    id: habit.id,
    name: habit.name,
    frequency: habit.frequency,
    streak,
    stage: growthStage(streak),
    milestone: streak >= 7,
    checkedToday,
  };
}

function getOwnedHabit(habitId, userId) {
  return db
    .prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?')
    .get(habitId, userId);
}

router.get('/', (req, res) => {
  const habits = db
    .prepare('SELECT * FROM habits WHERE user_id = ? ORDER BY created_at ASC')
    .all(req.session.userId);
  res.json(habits.map(serializeHabit));
});

router.post('/', (req, res) => {
  const { name, frequency } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Habit name is required' });
  }

  const habitName = name.trim();

  const existing = db
    .prepare(
      'SELECT id FROM habits WHERE user_id = ? AND LOWER(name) = LOWER(?)'
    )
    .get(req.session.userId, habitName);

  if (existing) {
    return res.status(409).json({
      error: 'You already have this habit.'
    });
  }

  const info = db
    .prepare(
      'INSERT INTO habits (user_id, name, frequency) VALUES (?, ?, ?)'
    )
    .run(req.session.userId, habitName, frequency || 'daily');

  const habit = db
    .prepare('SELECT * FROM habits WHERE id = ?')
    .get(info.lastInsertRowid);

  res.status(201).json(serializeHabit(habit));
});

router.post('/:id/checkin', (req, res) => {
  const habit = getOwnedHabit(req.params.id, req.session.userId);
  if (!habit) return res.status(404).json({ error: 'Habit not found' });

  db.prepare('INSERT OR IGNORE INTO checkins (habit_id, date) VALUES (?, ?)').run(
    habit.id,
    todayStr()
  );
  res.json(serializeHabit(habit));
});

router.delete('/:id/checkin', (req, res) => {
  const habit = getOwnedHabit(req.params.id, req.session.userId);
  if (!habit) return res.status(404).json({ error: 'Habit not found' });

  db.prepare('DELETE FROM checkins WHERE habit_id = ? AND date = ?').run(
    habit.id,
    todayStr()
  );
  res.json(serializeHabit(habit));
});

module.exports = router;
