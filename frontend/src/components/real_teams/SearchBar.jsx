// components/common/real-teams/SearchBar.jsx
import React from 'react';
import { Search, Filter } from 'lucide-react';

const SearchBar = ({ 
  activeTab, 
  searchTerm, 
  setSearchTerm, 
  totalItems, 
  filteredItems 
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex-1 w-full md:max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder={
                activeTab === 'players' 
                  ? "Buscar jugador..." 
                  : "Buscar goleador..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Filter size={16} />
            <span>
              {activeTab === 'players' 
                ? `${filteredItems} de ${totalItems} jugadores`
                : `${filteredItems} de ${totalItems} goleadores`
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;