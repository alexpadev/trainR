import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../../context/UserContext.js';
import { useNavigate } from 'react-router-dom';

const Login = () => {

    const API = 'http://localhost:3000';

    const [users, setUsers] = useState([]);
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState([]);
    const {token, setToken} = useContext(UserContext);
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
            console.log(data)
        } catch (err) {
            console.error("Error fetching users:", err);
        }
    }

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleLogin = async (email, password) => {
        if (!email || !password) {
            console.error("Email and password are required");
            return;
        }

        if (!users.some(user => user.password === password)) {
            console.error("Incorrect password");
            return;
        }

        if (!users.some(user => user.email === email)) {
            console.error("User not found");
            return;
        }

        try {
            const response = await fetch(`${API}/api/auth/login`, {
                method:'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            })
            if (!response.ok) {
                throw new Error('Login failed');
            }
            const data = await response.json();
            setToken(data.email)
            localStorage.setItem("token", data.email);
            Navigate("/");


        } catch (err) {
            console.error("Login error:", err);
        }}

       

    return(
        <div className="bg-gray-800 min-h-screen text-white text-center p-10 py-40">
            <div className="border border-gray-600 rounded-lg p-10 max-w-lg mx-auto flex flex-col items-center justify-center">
            <h1 className="text-gray-200 text-2xl font-semibold mb-6">Login</h1>
           
                <input 
                    type="email" 
                    placeholder="Email"
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    className="mb-6 p-2 rounded bg-gray-700 text-white w-5/6"/>
                <input 
                    type="password" 
                    placeholder="Password"
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="mb-4 p-2 rounded bg-gray-700 text-white w-5/6"/>
                <button
                    onClick={() => handleLogin(email, password)}
                    className="mt-5 bg-violet-500 hover:bg-violet-600 text-white font-bold py-2 px-4 rounded-full transition cursor-pointer w-5/6">
                    Login
                </button>
                <p className="mt-4 text-gray-400">Don't have an account? <a href="/register" className="font-semibold text-emerald-400 hover:text-emerald-500 transition">Register here</a></p>

            </div>

        </div>
    )
}
export default Login;