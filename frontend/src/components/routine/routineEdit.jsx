import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const RoutineEdit = () => {
  const { routineId, date } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [muscleGroups, setMuscleGroups] = useState([]);
  const [allExercises, setAllExercises] = useState([]);

  const [routineType, setRoutineType] = useState('upper');
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState([]); // [mgId, ...]
  const [selectedExercises, setSelectedExercises] = useState([]); 

  const [dailyEntryId, setDailyEntryId] = useState(null);
  const [comida, setComida] = useState('');
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [mgRes, exRes] = await Promise.all([
          fetch('http://localhost:3000/api/muscle-groups'),
          fetch('http://localhost:3000/api/exercises'),
        ]);
        if (!mgRes.ok || !exRes.ok) {
          throw new Error('Error cargando grupos musculares o ejercicios');
        }
        const [mgData, exData] = await Promise.all([mgRes.json(), exRes.json()]);
        setMuscleGroups(mgData);
        setAllExercises(exData);

        const wrRes = await fetch(`http://localhost:3000/api/weekly-routines/${routineId}`);
        if (!wrRes.ok) {
          throw new Error('No se encontró la plantilla de rutina');
        }
        const wrData = await wrRes.json();
        setRoutineType(wrData.routine_type);

        const wrmgRes = await fetch('http://localhost:3000/api/weekly-routine-muscle-groups');
        if (!wrmgRes.ok) {
          throw new Error('Error cargando asociaciones de grupos musculares');
        }
        const wrmgData = await wrmgRes.json();
        const myMgLinks = wrmgData
          .filter((link) => Number(link.weekly_routine_id) === Number(routineId))
          .map((link) => Number(link.muscle_group_id));
        setSelectedMuscleGroups(myMgLinks);

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

        const deRes = await fetch('http://localhost:3000/api/daily-entries');
        if (!deRes.ok) {
          throw new Error('Error cargando entradas diarias');
        }
        const deData = await deRes.json();
        const matching = deData.find((d) => {
          const dDate = new Date(d.fecha);
          const dKey = `${dDate.getFullYear()}-${String(dDate.getMonth() + 1).padStart(
            2,
            '0'
          )}-${String(dDate.getDate()).padStart(2, '0')}`;
          return dKey === date;
        });
        if (matching) {
          setDailyEntryId(Number(matching.id));
          setComida(matching.comida || '');
          setCompleted(Boolean(matching.completed));
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

  const filteredExercises = allExercises.filter((ex) =>
    selectedMuscleGroups.includes(Number(ex.muscle_group_id))
  );

  const toggleMuscleGroup = (mgId) => {
    if (selectedMuscleGroups.includes(mgId)) {
      setSelectedMuscleGroups((prev) => prev.filter((id) => id !== mgId));
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

  const toggleExercise = (exercise) => {
    const exists = selectedExercises.find((e) => e.exercise_id === Number(exercise.id));
    if (exists) {
      setSelectedExercises((prev) =>
        prev.filter((e) => e.exercise_id !== Number(exercise.id))
      );
    } else {
      setSelectedExercises((prev) => [
        ...prev,
        { exercise_id: Number(exercise.id), series: 1, repeticiones: 10 },
      ]);
    }
  };

  const updateExerciseDetail = (exerciseId, field, value) => {
    setSelectedExercises((prev) =>
      prev.map((e) =>
        e.exercise_id === exerciseId ? { ...e, [field]: Number(value) } : e
      )
    );
  };

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
      const updateWR = await fetch(`http://localhost:3000/api/weekly-routines/${routineId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routine_type: routineType }),
      });
      if (!updateWR.ok) {
        const data = await updateWR.json();
        throw new Error(data.error || 'Error al actualizar plantilla');
      }

      const wrmgRes = await fetch('http://localhost:3000/api/weekly-routine-muscle-groups');
      const wrmgData = await wrmgRes.json();
      const prevMgLinks = wrmgData.filter(
        (link) => Number(link.weekly_routine_id) === Number(routineId)
      );
      for (const link of prevMgLinks) {
        await fetch(
          `http://localhost:3000/api/weekly-routine-muscle-groups/${routineId}/${link.muscle_group_id}`,
          { method: 'DELETE' }
        );
      }
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

      const wreRes = await fetch('http://localhost:3000/api/weekly-routine-exercises');
      const wreData = await wreRes.json();
      const prevExLinks = wreData.filter(
        (link) => Number(link.weekly_routine_id) === Number(routineId)
      );
      for (const link of prevExLinks) {
        await fetch(`http://localhost:3000/api/weekly-routine-exercises/${link.id}`, {
          method: 'DELETE',
        });
      }
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

      if (dailyEntryId) {
        await fetch(`http://localhost:3000/api/daily-entries/${dailyEntryId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comida, completed }),
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
            comida,
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
      <h2 className="text-2xl font-semibold mb-6">Editar rutina (Fecha: {date})</h2>

      <form
        onSubmit={handleSubmit}
        className="bg-gray-700 p-6 rounded-lg w-full max-w-2xl space-y-6"
      >
        <div>
          <label htmlFor="routineType" className="block mb-2 font-medium">
            Tipo de rutina
          </label>
          <select
            id="routineType"
            value={routineType}
            onChange={(e) => setRoutineType(e.target.value)}
            className="w-full bg-gray-600 text-white p-2 rounded"
          >
            <option value="upper">Tren superior</option>
            <option value="lower">Tren inferior</option>
          </select>
        </div>

        <div>
          <p className="mb-2 font-medium">Grupos musculares</p>
          <div className="grid grid-cols-3 gap-2">
            {muscleGroups.map((mg) => (
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
          </div>
        </div>

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
                return (
                  <div
                    key={exId}
                    className="bg-gray-600 p-3 rounded flex flex-col md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleExercise(ex)}
                        className="h-4 w-4 text-green-500"
                      />
                      <span>{ex.nombre}</span>
                    </div>
                    {isChecked && detail && (
                      <div className="mt-2 md:mt-0 flex space-x-4">
                        <label className="flex items-center space-x-1">
                          <span>Series:</span>
                          <input
                            type="number"
                            min="1"
                            value={detail.series}
                            onChange={(e) =>
                              updateExerciseDetail(exId, 'series', e.target.value)
                            }
                            className="w-16 text-black p-1 rounded"
                          />
                        </label>
                        <label className="flex items-center space-x-1">
                          <span>Reps:</span>
                          <input
                            type="number"
                            min="1"
                            value={detail.repeticiones}
                            onChange={(e) =>
                              updateExerciseDetail(exId, 'repeticiones', e.target.value)
                            }
                            className="w-16 text-black p-1 rounded"
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

        <div>
          <label htmlFor="comida" className="block mb-2 font-medium">
            Comida del día
          </label>
          <textarea
            id="comida"
            value={comida}
            onChange={(e) => setComida(e.target.value)}
            placeholder="Ej. Arroz con pollo"
            className="w-full bg-gray-600 text-white p-2 rounded h-24 resize-none"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            checked={completed}
            onChange={(e) => setCompleted(e.target.checked)}
            className="h-5 w-5 text-green-500"
          />
          <label className="ml-2">Marcar como completado</label>
        </div>

        {error && <p className="text-red-400">{error}</p>}

        <div className="flex space-x-4">
          <button
            type="submit"
            className="flex-1 bg-green-500 hover:bg-green-600 py-2 rounded"
          >
            Guardar cambios
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 bg-gray-500 hover:bg-gray-600 py-2 rounded"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default RoutineEdit;
