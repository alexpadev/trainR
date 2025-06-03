import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../../context/UserContext.js';
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
  const API = import.meta.env.VITE_API_URL || "https://trainR.onrender.com/api";

  const [users, setUsers] = useState([]);
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const { setToken } = useContext(UserContext);
  const navigate = useNavigate();

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API}/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      setUsers(data);
      console.log(data);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleLogin = async (email, password) => {
    if (!email || !password) {
      console.error("Se requiere email y contraseña");
      return;
    }

    if (!users.some(user => user.password === password)) {
      console.error("Contraseña incorrecta");
      return;
    }

    if (!users.some(user => user.email === email)) {
      console.error("Usuario no encontrado");
      return;
    }

    try {
      const response = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) {
        throw new Error('Inicio de sesión fallido');
      }
      const data = await response.json();
      setToken(data.email);
      localStorage.setItem("token", data.email);
      navigate("/");
    } catch (err) {
      console.error("Error al iniciar sesión:", err);
    }
  }

  return (
    <div className="bg-gray-800 min-h-screen text-white text-center p-4 py-10 sm:p-10 sm:py-40">
      <div className="border border-gray-600 rounded-lg p-4 sm:p-10 w-full sm:max-w-lg mx-auto flex flex-col items-center justify-center">
        <h1 className="text-gray-200 text-2xl font-semibold mb-6">Iniciar sesión</h1>

        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-6 p-2 rounded bg-gray-700 text-white w-full sm:w-5/6"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 p-2 rounded bg-gray-700 text-white w-full sm:w-5/6"
        />
        <button
          onClick={() => handleLogin(email, password)}
          className="mt-5 bg-violet-500 hover:bg-violet-600 text-white font-bold py-2 px-4 rounded-full transition cursor-pointer w-full sm:w-5/6"
        >
          Iniciar sesión
        </button>
        <p className="mt-4 text-gray-400">
          Todavía no tienes una cuenta?{" "}
          <Link
            to="/register"
            className="font-semibold text-emerald-400 hover:text-emerald-500 transition"
          >
            Regístrate aquí
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
