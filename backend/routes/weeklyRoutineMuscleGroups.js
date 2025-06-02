const express = require('express');
const router = express.Router();
const pool = require('../database/db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT wrmg.weekly_routine_id,
             wrmg.muscle_group_id,
             wr.day_of_week,
             wr.user_id,
             mg.nombre AS muscle_group_name
      FROM weekly_routine_muscle_groups wrmg
      JOIN weekly_routines wr ON wrmg.weekly_routine_id = wr.id
      JOIN muscle_groups mg ON wrmg.muscle_group_id = mg.id
      ORDER BY wrmg.weekly_routine_id, wrmg.muscle_group_id;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error obteniendo weekly_routine_muscle_groups:', err);
    res.status(500).json({ error: 'Error al consultar weekly_routine_muscle_groups' });
  }
});

router.get('/:weeklyRoutineId/:muscleGroupId', async (req, res) => {
  const { weeklyRoutineId, muscleGroupId } = req.params;
  try {
    const result = await pool.query(
      `
      SELECT * 
      FROM weekly_routine_muscle_groups
      WHERE weekly_routine_id = $1 AND muscle_group_id = $2;
      `,
      [weeklyRoutineId, muscleGroupId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Asociación no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(
      `Error obteniendo asociación WR-MG (${weeklyRoutineId}, ${muscleGroupId}):`,
      err
    );
    res.status(500).json({ error: 'Error al consultar la asociación' });
  }
});

router.post('/', async (req, res) => {
  const { weekly_routine_id, muscle_group_id } = req.body;
  if (!weekly_routine_id || !muscle_group_id) {
    return res
      .status(400)
      .json({ error: 'Faltan campos obligatorios: weekly_routine_id, muscle_group_id' });
  }

  try {
    const insertQuery = `
      INSERT INTO weekly_routine_muscle_groups (weekly_routine_id, muscle_group_id)
      VALUES ($1, $2)
      RETURNING *;
    `;
    const result = await pool.query(insertQuery, [weekly_routine_id, muscle_group_id]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(
      `Error creando asociación WR-MG (${weekly_routine_id}, ${muscle_group_id}):`,
      err
    );
    if (err.code === '23503') {
      return res
        .status(400)
        .json({ error: 'El weekly_routine_id o el muscle_group_id no existen' });
    }
    if (err.code === '23505') {
      return res
        .status(409)
        .json({ error: 'La asociación ya existe' });
    }
    res.status(500).json({ error: 'Error al crear asociación' });
  }
});

router.delete('/:weeklyRoutineId/:muscleGroupId', async (req, res) => {
  const { weeklyRoutineId, muscleGroupId } = req.params;
  try {
    const result = await pool.query(
      `
      DELETE FROM weekly_routine_muscle_groups
      WHERE weekly_routine_id = $1 AND muscle_group_id = $2
      RETURNING *;
      `,
      [weeklyRoutineId, muscleGroupId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Asociación no encontrada o ya eliminada' });
    }
    res.json({ message: 'Asociación eliminada', deleted: result.rows[0] });
  } catch (err) {
    console.error(
      `Error eliminando asociación WR-MG (${weeklyRoutineId}, ${muscleGroupId}):`,
      err
    );
    res.status(500).json({ error: 'Error al eliminar la asociación' });
  }
});

module.exports = router;
