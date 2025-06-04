import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserContext } from '../../context/UserContext.js';
import { logo, exit } from './Svg.jsx';

const Header = () => {
  const { token, setToken, user, setUser } = useContext(UserContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API = import.meta.env.VITE_API_URL ||'https://trainR.onrender.com/api'

  const logout = () => {
    setToken(null);
    setUser(null);           
    localStorage.removeItem('token');
    console.log('User logged out successfully');
  };

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchUser = async () => {
      try {
        const response = await fetch(`${API}/users/me`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || 'Error al obtener datos del usuario');
        }
        const data = await response.json();
        setUser({ id: data.id, username: data.username });
      } catch (err) {
        console.error('Error fetching current user:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token, setUser]);

  return (
    <div className="bg-gray-800 flex justify-between items-center p-4 px-10 text-white">
      <div className="flex items-center gap-2">
        {logo()}
        <p className="font-bold text-3xl">trainR</p>
      </div>

      <div className="flex items-center gap-4">
        {loading && <p>Cargando usuario...</p>}
        {error && <p className="text-red-400">Error: {error}</p>}
        {!loading && !error && user && (
          <p className="font-medium">
            {user.username} (ID: {user.id})
          </p>
        )}
        <Link
          to="/login"
          className="cursor-pointer rounded-full font-semibold p-2"
          onClick={logout}
        >
          {exit()}
        </Link>
      </div>
    </div>
  );
};

export default Header;
