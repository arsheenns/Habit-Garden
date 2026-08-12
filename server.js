const express = require('express');
const session = require('express-session');
const path = require('path');

const authRoutes = require('./routes/auth');
const habitsRoutes = require('./routes/habits');

const app = express();

app.use(express.json());
app.use(
  session({
    secret: 'habit-garden-dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }, // 7 days
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/habits', habitsRoutes);

app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Habit Garden running at http://localhost:${PORT}`);
});
