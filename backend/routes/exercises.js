const express = require('express');
const router = express.Router();
const pool = require('../database/db');


router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.id, e.nombre, e.descripcion, e.muscle_group_id, mg.nombre AS muscle_group_name
      FROM exercises e
      JOIN muscle_groups mg ON e.muscle_group_id = mg.id
      ORDER BY e.id;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error obteniendo exercises:', err);
    res.status(500).json({ error: 'Error al consultar ejercicios' });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `
      SELECT e.id, e.nombre, e.descripcion, e.muscle_group_id, mg.nombre AS muscle_group_name
      FROM exercises e
      JOIN muscle_groups mg ON e.muscle_group_id = mg.id
      WHERE e.id = $1;
      `,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ejercicio no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`Error obteniendo exercise ${id}:`, err);
    res.status(500).json({ error: 'Error al consultar ejercicio' });
  }
});

router.post('/', async (req, res) => {
  const { nombre, descripcion, muscle_group_id } = req.body;
  if (!nombre || !muscle_group_id) {
    return res
      .status(400)
      .json({ error: 'Faltan campos obligatorios: nombre, muscle_group_id' });
  }

  try {
    const insertQuery = `
      INSERT INTO exercises (nombre, descripcion, muscle_group_id)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const result = await pool.query(insertQuery, [nombre, descripcion || null, muscle_group_id]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creando exercise:', err);
    if (err.code === '23503') {
      return res.status(400).json({ error: 'El muscle_group_id indicado no existe' });
    }
    res.status(500).json({ error: 'Error al crear ejercicio' });
  }
});


router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, muscle_group_id } = req.body;

  if (!nombre && !descripcion && !muscle_group_id) {
    return res.status(400).json({
      error: 'Se requiere al menos uno de los campos: nombre, descripcion o muscle_group_id',
    });
  }

  const fields = [];
  const values = [];
  let idx = 1;
  if (nombre) {
    fields.push(`nombre = $${idx++}`);
    values.push(nombre);
  }
  if (descripcion !== undefined) {
    fields.push(`descripcion = $${idx++}`);
    values.push(descripcion);
  }
  if (muscle_group_id) {
    fields.push(`muscle_group_id = $${idx++}`);
    values.push(muscle_group_id);
  }
  values.push(id);

  const updateQuery = `
    UPDATE exercises
    SET ${fields.join(', ')}
    WHERE id = $${idx}
    RETURNING *;
  `;

  try {
    const result = await pool.query(updateQuery, values);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Ejercicio no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`Error actualizando exercise ${id}:`, err);
    if (err.code === '23503') {
      return res.status(400).json({ error: 'El muscle_group_id indicado no existe' });
    }
    res.status(500).json({ error: 'Error al actualizar ejercicio' });
  }
});


router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM exercises WHERE id = $1 RETURNING *;',
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Ejercicio no encontrado o ya eliminado' });
    }
    res.json({ message: 'Ejercicio eliminado correctamente', deleted: result.rows[0] });
  } catch (err) {
    console.error(`Error eliminando exercise ${id}:`, err);
    if (err.code === '23503') {
      return res
        .status(409)
        .json({ error: 'No se puede eliminar porque está usado en weekly_routine_exercises' });
    }
    res.status(500).json({ error: 'Error al eliminar ejercicio' });
  }
});

module.exports = router;
