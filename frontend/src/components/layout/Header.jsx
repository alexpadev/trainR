import React, { useContext } from 'react'
import { Link } from 'react-router-dom';
import { UserContext } from '../../context/UserContext.js';
import {logo, exit} from './Svg.jsx'

const Header = () => {

    const { token, setToken } = useContext(UserContext)

     const logout = () => {
        setToken(null);
        localStorage.removeItem("token");
        console.log("User logged out successfully");
    }

    return (
        <div className="bg-gray-800 flex justify-between items-center p-4 px-10 text-white">
            <div className="flex items-center gap-2">
                {logo()}
                <p className="font-bold text-3xl">trainR</p>
            </div>
            <div>
                <Link to="/login" className="cursor-pointer rounded-full font-semibold hover:bg-violet-600 transition bg-violet-500" onClick={logout}>{exit()}</Link>
                             
            </div>
            
        </div>
    )

}
export default Header;
