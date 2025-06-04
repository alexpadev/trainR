const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/', authenticateToken, async (req, res) => {
  const user_id = req.user.userId;
  try {
    const result = await pool.query(
      `
      SELECT wr.id,
             wr.user_id,
             wr.day_of_week,
             wr.routine_type,
             wr.fecha_creacion,
             wr.fecha_actualizacion,
             u.username AS usuario_nombre
      FROM weekly_routines wr
      JOIN users u ON wr.user_id = u.id
      WHERE wr.user_id = $1
      ORDER BY wr.day_of_week;
      `,
      [user_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener las rutinas:', err);
    res.status(500).json({ error: 'Error al consultar las rutinas' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.userId;
  try {
    const result = await pool.query(
      `
      SELECT wr.id,
             wr.user_id,
             wr.day_of_week,
             wr.routine_type,
             wr.fecha_creacion,
             wr.fecha_actualizacion,
             u.username AS usuario_nombre
      FROM weekly_routines wr
      JOIN users u ON wr.user_id = u.id
      WHERE wr.id = $1 AND wr.user_id = $2;
      `,
      [id, user_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rutina no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`Error al obtener la rutina con id ${id}:`, err);
    res.status(500).json({ error: 'Error al consultar la rutina' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const user_id = req.user.userId;
  const {
    day_of_week,
    routine_type,
    muscle_group_ids,
    exercises,
    fecha,
    desayuno,
    comida,
    merienda,
    cena,
  } = req.body;

  if (!day_of_week || !routine_type || !fecha) {
    return res
      .status(400)
      .json({ error: 'Faltan campos obligatorios: día de la semana, tipo de rutina o fecha' });
  }
  if (!Array.isArray(muscle_group_ids) || muscle_group_ids.length === 0) {
    return res.status(400).json({ error: 'Debes seleccionar al menos un grupo muscular' });
  }
  if (!Array.isArray(exercises) || exercises.length === 0) {
    return res.status(400).json({ error: 'Debes seleccionar al menos un ejercicio con series y repeticiones' });
  }

  try {
    const insertWR = `
      INSERT INTO weekly_routines (user_id, day_of_week, routine_type)
      VALUES ($1, $2, $3)
      RETURNING id;
    `;
    const wrRes = await pool.query(insertWR, [user_id, day_of_week, routine_type]);
    const newWrId = wrRes.rows[0].id;

    for (const mgId of muscle_group_ids) {
      await pool.query(
        `
        INSERT INTO weekly_routine_muscle_groups
           (weekly_routine_id, muscle_group_id)
        VALUES ($1, $2);
        `,
        [newWrId, mgId]
      );
    }

    for (const ex of exercises) {
      await pool.query(
        `
        INSERT INTO weekly_routine_exercises
           (weekly_routine_id, exercise_id, series, repeticiones)
        VALUES ($1, $2, $3, $4);
        `,
        [newWrId, ex.exercise_id, ex.series, ex.repeticiones]
      );
    }

    const upsertDaily = `
      INSERT INTO daily_entries
        (user_id, fecha, weekly_routine_id, desayuno, comida, merienda, cena)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id, fecha)
      DO UPDATE
        SET weekly_routine_id     = EXCLUDED.weekly_routine_id,
            desayuno              = EXCLUDED.desayuno,
            comida                = EXCLUDED.comida,
            merienda              = EXCLUDED.merienda,
            cena                  = EXCLUDED.cena,
            fecha_actualizacion   = NOW();
    `;
    await pool.query(upsertDaily, [
      user_id,
      fecha,
      newWrId,
      desayuno || null,
      comida   || null,
      merienda || null,
      cena     || null,
    ]);

    return res.status(201).json({
      id: newWrId,
      message: 'Rutina creada correctamente',
    });
  } catch (err) {
    console.error('Error al crear la rutina:', err);
    if (err.code === '23505') {
      return res
        .status(409)
        .json({ error: 'Ya existe una rutina para este usuario y este día de la semana' });
    }
    if (err.code === '23503') {
      return res.status(400).json({ error: 'FK inválido (exercise_id o muscle_group_id)' });
    }
    return res.status(500).json({ error: 'Error al crear la rutina' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.userId;
  const { day_of_week, routine_type } = req.body;

  if (!day_of_week && !routine_type) {
    return res
      .status(400)
      .json({ error: 'Se requiere al menos uno de los campos: día de la semana o tipo de rutina' });
  }

  const existe = await pool.query(
    `SELECT 1 FROM weekly_routines WHERE id = $1 AND user_id = $2;`,
    [id, user_id]
  );
  if (existe.rows.length === 0) {
    return res.status(404).json({ error: 'Rutina no encontrada' });
  }

  const fields = [];
  const values = [];
  let idx = 1;
  if (day_of_week) {
    fields.push(`day_of_week = $${idx++}`);
    values.push(day_of_week);
  }
  if (routine_type) {
    fields.push(`routine_type = $${idx++}`);
    values.push(routine_type);
  }
  values.push(id);

  const updateQuery = `
    UPDATE weekly_routines
    SET ${fields.join(', ')}, fecha_actualizacion = NOW()
    WHERE id = $${idx}
    RETURNING *;
  `;

  try {
    const result = await pool.query(updateQuery, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`Error al actualizar la rutina con id ${id}:`, err);
    if (err.code === '23505') {
      return res
        .status(409)
        .json({ error: 'Ya existe una rutina para este usuario y día de la semana' });
    }
    res.status(500).json({ error: 'Error al actualizar la rutina' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.userId;

  const existe = await pool.query(
    `SELECT 1 FROM weekly_routines WHERE id = $1 AND user_id = $2;`,
    [id, user_id]
  );
  if (existe.rows.length === 0) {
    return res.status(404).json({ error: 'Rutina no encontrada o no autorizada' });
  }

  try {
    const result = await pool.query(
      'DELETE FROM weekly_routines WHERE id = $1 RETURNING *;',
      [id]
    );
    res.json({ message: 'Rutina eliminada correctamente', deleted: result.rows[0] });
  } catch (err) {
    console.error(`Error eliminando la rutina con id ${id}:`, err);
    res.status(500).json({ error: 'Error al eliminar la rutina' });
  }
});

module.exports = router;
