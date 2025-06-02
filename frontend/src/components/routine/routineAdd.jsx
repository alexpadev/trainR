// src/components/routine/routineAdd.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const RoutineAdd = () => {
  const { dayOfWeek } = useParams();
  const navigate = useNavigate();

  // 1) Estado para grupos musculares y ejercicios
  const [muscleGroups, setMuscleGroups] = useState([]);
  const [allExercises, setAllExercises] = useState([]);

  // 2) Estados del formulario
  const [routineType, setRoutineType] = useState('upper');
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState([]);
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [desayuno, setDesayuno] = useState('');
  const [almuerzo, setAlmuerzo] = useState('');
  const [merienda, setMerienda] = useState('');
  const [cena, setCena] = useState('');

  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // 3) Cargar muscleGroups y allExercises al montar el componente
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

  // 4) Filtrar grupos según rutina seleccionada (upper, lower o fullbody)
  const filteredMuscleGroups =
    routineType === 'fullbody'
      ? muscleGroups
      : muscleGroups.filter((mg) => mg.tipo === routineType);

  // 5) Filtrar ejercicios que correspondan a los grupos musculares seleccionados
  const filteredExercises = allExercises.filter((ex) =>
    selectedMuscleGroups.includes(Number(ex.muscle_group_id))
  );

  // 6) Estado auxiliar para cambios en selección
  const toggleMuscleGroup = (mgId) => {
    if (selectedMuscleGroups.includes(mgId)) {
      // Si ya estaba seleccionado, lo quitamos y además desmarcamos los ejercicios de ese grupo
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

  // 7) Función para calcular la fecha real en base al día de la semana
  const getDateForDayOfWeek = (targetDay) => {
    const today = new Date();
    const offsetHoy = (today.getDay() + 6) % 7; // lunes=0…domingo=6
    const offsetTarget = Number(targetDay) - 1; // lunes=0…domingo=6
    const diff = offsetTarget - offsetHoy;
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + diff);
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // 8) Al enviar el formulario, armamos el payload y hacemos POST
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
      comida: almuerzo || null,
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
      {/* Título con el día de la semana */}
      <h2 className="text-2xl font-semibold mb-6 text-center text-gray-100">
        {['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'][dayOfWeek]}
      </h2>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      <form
        onSubmit={handleSubmit}
        className="bg-gray-700 p-6 rounded-lg w-full max-w-2xl space-y-6"
      >
        {/* 1) Selección del tipo de rutina */}
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

        {/* 3) Listado de ejercicios filtrados */}
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

                // 4) BUSCAMOS el grupo muscular de este ejercicio para obtener su tipo
                const mg = muscleGroups.find(
                  (m) => Number(m.id) === Number(ex.muscle_group_id)
                );
                // Interpretamos el tipo
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
                    {/* Nombre + tipo de rutina */}
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleExercise(ex)}
                        className="h-4 w-4 text-green-500"
                      />
                      <span className="font-semibold">{ex.nombre}</span>
                      {/* AQUÍ mostramos el tipo de rutina en un texto pequeño */}
                      {tipoTexto && (
                        <span className="ml-2 text-xs italic text-gray-300">
                          ({tipoTexto})
                        </span>
                      )}
                    </div>

                    {/* Si está chequeado, mostramos series y repeticiones */}
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
                            className="w-10 rounded text-sm mr-2 bg-gray-700 px-1"
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

        {/* 4) Campos de comidas (Desayuno, Comida, Merienda, Cena) */}
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

        {/* 5) Botón de envío */}
        <button
          type="submit"
          disabled={submitting}
          className={`w-full py-2 rounded ${
            submitting
              ? 'bg-gray-500 cursor-not-allowed'
              : 'mt-5 bg-violet-500 hover:bg-violet-600 cursor-pointer rounded-full transition font-semibold'
          }`}
        >
          {submitting ? 'Guardando…' : 'Crear rutina'}
        </button>
      </form>
    </div>
  );
};

export default RoutineAdd;
