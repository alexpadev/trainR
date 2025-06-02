const express = require('express');
const router = express.Router();
const pool = require('../database/db');


router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT de.id,
             de.user_id,
             u.username AS usuario_nombre,
             de.fecha,
             de.weekly_routine_id,
             wr.day_of_week,
             wr.routine_type,
             de.comida,
             de.completed,
             de.fecha_creacion,
             de.fecha_actualizacion
      FROM daily_entries de
      JOIN users u ON de.user_id = u.id
      LEFT JOIN weekly_routines wr ON de.weekly_routine_id = wr.id
      ORDER BY de.user_id, de.fecha;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error obteniendo daily_entries:', err);
    res.status(500).json({ error: 'Error al consultar daily_entries' });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `
      SELECT de.id,
             de.user_id,
             u.username AS usuario_nombre,
             de.fecha,
             de.weekly_routine_id,
             wr.day_of_week,
             wr.routine_type,
             de.comida,
             de.completed,
             de.fecha_creacion,
             de.fecha_actualizacion
      FROM daily_entries de
      JOIN users u ON de.user_id = u.id
      LEFT JOIN weekly_routines wr ON de.weekly_routine_id = wr.id
      WHERE de.id = $1;
      `,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Daily entry no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`Error obteniendo daily_entry ${id}:`, err);
    res.status(500).json({ error: 'Error al consultar daily_entry' });
  }
});


router.post('/', async (req, res) => {
  const { user_id, fecha, weekly_routine_id, comida } = req.body;
  if (!user_id || !fecha) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: user_id, fecha' });
  }

  try {
    const insertQuery = `
      INSERT INTO daily_entries (user_id, fecha, weekly_routine_id, comida)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const result = await pool.query(insertQuery, [
      user_id,
      fecha,
      weekly_routine_id || null,
      comida || null,
    ]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creando daily_entry:', err);
    if (err.code === '23505') {
      return res
        .status(409)
        .json({ error: 'Ya existe un daily_entry para este user_id y fecha' });
    }
    if (err.code === '23503') {
      return res
        .status(400)
        .json({ error: 'El user_id o weekly_routine_id referencian a un registro inexistente' });
    }
    res.status(500).json({ error: 'Error al crear daily_entry' });
  }
});


router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { weekly_routine_id, comida, completed } = req.body;

  if (
    weekly_routine_id === undefined &&
    comida === undefined &&
    completed === undefined
  ) {
    return res.status(400).json({
      error: 'Se requiere al menos uno de los campos: weekly_routine_id, comida o completed',
    });
  }

  const fields = [];
  const values = [];
  let idx = 1;
  if (weekly_routine_id !== undefined) {
    fields.push(`weekly_routine_id = $${idx++}`);
    values.push(weekly_routine_id);
  }
  if (comida !== undefined) {
    fields.push(`comida = $${idx++}`);
    values.push(comida);
  }
  if (completed !== undefined) {
    fields.push(`completed = $${idx++}`);
    values.push(completed);
  }
  fields.push(`fecha_actualizacion = NOW()`);
  values.push(id);

  const updateQuery = `
    UPDATE daily_entries
    SET ${fields.join(', ')}
    WHERE id = $${idx}
    RETURNING *;
  `;

  try {
    const result = await pool.query(updateQuery, values);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Daily entry no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`Error actualizando daily_entry ${id}:`, err);
    if (err.code === '23503') {
      return res
        .status(400)
        .json({ error: 'El weekly_routine_id referenciado no existe' });
    }
    res.status(500).json({ error: 'Error al actualizar daily_entry' });
  }
});


router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM daily_entries WHERE id = $1 RETURNING *;',
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Daily entry no encontrado o ya eliminado' });
    }
    res.json({ message: 'Daily entry eliminado correctamente', deleted: result.rows[0] });
  } catch (err) {
    console.error(`Error eliminando daily_entry ${id}:`, err);
    res.status(500).json({ error: 'Error al eliminar daily_entry' });
  }
});

module.exports = router;
