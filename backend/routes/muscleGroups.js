const express = require('express');
const router = express.Router();
const pool = require('../database/db');


router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM muscle_groups ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('Error obteniendo muscle_groups:', err);
    res.status(500).json({ error: 'Error al consultar muscle_groups' });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM muscle_groups WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Muscle group no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`Error obteniendo muscle_group ${id}:`, err);
    res.status(500).json({ error: 'Error al consultar muscle_group' });
  }
});

router.post('/', async (req, res) => {
  const { nombre, tipo } = req.body;
  if (!nombre || !tipo) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: nombre, tipo' });
  }

  try {
    const insertQuery = `
      INSERT INTO muscle_groups (nombre, tipo)
      VALUES ($1, $2)
      RETURNING *;
    `;
    const result = await pool.query(insertQuery, [nombre, tipo]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creando muscle_group:', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un muscle_group con ese nombre' });
    }
    res.status(500).json({ error: 'Error al crear muscle_group' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, tipo } = req.body;

  if (!nombre && !tipo) {
    return res.status(400).json({ error: 'Se requiere al menos un campo: nombre o tipo' });
  }

  const fields = [];
  const values = [];
  let idx = 1;
  if (nombre) {
    fields.push(`nombre = $${idx++}`);
    values.push(nombre);
  }
  if (tipo) {
    fields.push(`tipo = $${idx++}`);
    values.push(tipo);
  }
  values.push(id); 

  const updateQuery = `
    UPDATE muscle_groups
    SET ${fields.join(', ')}, fecha_creacion = fecha_creacion  -- para no modificar created_at
    WHERE id = $${idx}
    RETURNING *;
  `;

  try {
    const result = await pool.query(updateQuery, values);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Muscle group no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`Error actualizando muscle_group ${id}:`, err);
    if (err.code === '23505') { 
      return res.status(409).json({ error: 'Ya existe un muscle_group con ese nombre' });
    }
    res.status(500).json({ error: 'Error al actualizar muscle_group' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM muscle_groups WHERE id = $1 RETURNING *;',
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Muscle group no encontrado o ya eliminado' });
    }
    res.json({ message: 'Muscle group eliminado correctamente', deleted: result.rows[0] });
  } catch (err) {
    console.error(`Error eliminando muscle_group ${id}:`, err);
    if (err.code === '23503') {
      return res
        .status(409)
        .json({ error: 'No se puede eliminar porque existen ejercicios relacionados' });
    }
    res.status(500).json({ error: 'Error al eliminar muscle_group' });
  }
});

module.exports = router;
