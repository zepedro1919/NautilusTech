import React, { useState, useEffect } from 'react';
import api from '../../api';

const RoomReservation = ({ user }) => {
  const [rooms, setRooms] = useState([]);   // Stores the list of rooms
  const [formData, setFormData] = useState({
    date: '',
    startTime: '',
    endTime: '',
    room: ''
  });
  const [loading, setLoading] = useState(false);

  // Fetch rooms when component mounts
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await api.get('/api/rh/rooms');
        setRooms(response.data);
      } catch (err) {
        console.error("Error fetching rooms: ", err);
      }
    };

    fetchRooms();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    
    try {
      const res = await api.post('/api/rh/reservations', {
        userId: user.id,
        roomId: formData.room,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime
      });

      if (res.data.success) {
        alert("Reserva efetuada com sucesso!");
      }

    } catch (error) {
      // 3. Handle the specific conflict error (409 Conflict)
      if (error.response && error.response.status === 409) {
        alert(error.response.data.message);
      } else if (error.response && error.response.data.message) {
        alert(error.response.data.message);
      } else {
        console.error("Error:", error);
        alert("Erro ao conectar ao servidor.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reservation-form-container">
      <h3>Nova Reserva</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Data:</label>
          <input type="date" required onChange={(e) => setFormData({...formData, date: e.target.value})} />
        </div>
        <div className="form-group">
          <label>Sala:</label>
          <select 
            required 
            onChange={(e) => setFormData({...formData, room: e.target.value})}
          >
            <option value="">Selecione uma sala...</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Início:</label>
            <input type="time" required onChange={(e) => setFormData({...formData, startTime: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Fim:</label>
            <input type="time" required onChange={(e) => setFormData({...formData, endTime: e.target.value})} />
          </div>
        </div>
        <button
          type="submit"
          className="btn-primary"
          disabled={loading}
          style={{ opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'A processar...' : 'Confirmar Reserva'}
        </button>
      </form>
    </div>
  );
};

export default RoomReservation;