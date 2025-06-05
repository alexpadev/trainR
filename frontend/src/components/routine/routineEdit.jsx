import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const RoutineEdit = () => {
  const { routineId, date } = useParams();
  const navigate = useNavigate();

  const API = import.meta.env.VITE_API_URL || "https://trainR.onrender.com/api";
  const token = localStorage.getItem('token') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [muscleGroups, setMuscleGroups] = useState([]);
  const [allExercises, setAllExercises] = useState([]);

  const [routineType, setRoutineType] = useState('upper');
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState([]);
  const [selectedExercises, setSelectedExercises] = useState([]);

  const [dailyEntryId, setDailyEntryId] = useState(null);
  const [desayuno, setDesayuno] = useState('');
  const [comida, setComida] = useState('');  
  const [merienda, setMerienda] = useState('');
  const [cena, setCena] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

      
        const [mgRes, exRes] = await Promise.all([
          fetch(`${API}/muscle-groups`),
          fetch(`${API}/exercises`)
        ]);

        if (!mgRes.ok || !exRes.ok) {
          throw new Error('Error cargando datos maestros');
        }
        const [mgData, exData] = await Promise.all([mgRes.json(), exRes.json()]);
        setMuscleGroups(mgData);
        setAllExercises(exData);

        const wrRes = await fetch(
          `${API}/weekly-routines/${routineId}`,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }
        );
        if (!wrRes.ok) {
          if (wrRes.status === 401 || wrRes.status === 403) {
            throw new Error('No autorizado. Por favor inicia sesión de nuevo.');
          }
          throw new Error('Rutina no encontrada');
        }
        const wrData = await wrRes.json();
        setRoutineType(wrData.routine_type);

        const wrmgRes = await fetch(
          `${API}/weekly-routine-muscle-groups`,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }
        );
        if (!wrmgRes.ok) {
          throw new Error('Error cargando asociaciones de grupos musculares');
        }
        const wrmgData = await wrmgRes.json();
        const myMgLinks = wrmgData
          .filter((link) => Number(link.weekly_routine_id) === Number(routineId))
          .map((link) => Number(link.muscle_group_id));
        setSelectedMuscleGroups(myMgLinks);

        const wreRes = await fetch(
          `${API}/weekly-routine-exercises`,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }
        );
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

        const deRes = await fetch(
          `${API}/daily-entries`,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }
        );
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
          setComida(match.comida || '');    
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
  }, [routineId, date, API, token]);

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
      const updateWR = await fetch(
        `${API}/weekly-routines/${routineId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ routine_type: routineType }),
        }
      );
      if (!updateWR.ok) {
        const data = await updateWR.json();
        throw new Error(data.error || 'Error actualizando rutina');
      }

      const wrmgRes = await fetch(
        `${API}/weekly-routine-muscle-groups`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      const wrmgData = await wrmgRes.json();
      const prevMgLinks = wrmgData.filter(
        (link) => Number(link.weekly_routine_id) === Number(routineId)
      );
      for (const link of prevMgLinks) {
        await fetch(
          `${API}/weekly-routine-muscle-groups/${routineId}/${link.muscle_group_id}`,
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }
        );
      }
      for (const mgId of selectedMuscleGroups) {
        await fetch(
          `${API}/weekly-routine-muscle-groups`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              weekly_routine_id: Number(routineId),
              muscle_group_id: mgId,
            }),
          }
        );
      }

      const wreRes = await fetch(
        `${API}/weekly-routine-exercises`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      const wreData = await wreRes.json();
      const prevExLinks = wreData.filter(
        (link) => Number(link.weekly_routine_id) === Number(routineId)
      );
      for (const link of prevExLinks) {
        await fetch(
          `${API}/weekly-routine-exercises/${link.id}`,
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }
        );
      }
      for (const ex of selectedExercises) {
        await fetch(
          `${API}/weekly-routine-exercises`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              weekly_routine_id: Number(routineId),
              exercise_id: ex.exercise_id,
              series: ex.series,
              repeticiones: ex.repeticiones,
            }),
          }
        );
      }

      if (dailyEntryId) {
        await fetch(
          `${API}/daily-entries/${dailyEntryId}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              desayuno,
              comida,
              merienda,
              cena,
            }),
          }
        );
      } else {
        await fetch(
          `${API}/daily-entries`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              fecha: date,
              weekly_routine_id: Number(routineId),
              desayuno,
              comida,
              merienda,
              cena,
            }),
          }
        );
      }

      navigate('/');
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 min-h-screen text-white text-center p-6">
        <h2 className="text-2xl mb-4">Cargando datos de la rutina…</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 min-h-screen text-white text-center p-6">
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
    <div className="bg-gray-800 min-h-screen text-white p-4 flex flex-col items-center">
      <h2 className="text-xl font-semibold mb-4 text-center text-gray-100 px-2">
        {`${
          new Date(date).toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }).replace(/^./, (str) => str.toUpperCase())
        }`}
      </h2>

      <form
        onSubmit={handleSubmit}
        className="bg-gray-700 p-4 rounded-lg w-full max-w-xl space-y-6"
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
              <label htmlFor="comida" className="block mb-2 font-medium text-gray-200">
                Comida
              </label>
              <input
                id="comida"
                type="text"
                value={comida}
                onChange={(e) => setComida(e.target.value)}
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

        {error && <p className="text-red-400 text-center">{error}</p>}

        <div className="flex flex-col sm:flex-row sm:space-x-4 w-full">
          <button
            type="submit"
            className="w-full sm:w-2/3 bg-violet-500 hover:bg-violet-600 py-2 rounded-full text-white font-semibold mb-3 sm:mb-0 transition cursor-pointer"
          >
            Guardar cambios
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

export default RoutineEdit;
