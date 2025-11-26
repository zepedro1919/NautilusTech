import React from 'react';
import './RHModule.css';
import ChatTab from '../screens/ChatTab/ChatTab';
import ReservationTab from '../screens/ReservationTab/ReservationTab';
import CalendarTab from '../screens/CalendarTab/CalendarTab';
import SettingsTab from '../screens/SettingsTab/SettingsTab';
import UsersTab from '../screens/AdminScreens/UsersTab';
import DepartmentsTab from '../screens/AdminScreens/DepartmentsTab';
import UserDepartmentsTab from '../screens/AdminScreens/UserDepartmentsTab';
import RoomsManagementTab from '../screens/AdminScreens/RoomsManagementTab';
import ReservationsManagementTab from '../screens/AdminScreens/ReservationsManagementTab';
import FormsTab from '../screens/AdminScreens/FormsTab';

const RHModule = ({ user, activeTab }) => {
  return (
    <div className="rh-module">
      {activeTab === 'chat' && <ChatTab user={user} />}
      {activeTab === 'reservations' && <ReservationTab user={user} />}
      {activeTab === 'calendar' && <CalendarTab user={user} />}
      {activeTab === 'settings' && <SettingsTab user={user} />}
      
      {user.isAdmin && activeTab === 'admin-users' && <UsersTab user={user} />}
      {user.isAdmin && activeTab === 'admin-departments' && <DepartmentsTab user={user} />}
      {user.isAdmin && activeTab === 'admin-assignments' && <UserDepartmentsTab user={user} />}
      {user.isAdmin && activeTab === 'admin-rooms' && <RoomsManagementTab user={user} />}
      {user.isAdmin && activeTab === 'admin-reservations' && <ReservationsManagementTab user={user} />}
      {user.isAdmin && activeTab === 'admin-forms' && <FormsTab user={user} />}
    </div>
  );
};

export default RHModule;
