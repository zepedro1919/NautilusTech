import React, { useState } from 'react';
import RoomReservation from '../RoomReservation';
import RoomCalendar from '../RoomCalendar/RoomCalendar';
import './RHModule.css'; // Specific styles for RH

const RHModule = ({ user }) => {
  const [activeTab, setActiveTab] = useState('reservation');

  return (
    <div className="rh-container">
      <h2>Gestão de Salas</h2>
      
      <div className="rh-tabs">
        <button 
          className={activeTab === 'reservation' ? 'active' : ''} 
          onClick={() => setActiveTab('reservation')}
        >
          Reservar Sala
        </button>
        <button 
          className={activeTab === 'calendar' ? 'active' : ''} 
          onClick={() => setActiveTab('calendar')}
        >
          Calendário de Ocupação
        </button>
      </div>

      <div className="rh-content">
        {activeTab === 'reservation' ? <RoomReservation user={user} /> : <RoomCalendar />}
      </div>
    </div>
  );
};

export default RHModule;