import React, { useContext } from 'react'
import { Link } from 'react-router-dom';
import { UserContext } from '../../context/UserContext.js';

const Header = () => {

    const { token, setToken } = useContext(UserContext)

     const logout = () => {
        setToken(null);
        localStorage.removeItem("token");
        console.log("User logged out successfully");
    }

    return (
        <div className="bg-gray-800 flex justify-between items-center p-4 px-10 text-white">
            <div>
                <p className="font-bold">trainR</p>
            </div>
            <div>
                {token ? (
                    <Link to="/login" className="cursor-pointer rounded-full font-semibold hover:bg-purple-800 transition bg-purple-700 px-3 py-2" onClick={logout}>Logout</Link>
                ) : (
                    <Link to="/login" className="cursor-pointer rounded-full font-semibold hover:bg-purple-800 transition bg-purple-700 px-3 py-2">Login</Link>    
                      
                )}
            </div>
            
        </div>
    )

}
export default Header;
