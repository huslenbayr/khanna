// app/_components/RoutePreferencesModal.tsx
'use client'

import { useState } from 'react'

interface RoutePreferencesModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (preferences: any) => void
  eventName: string
}

export default function RoutePreferencesModal({ isOpen, onClose, onConfirm, eventName }: RoutePreferencesModalProps) {
  const [preferences, setPreferences] = useState({
    avoidAccidents: true,
    avoidRoadwork: false,
    avoidHeavyTraffic: true,
    avoidTollRoads: false,
    enableTraffic: true
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-xl shadow-2xl border border-slate-700 w-80 overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-white font-semibold">🚗 Get Me There</h3>
          <p className="text-xs text-slate-400 mt-1">to {eventName}</p>
        </div>
        
        <div className="p-4 space-y-3">
          <p className="text-xs text-slate-400 mb-2">What would you like to avoid?</p>
          
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-slate-300">🚗💥 Accidents</span>
            <input 
              type="checkbox" 
              checked={preferences.avoidAccidents}
              onChange={(e) => setPreferences({...preferences, avoidAccidents: e.target.checked})}
              className="w-4 h-4 accent-green-500"
            />
          </label>
          
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-slate-300">🚧 Roadwork</span>
            <input 
              type="checkbox" 
              checked={preferences.avoidRoadwork}
              onChange={(e) => setPreferences({...preferences, avoidRoadwork: e.target.checked})}
              className="w-4 h-4 accent-green-500"
            />
          </label>
          
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-slate-300">🐢 Heavy Traffic</span>
            <input 
              type="checkbox" 
              checked={preferences.avoidHeavyTraffic}
              onChange={(e) => setPreferences({...preferences, avoidHeavyTraffic: e.target.checked})}
              className="w-4 h-4 accent-green-500"
            />
          </label>
          
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-slate-300">💰 Toll Roads</span>
            <input 
              type="checkbox" 
              checked={preferences.avoidTollRoads}
              onChange={(e) => setPreferences({...preferences, avoidTollRoads: e.target.checked})}
              className="w-4 h-4 accent-green-500"
            />
          </label>
          
          <div className="pt-2 border-t border-slate-800">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-slate-300">📡 Use real-time traffic</span>
              <input 
                type="checkbox" 
                checked={preferences.enableTraffic}
                onChange={(e) => setPreferences({...preferences, enableTraffic: e.target.checked})}
                className="w-4 h-4 accent-green-500"
              />
            </label>
          </div>
        </div>
        
        <div className="p-4 flex gap-2 border-t border-slate-700">
          <button 
            onClick={onClose}
            className="flex-1 py-2 rounded-md text-sm bg-slate-800 text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </button>
          <button 
            onClick={() => onConfirm(preferences)}
            className="flex-1 py-2 rounded-md text-sm bg-green-600 text-white hover:bg-green-500"
          >
            Calculate Route
          </button>
        </div>
      </div>
    </div>
  )
}
