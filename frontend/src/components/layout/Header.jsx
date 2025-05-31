import React from 'react'
import { Link } from 'react-router-dom';

const Header = () => {
    return (
        <div className="bg-gray-800 flex justify-between items-center p-4 px-10 text-white">
            <div>
                <p className="font-bold">trainR</p>
            </div>
            <div>
                <Link to="/login" className="cursor-pointer rounded-full font-semibold hover:bg-purple-800 transition bg-purple-700 px-3 py-2">Login</Link>
            </div>
            
        </div>
    )

}
export default Header;
