import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const RoutineAdd = () => {
  const { dayOfWeek } = useParams();
  const navigate = useNavigate();

    const API = import.meta.env.VITE_API_URL || "https://trainR.onrender.com/api";


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
          fetch(`${API}/muscle-groups`),
          fetch(`${API}/exercises`),
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
      setSelectedExercises((prev) => prev.filter((e) => e.exercise_id !== exId));
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

  const rawDate = getDateForDayOfWeek(dayOfWeek);
  const formattedDate = rawDate
    ? new Date(rawDate).toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).replace(/^./, (str) => str.toUpperCase())
    : '';

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
      fecha: rawDate, 
      desayuno: desayuno || null,
      comida: almuerzo || null,
      merienda: merienda || null,
      cena: cena || null,
    };

    try {
      const res = await fetch(`${API}/weekly-routines`, {
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

  const dayNames = [
    '',
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
    'Domingo',
  ];

  return (
    <div className="bg-gray-800 min-h-screen text-white p-4 flex flex-col items-center">
      <h2 className="text-xl font-semibold mb-4 text-center text-gray-100 px-2">
        {formattedDate || 'Añadir rutina'}
      </h2>

      {error && <p className="text-red-400 text-center mb-4">{error}</p>}

      <form
        onSubmit={handleSubmit}
        className="bg-gray-700 p-4 rounded-lg w-full max-w-lg space-y-6"
      >
        <div>
          <label htmlFor="routineType" className="block mb-2 font-medium text-gray-200">
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
            className="w-full bg-gray-600 text-white p-2 rounded focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="upper">Tren superior</option>
            <option value="lower">Tren inferior</option>
            <option value="fullbody">Full body</option>
          </select>
        </div>

        <div>
          <p className="mb-2 font-medium text-gray-200">
            Grupos musculares (
            {routineType === 'upper'
              ? 'Superior'
              : routineType === 'lower'
              ? 'Inferior'
              : 'Full body'}
            )
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {filteredMuscleGroups.map((mg) => (
              <label
                key={mg.id}
                className="flex items-center space-x-2 bg-gray-600 p-2 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedMuscleGroups.includes(Number(mg.id))}
                  onChange={() => toggleMuscleGroup(Number(mg.id))}
                  className="h-4 w-4 text-green-500"
                />
                <span className="capitalize text-gray-100">{mg.nombre}</span>
              </label>
            ))}
            {filteredMuscleGroups.length === 0 && (
              <p className="italic text-gray-300 col-span-full">
                No hay grupos para este tipo
              </p>
            )}
          </div>
        </div>

        <div>
          <p className="mb-2 font-medium text-gray-200">Ejercicios</p>
          {filteredExercises.length === 0 ? (
            <p className="italic text-gray-300">
              Selecciona primero un grupo muscular para ver ejercicios.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredExercises.map((ex) => {
                const exId = Number(ex.id);
                const isChecked = selectedExercises.some((e) => e.exercise_id === exId);
                const detail = selectedExercises.find((e) => e.exercise_id === exId);

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
                    className="bg-gray-600 p-3 rounded flex flex-col sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                      <span className="font-semibold text-gray-100">{ex.nombre}</span>
                      {tipoTexto && (
                        <span className="mt-1 sm:mt-0 sm:ml-2 text-xs italic text-gray-300">
                          ({tipoTexto})
                        </span>
                      )}
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleExercise(ex)}
                        className="h-4 w-4 mr-2 text-green-500 mt-2 sm:mt-0 order-last sm:order-first"
                      />
                    </div>

                    {isChecked && detail && (
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-2 sm:mt-0">
                        <label className="flex items-center space-x-1 mb-2 sm:mb-0">
                          <span className="text-sm text-gray-200">Series:</span>
                          <input
                            type="number"
                            min="1"
                            value={detail.series}
                            onChange={(e) =>
                              updateExerciseDetail(exId, 'series', e.target.value)
                            }
                            className="w-12 rounded text-sm bg-gray-700 text-white px-1 py-0.5 focus:outline-none"
                          />
                        </label>
                        <label className="flex items-center space-x-1">
                          <span className="text-sm text-gray-200">Reps:</span>
                          <input
                            type="number"
                            min="1"
                            value={detail.repeticiones}
                            onChange={(e) =>
                              updateExerciseDetail(exId, 'repeticiones', e.target.value)
                            }
                            className="w-12 rounded text-sm bg-gray-700 text-white px-1 py-0.5 focus:outline-none"
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
          <div className="flex flex-col md:flex-row md:space-x-4 w-full">
            <div className="w-full md:w-1/2">
              <label htmlFor="desayuno" className="block mb-2 font-medium text-gray-200">
                Desayuno
              </label>
              <input
                id="desayuno"
                type="text"
                value={desayuno}
                onChange={(e) => setDesayuno(e.target.value)}
                placeholder="Ej. Avena con fruta"
                className="w-full bg-gray-600 text-white p-2 rounded focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div className="w-full md:w-1/2 mt-4 md:mt-0">
              <label htmlFor="almuerzo" className="block mb-2 font-medium text-gray-200">
                Comida
              </label>
              <input
                id="almuerzo"
                type="text"
                value={almuerzo}
                onChange={(e) => setAlmuerzo(e.target.value)}
                placeholder="Ej. Arroz con pollo"
                className="w-full bg-gray-600 text-white p-2 rounded focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:space-x-4 w-full">
            <div className="w-full md:w-1/2">
              <label htmlFor="merienda" className="block mb-2 font-medium text-gray-200">
                Merienda
              </label>
              <input
                id="merienda"
                type="text"
                value={merienda}
                onChange={(e) => setMerienda(e.target.value)}
                placeholder="Ej. Yogur con nueces"
                className="w-full bg-gray-600 text-white p-2 rounded focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div className="w-full md:w-1/2 mt-4 md:mt-0">
              <label htmlFor="cena" className="block mb-2 font-medium text-gray-200">
                Cena
              </label>
              <input
                id="cena"
                type="text"
                value={cena}
                onChange={(e) => setCena(e.target.value)}
                placeholder="Ej. Ensalada con atún"
                className="w-full bg-gray-600 text-white p-2 rounded focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:space-x-4 w-full">
          <button
            type="submit"
            disabled={submitting}
            className={`w-full sm:w-2/3 bg-violet-500 hover:bg-violet-600 py-2 rounded-full text-white font-semibold mb-3 sm:mb-0 transition cursor-pointer ${
              submitting ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            {submitting ? 'Creando…' : 'Crear rutina'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full sm:w-1/3 bg-gray-800 hover:bg-gray-900 py-2 rounded-full text-gray-200 font-semibold transition cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default RoutineAdd;
