const express = require('express');
const router = express.Router();
const pool = require('../database/db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT wr.id,
             wr.user_id,
             wr.day_of_week,
             wr.routine_type,
             wr.fecha_creacion,
             wr.fecha_actualizacion,
             u.username AS usuario_nombre
      FROM weekly_routines wr
      JOIN users u ON wr.user_id = u.id
      ORDER BY wr.user_id, wr.day_of_week;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error obteniendo weekly_routines:', err);
    res.status(500).json({ error: 'Error al consultar weekly_routines' });
  }
});


router.get('/:id', async (req, res) => {
  const { id } = req.params;
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
      WHERE wr.id = $1;
      `,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Weekly routine no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`Error obteniendo weekly_routine ${id}:`, err);
    res.status(500).json({ error: 'Error al consultar weekly_routine' });
  }
});


router.post('/', async (req, res) => {
  const {
    user_id,
    day_of_week,
    routine_type,
    muscle_group_ids,
    exercises,
    fecha,
    comida
  } = req.body;

  if (
    !user_id ||
    !day_of_week ||
    !routine_type ||
    !Array.isArray(muscle_group_ids) ||
    muscle_group_ids.length === 0 ||
    !Array.isArray(exercises) ||
    exercises.length === 0
  ) {
    return res.status(400).json({
      error:
        'Faltan campos obligatorios: user_id, day_of_week, routine_type, muscle_group_ids (array), exercises (array)'
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertWR = `
      INSERT INTO weekly_routines (user_id, day_of_week, routine_type)
      VALUES ($1, $2, $3)
      RETURNING id;
    `;
    const wrResult = await client.query(insertWR, [
      user_id,
      day_of_week,
      routine_type
    ]);
    const weeklyRoutineId = wrResult.rows[0].id;

    const insertWrmgText = `
      INSERT INTO weekly_routine_muscle_groups (weekly_routine_id, muscle_group_id)
      VALUES ($1, $2);
    `;
    for (const mgId of muscle_group_ids) {
      await client.query(insertWrmgText, [weeklyRoutineId, mgId]);
    }

    const insertWreText = `
      INSERT INTO weekly_routine_exercises
        (weekly_routine_id, exercise_id, series, repeticiones)
      VALUES ($1, $2, $3, $4);
    `;
    for (const ex of exercises) {
      const { exercise_id, series, repeticiones } = ex;
      if (
        typeof exercise_id !== 'number' ||
        typeof series !== 'number' ||
        typeof repeticiones !== 'number'
      ) {
        throw new Error(
          'Cada elemento de "exercises" debe tener { exercise_id, series, repeticiones } numéricos'
        );
      }
      await client.query(insertWreText, [
        weeklyRoutineId,
        exercise_id,
        series,
        repeticiones
      ]);
    }

    if (fecha !== undefined) {
  const { desayuno, comida: almuerzo, merienda, cena } = req.body;

  const insertDaily = `
    INSERT INTO daily_entries
      (user_id, fecha, weekly_routine_id, desayuno, comida, merienda, cena)
    VALUES ($1, $2, $3, $4, $5, $6, $7);
  `;
  await client.query(insertDaily, [
    user_id,
    fecha,
    weeklyRoutineId,
    desayuno || null,
    almuerzo || null,
    merienda || null,
    cena || null,
  ]);
}

    await client.query('COMMIT');
    res.status(201).json({ message: 'Rutina semanal creada con éxito', id: weeklyRoutineId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creando weekly_routine completo:', err);

    if (err.code === '23505') {
      return res
        .status(409)
        .json({ error: 'Ya existe una rutina para este user_id y day_of_week' });
    }
    if (err.code === '23503') {
      return res
        .status(400)
        .json({ error: 'Algún ID referenciado no existe (user_id, muscle_group_id o exercise_id)' });
    }

    res.status(500).json({ error: 'Error interno al crear rutina semanal' });
  } finally {
    client.release();
  }
});


router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { day_of_week, routine_type } = req.body;

  if (!day_of_week && !routine_type) {
    return res
      .status(400)
      .json({ error: 'Se requiere al menos uno de los campos: day_of_week o routine_type' });
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
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Weekly routine no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`Error actualizando weekly_routine ${id}:`, err);
    if (err.code === '23505') {
      return res
        .status(409)
        .json({ error: 'Ya existe una rutina para este user_id y day_of_week' });
    }
    if (err.code === '23503') {
      return res.status(400).json({ error: 'Algún dato de FK no existe (user_id posiblemente)' });
    }
    res.status(500).json({ error: 'Error al actualizar weekly_routine' });
  }
});


router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM weekly_routines WHERE id = $1 RETURNING *;',
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Weekly routine no encontrada o ya eliminada' });
    }
    res.json({ message: 'Weekly routine eliminada correctamente', deleted: result.rows[0] });
  } catch (err) {
    console.error(`Error eliminando weekly_routine ${id}:`, err);
    res.status(500).json({ error: 'Error al eliminar weekly_routine' });
  }
});

module.exports = router;
