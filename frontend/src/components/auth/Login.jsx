import React, { useState, useEffect } from 'react';

const Login = () => {

    const API = 'http://localhost:3000';

    const [users, setUsers] = useState([]);
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState([])

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

        if(password != users.password) {
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
            console.log("Login successful:", data);

        } catch (err) {
            console.error("Login error:", err);
        }}

    return(
        <div className="bg-gray-800 min-h-screen text-white text-center p-10">
            <h1>Login</h1>
            <div className="flex flex-col items-center justify-center">

            
                <input 
                    type="email" 
                    placeholder="Email"
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    className="mb-4 p-2 rounded bg-gray-700 text-white w-1/3"/>
                <input 
                    type="password" 
                    placeholder="Password"
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="mb-4 p-2 rounded bg-gray-700 text-white w-1/3"/>
                <button
                    onClick={() => handleLogin(email, password)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                    Login
                </button>
            </div>
            <p className="mt-4 text-gray-400">Don't have an account? <a href="/register" className="text-blue-400 hover:underline">Register</a></p>

        </div>
    )
}
export default Login;