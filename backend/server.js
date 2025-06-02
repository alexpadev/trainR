const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;
const pool = require('./database/db');
require('dotenv').config();

app.use(cors());
app.use(express.json());

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

app.get('/', (req, res) => {
  res.send('TrainR backend server is running.');
});

const usersRouter = require('./routes/users');
app.use('/api/users', usersRouter);

const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);

const muscleGroupsRouter = require('./routes/muscleGroups');
app.use('/api/muscle-groups', muscleGroupsRouter);

const exercisesRouter = require('./routes/exercises');
app.use('/api/exercises', exercisesRouter);

const weeklyRoutinesRouter = require('./routes/weeklyRoutines');
app.use('/api/weekly-routines', weeklyRoutinesRouter);

const weeklyRoutineMuscleGroupsRouter = require('./routes/weeklyRoutineMuscleGroups');
app.use('/api/weekly-routine-muscle-groups', weeklyRoutineMuscleGroupsRouter);

const weeklyRoutineExercisesRouter = require('./routes/weeklyRoutineExercises');
app.use('/api/weekly-routine-exercises', weeklyRoutineExercisesRouter);

const dailyEntriesRouter = require('./routes/dailyEntries');
app.use('/api/daily-entries', dailyEntriesRouter);
