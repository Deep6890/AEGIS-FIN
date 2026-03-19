import { useState } from 'react';
import PageLayout from '../components/Layout/PageLayout';
import { User, Shield, Briefcase, Mail, Building, Bell, Star, Clock, Heart, Search } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';

export default function Profile() {
  const { currentUser } = useAppData();

  if (!currentUser) return <PageLayout><div>Loading profile...</div></PageLayout>;

  return (
    <PageLayout>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0f1f0f] tracking-tight">Analyst Profile</h1>
          <p className="text-gray-500 mt-2 flex items-center gap-2">
            <Shield size={16} /> Manage your identity, watchlists, and alert constraints
          </p>
        </div>
        
        <button className="bg-white px-4 py-2 border border-emerald-100 shadow-sm rounded-xl font-bold text-gray-700 hover:bg-emerald-50 transition">
          Edit Profile
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* L COL: Identity Card */}
        <div className="xl:col-span-1 space-y-6">
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100 flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-emerald-100 border-4 border-emerald-50 mb-4 flex items-center justify-center text-emerald-700 text-3xl font-black shadow-inner">
              {currentUser.initials}
            </div>
            <h2 className="text-2xl font-black text-gray-800">{currentUser.name}</h2>
            <p className="text-emerald-600 font-bold text-sm tracking-wide bg-emerald-50 px-3 py-1 rounded-full mt-2 mb-6">{currentUser.role}</p>

            <div className="w-full space-y-3 text-left">
              <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100">
                <Building size={16} className="text-gray-400" /> {currentUser.company}
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100">
                <Briefcase size={16} className="text-gray-400" /> {currentUser.department}
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100">
                <Mail size={16} className="text-gray-400" /> {currentUser.email}
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100">
                <Shield size={16} className="text-emerald-500" /> {currentUser.clearance}
              </div>
            </div>
          </div>

        </div>

        {/* R COL: Watchlists & Searches */}
        <div className="xl:col-span-2 space-y-6">
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100">
            <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">
              <Heart size={18} className="text-rose-500" /> Saved Watchlists
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentUser.watchlists.map((w, i) => (
                <div key={i} className="border border-gray-200 hover:border-emerald-300 p-4 rounded-xl cursor-pointer hover:shadow-md transition bg-gray-50 hover:bg-white group">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-gray-800 group-hover:text-emerald-700">{w.name}</h4>
                    {w.alert && <Bell size={14} className="text-amber-500" />}
                  </div>
                  <div className="text-xs text-gray-500 font-bold bg-white border border-gray-100 w-max px-2 py-1 rounded">
                    {w.count} Companies mapped
                  </div>
                </div>
              ))}
              <div className="border-2 border-dashed border-gray-200 hover:border-emerald-400 p-4 rounded-xl cursor-pointer hover:bg-emerald-50 flex items-center justify-center min-h-[100px] text-emerald-600 font-bold transition">
                + Create New Watchlist
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100">
            <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">
              <Clock size={18} className="text-blue-500" /> Recent Activity & Searches
            </h3>
            <div className="space-y-2">
              {currentUser.searches.map((s, i) => (
                <div key={i} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 cursor-pointer transition">
                  <div className="flex items-center gap-3 text-sm text-gray-700 font-medium">
                    <span className="text-gray-400">
                      {s.type === 'search' ? <Search size={14}/> : <Star size={14}/>}
                    </span>
                    {s.term}
                  </div>
                  <span className="text-xs text-gray-400 font-bold">{s.time}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </PageLayout>
  );
}
