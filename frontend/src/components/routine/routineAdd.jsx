import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const RoutineAdd = () => {
  const { dayOfWeek } = useParams();
  const navigate = useNavigate();

  const [muscleGroups, setMuscleGroups] = useState([]);
  const [allExercises, setAllExercises] = useState([]);

  const [routineType, setRoutineType] = useState('upper');
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState([]);
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [desayuno, setDesayuno] = useState('');
  const [almuerzo, setAlmuerzo] = useState('');   
  const [merienda, setMerienda] = useState('');
  const [cena, setCena] = useState('');

  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mgRes, exRes] = await Promise.all([
          fetch('http://localhost:3000/api/muscle-groups'),
          fetch('http://localhost:3000/api/exercises'),
        ]);
        if (!mgRes.ok || !exRes.ok) {
          throw new Error('Error cargando datos');
        }
        const [mgData, exData] = await Promise.all([mgRes.json(), exRes.json()]);
        setMuscleGroups(mgData);
        setAllExercises(exData);
      } catch (err) {
        console.error(err);
        setError('No se pudieron cargar grupos musculares o ejercicios');
      }
    };
    fetchData();
  }, []);

  const filteredMuscleGroups =
    routineType === 'fullbody'
      ? muscleGroups
      : muscleGroups.filter((mg) => mg.tipo === routineType);

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
    const exId = Number(exercise.id);
    const exists = selectedExercises.find((e) => e.exercise_id === exId);
    if (exists) {
      setSelectedExercises((prev) =>
        prev.filter((e) => e.exercise_id !== exId)
      );
    } else {
      setSelectedExercises((prev) => [
        ...prev,
        { exercise_id: exId, series: 1, repeticiones: 10 },
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

  const getDateForDayOfWeek = (targetDay) => {
    const today = new Date();
    const offsetHoy = (today.getDay() + 6) % 7; 
    const offsetTarget = Number(targetDay) - 1; 
    const diff = offsetTarget - offsetHoy;
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + diff);
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
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

    setSubmitting(true);
    const user_id = Number(localStorage.getItem('user_id')) || 1;
    const payload = {
      user_id,
      day_of_week: Number(dayOfWeek),
      routine_type: routineType,
      muscle_group_ids: selectedMuscleGroups,
      exercises: selectedExercises.map((e) => ({
        exercise_id: e.exercise_id,
        series: e.series,
        repeticiones: e.repeticiones,
      })),
      fecha: getDateForDayOfWeek(dayOfWeek),
      desayuno: desayuno || null,
      comida: almuerzo  || null,
      merienda: merienda || null,
      cena: cena || null,
    };

    try {
      const res = await fetch('http://localhost:3000/api/weekly-routines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al crear rutina');
      }
      navigate('/');
    } catch (err) {
      console.error(err);
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-800 min-h-screen text-white p-10 flex flex-col items-center">
      <h2 className="text-2xl font-semibold mb-6">
        Añadir rutina para{' '}
        {['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'][dayOfWeek]}
      </h2>

      {error && <p className="text-red-400 mb-4">{error}</p>}

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

        <div className="space-y-4">
          <div>
            <label htmlFor="desayuno" className="block mb-2 font-medium">
              Desayuno
            </label>
            <textarea
              id="desayuno"
              value={desayuno}
              onChange={(e) => setDesayuno(e.target.value)}
              placeholder="Ej. Avena con fruta"
              className="w-full bg-gray-600 text-white p-2 rounded h-16 resize-none"
            />
          </div>

          <div>
            <label htmlFor="almuerzo" className="block mb-2 font-medium">
              Comida
            </label>
            <textarea
              id="almuerzo"
              value={almuerzo}
              onChange={(e) => setAlmuerzo(e.target.value)}
              placeholder="Ej. Arroz con pollo"
              className="w-full bg-gray-600 text-white p-2 rounded h-16 resize-none"
            />
          </div>

          <div>
            <label htmlFor="merienda" className="block mb-2 font-medium">
              Merienda
            </label>
            <textarea
              id="merienda"
              value={merienda}
              onChange={(e) => setMerienda(e.target.value)}
              placeholder="Ej. Yogur con nueces"
              className="w-full bg-gray-600 text-white p-2 rounded h-16 resize-none"
            />
          </div>

          <div>
            <label htmlFor="cena" className="block mb-2 font-medium">
              Cena
            </label>
            <textarea
              id="cena"
              value={cena}
              onChange={(e) => setCena(e.target.value)}
              placeholder="Ej. Ensalada con atún"
              className="w-full bg-gray-600 text-white p-2 rounded h-16 resize-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className={`w-full py-2 rounded ${
            submitting ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {submitting ? 'Guardando…' : 'Crear rutina completa'}
        </button>
      </form>
    </div>
  );
};

export default RoutineAdd;
