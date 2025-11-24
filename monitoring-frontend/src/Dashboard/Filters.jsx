import React from 'react';
import { Search, Filter, Plus } from 'lucide-react'; 

export default function Filters({ filter, setFilter, statusFilter, setStatusFilter, totalDevices, filteredCount, onAddHost }) { 
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 shadow-lg">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 gap-4">
        <div className="flex items-center space-x-4 flex-wrap gap-2">
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search hosts..."
              className="bg-gray-700 border border-gray-600 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-transparent"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              className="bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-lg focus:outline-none "
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="warning">Problems</option>
            </select>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-400">
            Showing {filteredCount} of {totalDevices} hosts
          </div>
          
          <button
            onClick={onAddHost}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-semibold shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Add Host
          </button>
        </div>
      </div>
    </div>
  );
}