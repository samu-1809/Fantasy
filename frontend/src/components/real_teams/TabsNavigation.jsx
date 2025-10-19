import { Shield, Users, BarChart3, Goal } from 'lucide-react';

const TabsNavigation = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'teams', label: 'Equipos', icon: Shield },
    { id: 'players', label: 'Jugadores', icon: Users },
    { id: 'standings', label: 'Clasificación', icon: BarChart3 },
    { id: 'scorers', label: 'Goleadores', icon: Goal }
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-2 mb-8 max-w-2xl mx-auto">
      <div className="flex">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 px-2 sm:px-4 rounded-lg font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-green-600 to-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <div className="flex items-center justify-center gap-1 sm:gap-2">
                <IconComponent size={16} className="sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm">{tab.label}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TabsNavigation;