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
        wre.id,
        wre.weekly_routine_id,
        wre.exercise_id,
        wre.series,
        wre.repeticiones,
        wre.fecha_creacion,
        e.nombre AS exercise_name,
        mg.nombre AS muscle_group_name
      FROM weekly_routine_exercises wre
      JOIN weekly_routines wr
        ON wre.weekly_routine_id = wr.id
      JOIN exercises e
        ON wre.exercise_id = e.id
      JOIN muscle_groups mg
        ON e.muscle_group_id = mg.id
      WHERE wr.user_id = $1
      ORDER BY wre.weekly_routine_id, wre.id;
      `,
      [user_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error obteniendo weekly_routine_exercises:', err);
    res.status(500).json({ error: 'Error al consultar weekly_routine_exercises' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.userId;
  try {
    const result = await pool.query(
      `
      SELECT
        wre.id,
        wre.weekly_routine_id,
        wre.exercise_id,
        wre.series,
        wre.repeticiones,
        wre.fecha_creacion,
        e.nombre AS exercise_name,
        mg.nombre AS muscle_group_name
      FROM weekly_routine_exercises wre
      JOIN weekly_routines wr
        ON wre.weekly_routine_id = wr.id
      JOIN exercises e
        ON wre.exercise_id = e.id
      JOIN muscle_groups mg
        ON e.muscle_group_id = mg.id
      WHERE wre.id = $1
        AND wr.user_id = $2;
      `,
      [id, user_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`Error obteniendo weekly_routine_exercise ${id}:`, err);
    res.status(500).json({ error: 'Error al consultar registro' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const user_id = req.user.userId;
  const { weekly_routine_id, exercise_id, series, repeticiones } = req.body;

  if (!weekly_routine_id || !exercise_id || !series || !repeticiones) {
    return res.status(400).json({
      error:
        'Faltan campos obligatorios: weekly_routine_id, exercise_id, series, repeticiones',
    });
  }

  try {
    const wrCheck = await pool.query(
      `SELECT 1 FROM weekly_routines WHERE id = $1 AND user_id = $2;`,
      [weekly_routine_id, user_id]
    );
    if (wrCheck.rows.length === 0) {
      return res
        .status(404)
        .json({ error: 'No se encontró weekly_routine o no pertenece al usuario' });
    }

    const insertQuery = `
      INSERT INTO weekly_routine_exercises
        (weekly_routine_id, exercise_id, series, repeticiones)
      VALUES ($1, $2, $3, $4)
      RETURNING id, weekly_routine_id, exercise_id, series, repeticiones;
    `;
    const result = await pool.query(insertQuery, [
      weekly_routine_id,
      exercise_id,
      series,
      repeticiones,
    ]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(
      `Error creando weekly_routine_exercise (WR=${weekly_routine_id}, EX=${exercise_id}):`,
      err
    );
    if (err.code === '23503') {
      return res
        .status(400)
        .json({ error: 'weekly_routine_id o exercise_id referencian un registro inexistente' });
    }
    if (err.code === '23505') {
      return res
        .status(409)
        .json({ error: 'Ya existe un registro con ese weekly_routine_id y exercise_id' });
    }
    res.status(500).json({ error: 'Error al crear registro' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.userId;
  const { series, repeticiones } = req.body;

  if (!series && !repeticiones) {
    return res
      .status(400)
      .json({ error: 'Se requiere al menos uno de los campos: series o repeticiones' });
  }

  try {
    const exists = await pool.query(
      `
      SELECT 1
      FROM weekly_routine_exercises wre
      JOIN weekly_routines wr
        ON wre.weekly_routine_id = wr.id
      WHERE wre.id = $1
        AND wr.user_id = $2;
      `,
      [id, user_id]
    );
    if (exists.rows.length === 0) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    const fields = [];
    const values = [];
    let idx = 1;
    if (series !== undefined) {
      fields.push(`series = $${idx++}`);
      values.push(series);
    }
    if (repeticiones !== undefined) {
      fields.push(`repeticiones = $${idx++}`);
      values.push(repeticiones);
    }
    values.push(id);

    const updateQuery = `
      UPDATE weekly_routine_exercises
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING *;
    `;

    const result = await pool.query(updateQuery, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`Error actualizando weekly_routine_exercise ${id}:`, err);
    res.status(500).json({ error: 'Error al actualizar registro' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.userId;

  try {
    const exists = await pool.query(
      `
      SELECT 1
      FROM weekly_routine_exercises wre
      JOIN weekly_routines wr
        ON wre.weekly_routine_id = wr.id
      WHERE wre.id = $1
        AND wr.user_id = $2;
      `,
      [id, user_id]
    );
    if (exists.rows.length === 0) {
      return res.status(404).json({ error: 'Registro no encontrado o no autorizado' });
    }

    const result = await pool.query(
      'DELETE FROM weekly_routine_exercises WHERE id = $1 RETURNING *;',
      [id]
    );
    res.json({ message: 'Registro eliminado correctamente', deleted: result.rows[0] });
  } catch (err) {
    console.error(`Error eliminando weekly_routine_exercise ${id}:`, err);
    res.status(500).json({ error: 'Error al eliminar registro' });
  }
});

module.exports = router;
