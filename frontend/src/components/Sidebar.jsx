import React from 'react';
import {
  LayoutDashboard, Users, Clock, Truck, Share2,
  Bed, Stethoscope, Bell, Shield, FlaskConical,
  ChevronLeft, ChevronRight
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  onSelectTab,
  isCollapsed = false,
  onToggleCollapse
}) {
  const navSections = [
    {
      title: "Main",
      items: [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        { id: "triage-queue", label: "Triage Queue", icon: Clock },
        { id: "patients", label: "Patients", icon: Users },
      ]
    },
    {
      title: "Resources & Beds",
      items: [
        { id: "beds", label: "Bed Management", icon: Bed },
        { id: "ambulances", label: "Ambulances", icon: Truck },
        { id: "referrals", label: "Network Referrals", icon: Share2 },
        { id: "staff", label: "Staff on Duty", icon: Stethoscope }
      ]
    },
    {
      title: "Safety & Audit",
      items: [
        { id: "alerts", label: "Alerts", icon: Bell },
        { id: "audit", label: "Audit Logs", icon: Shield },
      ]
    }
  ];

  return (
    <aside
      className={`${
        isCollapsed ? 'w-16' : 'w-56'
      } bg-white text-slate-700 flex flex-col justify-between h-full flex-shrink-0 border-r border-slate-200 select-none transition-all duration-200 ease-in-out z-20`}
    >
      {/* Top Header with Collapse Toggle */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <div
          className={`px-3 py-2.5 flex items-center ${
            isCollapsed ? 'justify-center' : 'justify-between'
          } border-b border-slate-100`}
        >
          {!isCollapsed && (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Navigation
            </span>
          )}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition flex items-center justify-center"
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Scrollable Navigation List */}
        <div className="p-2 space-y-4 overflow-y-auto flex-1">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {!isCollapsed ? (
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2.5 py-1">
                  {section.title}
                </h4>
              ) : (
                <div className="my-1.5 border-t border-slate-100" />
              )}

              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center ${
                      isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-2.5 px-3 py-2'
                    } rounded-lg text-xs font-medium transition ${
                      isActive
                        ? "bg-blue-50 text-blue-700 font-semibold shadow-2xs"
                        : "hover:bg-slate-50 text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 ${
                        isActive ? "text-blue-600" : "text-slate-400"
                      }`}
                    />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Clean Footer for Operations Simulator */}
      <div className="p-2 border-t border-slate-100 bg-slate-50/50">
        <button
          onClick={() => onSelectTab('simulation')}
          title={isCollapsed ? "Operations Simulator" : undefined}
          className={`w-full flex items-center ${
            isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-2.5 px-3 py-2'
          } rounded-lg text-xs font-medium transition border ${
            activeTab === 'simulation'
              ? 'bg-purple-50 text-purple-700 border-purple-200 font-semibold'
              : 'border-slate-200 text-slate-600 hover:bg-white bg-white/80'
          }`}
        >
          <FlaskConical className="w-4 h-4 text-purple-500 flex-shrink-0" />
          {!isCollapsed && <span className="truncate">Operations Simulator</span>}
        </button>
      </div>
    </aside>
  );
}
