import React, { useState, useEffect } from 'react';
import api from '../../../../core/api';
import { Spinner } from '../../../../core/components/Loading/Loading';
import './AdminScreens.css';

const ReservationsManagementTab = ({ user }) => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [filterRoom, setFilterRoom] = useState('');
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/admin/reservations', {
        headers: { 'x-user-id': user.id }
      });
      setReservations(res.data);
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Erro ao carregar reservas', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (reservationId, roomName, date) => {
    if (!window.confirm(`Tem a certeza que deseja eliminar a reserva da sala "${roomName}" em ${formatDate(date)}?`)) return;

    try {
      const res = await api.delete(`/api/admin/reservations/${reservationId}`, {
        headers: { 'x-user-id': user.id }
      });
      setMessage({ text: res.data.message, type: 'success' });
      fetchReservations();
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Erro ao eliminar reserva', type: 'error' });
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-PT');
  };

  const formatTime = (timeString) => {
    return timeString.substring(0, 5); // Get HH:MM from HH:MM:SS
  };

  // Get unique rooms for filter
  const uniqueRooms = [...new Set(reservations.map(r => r.room_name))];

  const filteredReservations = reservations.filter(r => {
    const matchesRoom = !filterRoom || r.room_name === filterRoom;
    const matchesDate = !filterDate || r.reservation_date.startsWith(filterDate);
    return matchesRoom && matchesDate;
  });

  // Determine if reservation is past
  const isPast = (dateString) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reservationDate = new Date(dateString);
    return reservationDate < today;
  };

  if (loading) return <Spinner text="A carregar reservas..." />;

  return (
    <div>
      <div className="admin-header">
        <h2>Gestão de Reservas</h2>
      </div>

      {message.text && (
        <div className={`admin-message ${message.type}`}>{message.text}</div>
      )}

      <div className="filter-bar">
        <select value={filterRoom} onChange={(e) => setFilterRoom(e.target.value)}>
          <option value="">Todas as salas</option>
          {uniqueRooms.map(room => <option key={room} value={room}>{room}</option>)}
        </select>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          placeholder="Filtrar por data"
        />
        {(filterRoom || filterDate) && (
          <button 
            className="form-btn secondary" 
            onClick={() => { setFilterRoom(''); setFilterDate(''); }}
            style={{ padding: '8px 16px' }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      {filteredReservations.length === 0 ? (
        <div className="admin-empty-state"><p>Nenhuma reserva encontrada.</p></div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Sala</th>
                <th>Data</th>
                <th>Horário</th>
                <th>Reservado por</th>
                <th>Email</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredReservations.map((r) => (
                <tr key={r.id} style={{ opacity: isPast(r.reservation_date) ? 0.6 : 1 }}>
                  <td><span className="badge department">{r.room_name}</span></td>
                  <td>{formatDate(r.reservation_date)}</td>
                  <td>{formatTime(r.initial_time)} - {formatTime(r.end_time)}</td>
                  <td>{r.user_name}</td>
                  <td>{r.user_email}</td>
                  <td>
                    <button 
                      className="action-btn delete" 
                      onClick={() => handleDelete(r.id, r.room_name, r.reservation_date)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="admin-message info" style={{ marginTop: '20px' }}>
        Total de reservas: {filteredReservations.length} | 
        Futuras: {filteredReservations.filter(r => !isPast(r.reservation_date)).length} | 
        Passadas: {filteredReservations.filter(r => isPast(r.reservation_date)).length}
      </div>
    </div>
  );
};

export default ReservationsManagementTab;
