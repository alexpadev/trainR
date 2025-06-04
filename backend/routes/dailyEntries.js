const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/', authenticateToken, async (req, res) => {
  const user_id = req.user.userId;
  try {
    const result = await pool.query(
      `
      SELECT de.id,
             de.user_id,
             u.username AS usuario_nombre,
             de.fecha,
             de.weekly_routine_id,
             wr.routine_type,
             de.desayuno,
             de.comida,
             de.merienda,
             de.cena,
             de.completed,
             de.fecha_creacion,
             de.fecha_actualizacion
      FROM daily_entries de
      LEFT JOIN users u ON de.user_id = u.id
      LEFT JOIN weekly_routines wr ON de.weekly_routine_id = wr.id
      WHERE de.user_id = $1
      ORDER BY de.fecha DESC;
      `,
      [user_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar daily_entries' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.userId;
  try {
    const result = await pool.query(
      `
      SELECT de.id,
             de.user_id,
             u.username AS usuario_nombre,
             de.fecha,
             de.weekly_routine_id,
             wr.routine_type,
             de.desayuno,
             de.comida,
             de.merienda,
             de.cena,
             de.completed,
             de.fecha_creacion,
             de.fecha_actualizacion
      FROM daily_entries de
      LEFT JOIN users u ON de.user_id = u.id
      LEFT JOIN weekly_routines wr ON de.weekly_routine_id = wr.id
      WHERE de.id = $1 AND de.user_id = $2;
      `,
      [id, user_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entrada diaria no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`Error obteniendo daily_entry ${id}:`, err);
    res.status(500).json({ error: 'Error al consultar daily_entry' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const user_id = req.user.userId;
  const { fecha, weekly_routine_id, desayuno, comida, merienda, cena } = req.body;
  if (!fecha) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: fecha' });
  }

  try {
    const insertText = `
      INSERT INTO daily_entries
        (user_id, fecha, weekly_routine_id, desayuno, comida, merienda, cena)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const result = await pool.query(insertText, [
      user_id,
      fecha,
      weekly_routine_id || null,
      desayuno || null,
      comida   || null,
      merienda || null,
      cena     || null,
    ]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creando daily_entry:', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe una entrada para esa fecha' });
    }
    res.status(500).json({ error: 'Error al crear daily_entry' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.userId;
  const { desayuno, comida, merienda, cena, completed } = req.body;

  const existe = await pool.query(
    `SELECT 1 FROM daily_entries WHERE id = $1 AND user_id = $2;`,
    [id, user_id]
  );
  if (existe.rows.length === 0) {
    return res.status(404).json({ error: 'Entrada diaria no encontrada' });
  }

  if (
    desayuno === undefined &&
    comida === undefined &&
    merienda === undefined &&
    cena === undefined &&
    completed === undefined
  ) {
    return res.status(400).json({
      error: 'Se requiere al menos uno de los campos: desayuno, comida, merienda, cena, completed',
    });
  }

  const fields = [];
  const values = [];
  let idx = 1;

  if (desayuno !== undefined) {
    fields.push(`desayuno = $${idx++}`);
    values.push(desayuno);
  }
  if (comida !== undefined) {
    fields.push(`comida = $${idx++}`);
    values.push(comida);
  }
  if (merienda !== undefined) {
    fields.push(`merienda = $${idx++}`);
    values.push(merienda);
  }
  if (cena !== undefined) {
    fields.push(`cena = $${idx++}`);
    values.push(cena);
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
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`Error actualizando la entrada diaria ${id}:`, err);
    res.status(500).json({ error: 'Error al actualizar la entrada diaria' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.userId;

  const existe = await pool.query(
    `SELECT 1 FROM daily_entries WHERE id = $1 AND user_id = $2;`,
    [id, user_id]
  );
  if (existe.rows.length === 0) {
    return res.status(404).json({ error: 'Entrada diaria no encontrada o no autorizada' });
  }

  try {
    const result = await pool.query(
      'DELETE FROM daily_entries WHERE id = $1 RETURNING *;',
      [id]
    );
    res.json({ message: 'Entrada diaria eliminada correctamente', deleted: result.rows[0] });
  } catch (err) {
    console.error(`Error eliminando daily_entry ${id}:`, err);
    res.status(500).json({ error: 'Error al eliminar daily_entry' });
  }
});

module.exports = router;
