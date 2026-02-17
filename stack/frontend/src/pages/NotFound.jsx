import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-black flex items-center justify-center px-4">
            <div className="text-center">
                <h1 className="text-9xl font-bold text-[#59ce8f] mb-4">404</h1>
                <h2 className="text-4xl font-bold text-white mb-4">
                    Oops! You're Lost, Bro
                </h2>
                <p className="text-xl text-gray-400 mb-8">
                    Yo, this page ain't here. Maybe it never was... 🤷‍♂️
                </p>
                <button
                    onClick={() => navigate('/')}
                    className="px-6 py-3 bg-[#59ce8f] text-black font-semibold rounded-xl hover:bg-[#4ab87d] transition-all"
                >
                    Take Me Home
                </button>
            </div>
        </div>
    );
}
