import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { UserContext } from '../../context/UserContext';

const Register = () => {
  const API = 'http://localhost:3000';

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const { username, email, password, confirmPassword } = formData;
  const {token,setToken} = useContext(UserContext);

  const [users, setUsers] = useState([]);
  const Navigate = useNavigate();

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API}/api/users`, {
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
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!username || !email || !password || !confirmPassword) {
      console.error("All fields are required");
      return;
    }

    if (password !== confirmPassword) {
      console.error("Passwords do not match");
      return;
    }

    if (users.some(user => user.email === email)) {
      console.error("Email already exists");
      return;
    }

    if (users.some(user => user.username === username)) {
      console.error("This username is already taken");
      return;
    }

    try {
      const response = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password })
      });
      if (!response.ok) {
        throw new Error('Registration failed');
      }
      const data = await response.json();
      console.log("Registro completado con éxito:", data);
      setToken(data.email);
      localStorage.setItem("token", data.email);
    } catch (err) {
      console.error("Error al registrar:", err);
    }
  };

  return (
    <div className="bg-gray-800 min-h-screen text-white text-center p-4 py-10 sm:p-10 sm:py-40">
      <div className="border border-gray-600 rounded-lg p-4 sm:p-10 w-full sm:max-w-lg mx-auto flex flex-col items-center justify-center">
        <h1 className="text-gray-200 text-2xl font-semibold mb-6">Crear cuenta</h1>

        <input
          type="text"
          placeholder="Nombre de usuario"
          value={username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          className="mb-6 p-2 rounded bg-gray-700 text-white w-full sm:w-5/6"
        />
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="mb-6 p-2 rounded bg-gray-700 text-white w-full sm:w-5/6"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          className="mb-6 p-2 rounded bg-gray-700 text-white w-full sm:w-5/6"
        />
        <input
          type="password"
          placeholder="Confirmar contraseña"
          value={confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          className="mb-4 p-2 rounded bg-gray-700 text-white w-full sm:w-5/6"
        />

        <button
          onClick={handleRegister}
          className="mt-5 bg-violet-500 hover:bg-violet-600 text-white font-bold py-2 px-4 rounded-full transition cursor-pointer w-full sm:w-5/6"
        >
          Crear cuenta
        </button>

        <p className="mt-4 text-gray-400">
          Ya tienes una cuenta?{' '}
          <a href="/login" className="font-semibold text-emerald-400 hover:text-emerald-500 transition">
            Inicia sesión aquí
          </a>
        </p>
      </div>
    </div>
  );
};

export default Register;
