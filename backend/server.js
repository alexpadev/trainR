const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;
const pool = require('./database/db');
require('dotenv').config();

// app.use(cors({
//   origin: 'https://trainr-ru6t.onrender.com'
// }));

app.use(cors());

app.use(express.json());

const { authenticateToken } = require('./middleware/authMiddleware');


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

app.get('/', (req, res) => {
  res.send('TrainR backend server is running.');
});

const usersRouter = require('./routes/users');
app.use('/api/users', usersRouter, authenticateToken);

const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);

const muscleGroupsRouter = require('./routes/muscleGroups');
app.use('/api/muscle-groups', muscleGroupsRouter, authenticateToken);

const exercisesRouter = require('./routes/exercises');
app.use('/api/exercises', exercisesRouter, authenticateToken);

const weeklyRoutinesRouter = require('./routes/weeklyRoutines');
app.use('/api/weekly-routines', weeklyRoutinesRouter, authenticateToken);

const weeklyRoutineMuscleGroupsRouter = require('./routes/weeklyRoutineMuscleGroups');
app.use('/api/weekly-routine-muscle-groups', weeklyRoutineMuscleGroupsRouter, authenticateToken);

const weeklyRoutineExercisesRouter = require('./routes/weeklyRoutineExercises');
app.use('/api/weekly-routine-exercises', weeklyRoutineExercisesRouter, authenticateToken);

const dailyEntriesRouter = require('./routes/dailyEntries');
app.use('/api/daily-entries', dailyEntriesRouter, authenticateToken);
