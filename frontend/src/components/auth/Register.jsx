import React, { useState, useEffect } from 'react';
import { use } from 'react';

const Register = () => {

    const API = 'http://localhost:3000';

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const { username, email, password, confirmPassword } = formData;
    const [users, setUsers] = useState([]);

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
            console.log(data);
        } catch (err) {
            console.error("Error fetching users:", err);
        }
    }

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
            console.log("Registration successful:", data);
        } catch (err) {
            console.error("Registration error:", err);
        }
    }


    return(
        <div className="bg-gray-800 min-h-screen text-white text-center p-10">
            <h1>Register</h1>
            <form onSubmit={handleRegister} className="flex flex-col items-center">
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="mb-2 p-2 rounded bg-gray-700 text-white w-64"
                />
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mb-2 p-2 rounded bg-gray-700 text-white w-64"
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="mb-2 p-2 rounded bg-gray-700 text-white w-64"
                />
                <input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="mb-4 p-2 rounded bg-gray-700 text-white w-64"
                />
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                    Register
                </button>
            </form>
            <p className="mt-4 text-gray-400">Already have an account? <a href="/login" className="text-blue-400 hover:underline">Login</a></p>

        
        </div>
    )
}
export default Register;