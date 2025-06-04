const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/', authenticateToken, async (req, res) => {
  const user_id = req.user.userId;
  try {
    const result = await pool.query(
      `
      SELECT
        wrmg.weekly_routine_id,
        wrmg.muscle_group_id,
        wr.day_of_week,
        mg.nombre AS muscle_group_name
      FROM weekly_routine_muscle_groups wrmg
      JOIN weekly_routines wr
        ON wrmg.weekly_routine_id = wr.id
      JOIN muscle_groups mg
        ON wrmg.muscle_group_id = mg.id
      WHERE wr.user_id = $1
      ORDER BY wrmg.weekly_routine_id, wrmg.muscle_group_id;
      `,
      [user_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener los grupos musculares:', err);
    res.status(500).json({ error: 'Error al consultar los grupos musculares' });
  }
});

router.get('/:weeklyRoutineId/:muscleGroupId', authenticateToken, async (req, res) => {
  const { weeklyRoutineId, muscleGroupId } = req.params;
  const user_id = req.user.userId;
  try {
    const result = await pool.query(
      `
      SELECT wrmg.weekly_routine_id,
             wrmg.muscle_group_id
      FROM weekly_routine_muscle_groups wrmg
      JOIN weekly_routines wr
        ON wrmg.weekly_routine_id = wr.id
      WHERE wrmg.weekly_routine_id = $1
        AND wrmg.muscle_group_id = $2
        AND wr.user_id = $3;
      `,
      [weeklyRoutineId, muscleGroupId, user_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Asociación no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(
      `Error obteniendo la asociación de la rutina y los grupos musculares (${weeklyRoutineId}, ${muscleGroupId}):`,
      err
    );
    res.status(500).json({ error: 'Error al consultar la asociación' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const user_id = req.user.userId;
  const { weekly_routine_id, muscle_group_id } = req.body;

  if (!weekly_routine_id || !muscle_group_id) {
    return res
      .status(400)
      .json({ error: 'Faltan campos obligatorios: weekly_routine_id, muscle_group_id' });
  }

  try {
    const wrCheck = await pool.query(
      `SELECT 1 FROM weekly_routines WHERE id = $1 AND user_id = $2;`,
      [weekly_routine_id, user_id]
    );
    if (wrCheck.rows.length === 0) {
      return res
        .status(404)
        .json({ error: 'Rutina no encontrada' });
    }

    const insertQuery = `
      INSERT INTO weekly_routine_muscle_groups
        (weekly_routine_id, muscle_group_id)
      VALUES ($1, $2)
      RETURNING weekly_routine_id, muscle_group_id;
    `;
    const result = await pool.query(insertQuery, [weekly_routine_id, muscle_group_id]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(
      `Error creando la asociación de la rutina y los grupos musculares (${weekly_routine_id}, ${muscle_group_id}):`,
      err
    );
    if (err.code === '23503') {
      return res
        .status(400)
        .json({ error: 'El rutina o los grupos musculares no existen' });
    }
    if (err.code === '23505') {
      return res.status(409).json({ error: 'La asociación ya existe' });
    }
    res.status(500).json({ error: 'Error al crear asociación' });
  }
});

router.delete('/:weeklyRoutineId/:muscleGroupId', authenticateToken, async (req, res) => {
  const { weeklyRoutineId, muscleGroupId } = req.params;
  const user_id = req.user.userId;

  try {
    const check = await pool.query(
      `
      SELECT 1
      FROM weekly_routine_muscle_groups wrmg
      JOIN weekly_routines wr
        ON wrmg.weekly_routine_id = wr.id
      WHERE wrmg.weekly_routine_id = $1
        AND wrmg.muscle_group_id = $2
        AND wr.user_id = $3;
      `,
      [weeklyRoutineId, muscleGroupId, user_id]
    );
    if (check.rows.length === 0) {
      return res
        .status(404)
        .json({ error: 'Asociación no encontrada o no pertenece al usuario' });
    }

    const result = await pool.query(
      `
      DELETE FROM weekly_routine_muscle_groups
      WHERE weekly_routine_id = $1
        AND muscle_group_id = $2
      RETURNING weekly_routine_id, muscle_group_id;
      `,
      [weeklyRoutineId, muscleGroupId]
    );
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
