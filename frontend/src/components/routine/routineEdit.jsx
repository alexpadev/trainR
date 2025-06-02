// src/components/routine/routineEdit.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const RoutineEdit = () => {
  const { routineId, date } = useParams();
  const navigate = useNavigate();

  // Estados de carga y error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Datos maestros: grupos musculares y ejercicios
  const [muscleGroups, setMuscleGroups] = useState([]);
  const [allExercises, setAllExercises] = useState([]);

  // Estados de la plantilla semanal
  const [routineType, setRoutineType] = useState('upper');
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState([]);
  const [selectedExercises, setSelectedExercises] = useState([]); 
  // Cada elemento: { exercise_id, series, repeticiones }

  // Estados de dailyEntry (comidas)
  const [dailyEntryId, setDailyEntryId] = useState(null);
  const [desayuno, setDesayuno] = useState('');
  const [almuerzo, setAlmuerzo] = useState('');
  const [merienda, setMerienda] = useState('');
  const [cena, setCena] = useState('');

  // Cargar datos al montar: grupos, ejercicios, plantilla, asociaciones y dailyEntry  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // 1) Traer grupos musculares y ejercicios
        const [mgRes, exRes] = await Promise.all([
          fetch('http://localhost:3000/api/muscle-groups'),
          fetch('http://localhost:3000/api/exercises'),
        ]);
        if (!mgRes.ok || !exRes.ok) {
          throw new Error('Error cargando datos maestros');
        }
        const [mgData, exData] = await Promise.all([mgRes.json(), exRes.json()]);
        setMuscleGroups(mgData);
        setAllExercises(exData);

        // 2) Traer la plantilla semanal para setRoutineType
        const wrRes = await fetch(`http://localhost:3000/api/weekly-routines/${routineId}`);
        if (!wrRes.ok) {
          throw new Error('Rutina no encontrada');
        }
        const wrData = await wrRes.json();
        setRoutineType(wrData.routine_type);

        // 3) Traer asociaciones de grupos musculares
        const wrmgRes = await fetch('http://localhost:3000/api/weekly-routine-muscle-groups');
        if (!wrmgRes.ok) {
          throw new Error('Error cargando asociaciones de grupos musculares');
        }
        const wrmgData = await wrmgRes.json();
        const myMgLinks = wrmgData
          .filter((link) => Number(link.weekly_routine_id) === Number(routineId))
          .map((link) => Number(link.muscle_group_id));
        setSelectedMuscleGroups(myMgLinks);

        // 4) Traer asociaciones de ejercicios
        const wreRes = await fetch('http://localhost:3000/api/weekly-routine-exercises');
        if (!wreRes.ok) {
          throw new Error('Error cargando asociaciones de ejercicios');
        }
        const wreData = await wreRes.json();
        const myExLinks = wreData
          .filter((link) => Number(link.weekly_routine_id) === Number(routineId))
          .map((link) => ({
            exercise_id: Number(link.exercise_id),
            series: Number(link.series),
            repeticiones: Number(link.repeticiones),
          }));
        setSelectedExercises(myExLinks);

        // 5) Traer daily_entries para esa fecha y prellenar comidas
        const deRes = await fetch('http://localhost:3000/api/daily-entries');
        if (!deRes.ok) {
          throw new Error('Error cargando entradas diarias');
        }
        const deData = await deRes.json();
        const match = deData.find((d) => {
          const dDate = new Date(d.fecha);
          const dKey = `${dDate.getFullYear()}-${String(dDate.getMonth() + 1).padStart(
            2,
            '0'
          )}-${String(dDate.getDate()).padStart(2, '0')}`;
          return dKey === date;
        });
        if (match) {
          setDailyEntryId(Number(match.id));
          setDesayuno(match.desayuno || '');
          setAlmuerzo(match.comida || '');
          setMerienda(match.merienda || '');
          setCena(match.cena || '');
        }

        setLoading(false);
      } catch (err) {
        console.error(err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, [routineId, date]);

  // Filtrar grupos musculares según el tipo seleccionado
  const filteredMuscleGroups =
    routineType === 'fullbody'
      ? muscleGroups
      : muscleGroups.filter((mg) => mg.tipo === routineType);

  // Filtrar ejercicios según grupos musculares seleccionados
  const filteredExercises = allExercises.filter((ex) =>
    selectedMuscleGroups.includes(Number(ex.muscle_group_id))
  );

  // Manejar selección/desselección de grupo muscular
  const toggleMuscleGroup = (mgId) => {
    if (selectedMuscleGroups.includes(mgId)) {
      setSelectedMuscleGroups((prev) => prev.filter((id) => id !== mgId));
      // También retiramos de selectedExercises aquellos ejercicios que ya no correspondan
      setSelectedExercises((prev) =>
        prev.filter((e) => {
          const ex = allExercises.find((ae) => Number(ae.id) === e.exercise_id);
          return ex && Number(ex.muscle_group_id) !== mgId;
        })
      );
    } else {
      setSelectedMuscleGroups((prev) => [...prev, mgId]);
    }
  };

  // Manejar selección/desselección de ejercicio
  const toggleExercise = (exercise) => {
    const exId = Number(exercise.id);
    const exists = selectedExercises.find((e) => e.exercise_id === exId);
    if (exists) {
      setSelectedExercises((prev) => prev.filter((e) => e.exercise_id !== exId));
    } else {
      setSelectedExercises((prev) => [
        ...prev,
        { exercise_id: exId, series: 1, repeticiones: 10 },
      ]);
    }
  };

  // Actualizar series o repeticiones de un ejercicio ya seleccionado
  const updateExerciseDetail = (exerciseId, field, value) => {
    setSelectedExercises((prev) =>
      prev.map((e) =>
        e.exercise_id === exerciseId ? { ...e, [field]: Number(value) } : e
      )
    );
  };

  // Enviar formulario: actualizar weekly_routine, reemplazar asociaciones y daily_entry
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (selectedMuscleGroups.length === 0) {
      setError('Debes seleccionar al menos un grupo muscular');
      return;
    }
    if (selectedExercises.length === 0) {
      setError('Debes seleccionar al menos un ejercicio');
      return;
    }

    try {
      // 1) Actualizar solo el tipo de rutina
      const updateWR = await fetch(`http://localhost:3000/api/weekly-routines/${routineId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routine_type: routineType }),
      });
      if (!updateWR.ok) {
        const data = await updateWR.json();
        throw new Error(data.error || 'Error actualizando rutina');
      }

      // 2) Reemplazar asociaciones de grupos musculares
      const wrmgRes = await fetch('http://localhost:3000/api/weekly-routine-muscle-groups');
      const wrmgData = await wrmgRes.json();
      const prevMgLinks = wrmgData.filter(
        (link) => Number(link.weekly_routine_id) === Number(routineId)
      );
      // Eliminar todos
      for (const link of prevMgLinks) {
        await fetch(
          `http://localhost:3000/api/weekly-routine-muscle-groups/${routineId}/${link.muscle_group_id}`,
          { method: 'DELETE' }
        );
      }
      // Insertar los nuevos
      for (const mgId of selectedMuscleGroups) {
        await fetch('http://localhost:3000/api/weekly-routine-muscle-groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weekly_routine_id: Number(routineId),
            muscle_group_id: mgId,
          }),
        });
      }

      // 3) Reemplazar asociaciones de ejercicios
      const wreRes = await fetch('http://localhost:3000/api/weekly-routine-exercises');
      const wreData = await wreRes.json();
      const prevExLinks = wreData.filter(
        (link) => Number(link.weekly_routine_id) === Number(routineId)
      );
      // Eliminar todos
      for (const link of prevExLinks) {
        await fetch(`http://localhost:3000/api/weekly-routine-exercises/${link.id}`, {
          method: 'DELETE',
        });
      }
      // Insertar los nuevos
      for (const ex of selectedExercises) {
        await fetch('http://localhost:3000/api/weekly-routine-exercises', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weekly_routine_id: Number(routineId),
            exercise_id: ex.exercise_id,
            series: ex.series,
            repeticiones: ex.repeticiones,
          }),
        });
      }

      // 4) Actualizar o crear daily_entry (solo las comidas)
      if (dailyEntryId) {
        await fetch(`http://localhost:3000/api/daily-entries/${dailyEntryId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            desayuno,
            comida: almuerzo,
            merienda,
            cena,
          }),
        });
      } else {
        const user_id = Number(localStorage.getItem('user_id')) || 1;
        await fetch('http://localhost:3000/api/daily-entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id,
            fecha: date,
            weekly_routine_id: Number(routineId),
            desayuno,
            comida: almuerzo,
            merienda,
            cena,
          }),
        });
      }

      navigate('/');
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 min-h-screen text-white text-center p-10">
        <h2 className="text-2xl mb-4">Cargando datos de la rutina...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 min-h-screen text-white text-center p-10">
        <h2 className="text-2xl mb-4">Error: {error}</h2>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 min-h-screen text-white p-10 flex flex-col items-center">
      {/* Título con día de la semana */}
      <h2 className="text-2xl font-semibold mb-6 text-center text-gray-100">
        {`Editar rutina (${new Date(date).toLocaleDateString('es-ES', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }).replace(/^./, (str) => str.toUpperCase())})`}
      </h2>

      <form
        onSubmit={handleSubmit}
        className="bg-gray-700 p-6 rounded-lg w-full max-w-2xl space-y-6"
      >
        {/* 1) Tipo de rutina */}
        <div>
          <label htmlFor="routineType" className="block mb-2 font-medium">
            Tipo de rutina
          </label>
          <select
            id="routineType"
            value={routineType}
            onChange={(e) => {
              setRoutineType(e.target.value);
              setSelectedMuscleGroups([]);
              setSelectedExercises([]);
            }}
            className="w-full bg-gray-600 text-white p-2 rounded"
          >
            <option value="upper">Tren superior</option>
            <option value="lower">Tren inferior</option>
            <option value="fullbody">Full body</option>
          </select>
        </div>

        {/* 2) Multi-selector de grupos musculares */}
        <div>
          <p className="mb-2 font-medium">
            Grupos musculares (
            {routineType === 'upper'
              ? 'Superior'
              : routineType === 'lower'
              ? 'Inferior'
              : 'Full body'}
            )
          </p>
          <div className="grid grid-cols-3 gap-2">
            {filteredMuscleGroups.map((mg) => (
              <label key={mg.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedMuscleGroups.includes(Number(mg.id))}
                  onChange={() => toggleMuscleGroup(Number(mg.id))}
                  className="h-4 w-4 text-green-500"
                />
                <span className="capitalize">{mg.nombre}</span>
              </label>
            ))}
            {filteredMuscleGroups.length === 0 && (
              <p className="italic text-gray-300 col-span-3">
                No hay grupos para este tipo
              </p>
            )}
          </div>
        </div>

        {/* 3) Listado de ejercicios */}
        <div>
          <p className="mb-2 font-medium">Ejercicios</p>
          {filteredExercises.length === 0 ? (
            <p className="italic text-gray-300">
              Selecciona primero un grupo muscular para ver ejercicios.
            </p>
          ) : (
            <div className="space-y-4">
              {filteredExercises.map((ex) => {
                const exId = Number(ex.id);
                const isChecked = selectedExercises.some((e) => e.exercise_id === exId);
                const detail = selectedExercises.find((e) => e.exercise_id === exId);

                // Obtener tipo de rutina del grupo muscular de este ejercicio
                const mg = muscleGroups.find(
                  (m) => Number(m.id) === Number(ex.muscle_group_id)
                );
                const tipoTexto =
                  mg && mg.tipo === 'upper'
                    ? 'Tren superior'
                    : mg && mg.tipo === 'lower'
                    ? 'Tren inferior'
                    : '';

                return (
                  <div
                    key={exId}
                    className="bg-gray-600 p-3 rounded flex flex-col md:flex-row md:items-center md:justify-between"
                  >
                    {/* Nombre del ejercicio + tipo de rutina */}
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleExercise(ex)}
                        className="h-4 w-4 text-green-500"
                      />
                      <span className="font-semibold">{ex.nombre}</span>
                      {tipoTexto && (
                        <span className="ml-2 text-xs italic text-gray-300">
                          ({tipoTexto})
                        </span>
                      )}
                    </div>

                    {/* Series y repeticiones si está seleccionado */}
                    {isChecked && detail && (
                      <div className="mt-2 md:mt-0 flex space-x-4">
                        <label className="flex items-center space-x-1">
                          <span className="text-sm">Series:</span>
                          <input
                            type="number"
                            min="1"
                            value={detail.series}
                            onChange={(e) =>
                              updateExerciseDetail(exId, 'series', e.target.value)
                            }
                            className="w-10 rounded text-sm bg-gray-700 px-1"
                          />
                        </label>
                        <label className="flex items-center space-x-1">
                          <span className="text-sm">Reps:</span>
                          <input
                            type="number"
                            min="1"
                            value={detail.repeticiones}
                            onChange={(e) =>
                              updateExerciseDetail(exId, 'repeticiones', e.target.value)
                            }
                            className="w-10 rounded text-sm bg-gray-700 px-1"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4) Campos de comidas */}
        <div className="space-y-4">
          <div className="flex space-x-4 w-full">
            <div className="w-1/2">
              <label htmlFor="desayuno" className="block mb-2 font-medium">
                Desayuno
              </label>
              <input
                id="desayuno"
                type="text"
                value={desayuno}
                onChange={(e) => setDesayuno(e.target.value)}
                placeholder="Ej. Avena con fruta"
                className="w-full bg-gray-600 text-white p-2 rounded"
              />
            </div>
            <div className="w-1/2">
              <label htmlFor="almuerzo" className="block mb-2 font-medium">
                Comida
              </label>
              <input
                id="almuerzo"
                type="text"
                value={almuerzo}
                onChange={(e) => setAlmuerzo(e.target.value)}
                placeholder="Ej. Arroz con pollo"
                className="w-full bg-gray-600 text-white p-2 rounded"
              />
            </div>
          </div>

          <div className="flex space-x-4 w-full">
            <div className="w-1/2">
              <label htmlFor="merienda" className="block mb-2 font-medium">
                Merienda
              </label>
              <input
                id="merienda"
                type="text"
                value={merienda}
                onChange={(e) => setMerienda(e.target.value)}
                placeholder="Ej. Yogur con nueces"
                className="w-full bg-gray-600 text-white p-2 rounded"
              />
            </div>
            <div className="w-1/2">
              <label htmlFor="cena" className="block mb-2 font-medium">
                Cena
              </label>
              <input
                id="cena"
                type="text"
                value={cena}
                onChange={(e) => setCena(e.target.value)}
                placeholder="Ej. Ensalada con atún"
                className="w-full bg-gray-600 text-white p-2 rounded"
              />
            </div>
          </div>
        </div>

        {error && <p className="text-red-400">{error}</p>}

        {/* Botones de Guardar y Cancelar */}
        <div className="w-full flex space-x-4">
            <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-1/4 bg-gray-800 hover:bg-gray-900 py-2 rounded-full cursor-pointer transition font-semibold"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="w-3/4  bg-violet-500 hover:bg-violet-600 py-2 rounded-full cursor-pointer transition text-white font-semibold"
          >
            Guardar cambios
          </button>
          
        </div>
      </form>
    </div>
  );
};

export default RoutineEdit;
