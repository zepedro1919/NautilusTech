import React, { useState, useEffect } from 'react';
import api from '../../../../core/api';
import { Spinner } from '../../../../core/components/Loading/Loading';
import './ReservationTab.css';

const ReservationTab = ({ user }) => {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setLoadingRooms(true);
    try {
      const res = await api.get('/api/rh/rooms');
      setRooms(res.data);
      if (res.data.length > 0) {
        setSelectedRoom(res.data[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar salas:', err);
      setMessage({ text: 'Erro ao carregar salas', type: 'error' });
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    setLoading(true);

    // Validation
    if (!selectedRoom || !date || !startTime || !endTime) {
      setMessage({ text: 'Por favor, preencha todos os campos', type: 'error' });
      setLoading(false);
      return;
    }

    if (startTime >= endTime) {
      setMessage({ text: 'A hora de início deve ser anterior à hora de fim', type: 'error' });
      setLoading(false);
      return;
    }

    try {
      const res = await api.post('/api/rh/reservations', {
        userId: user.id,
        roomId: selectedRoom,
        date: date,
        startTime: startTime,
        endTime: endTime,
        description: description.trim() || null
      });

      if (res.data.success) {
        setMessage({ text: 'Reserva criada com sucesso!', type: 'success' });
        // Reset form
        setDate('');
        setStartTime('');
        setEndTime('');
        setDescription('');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Erro ao criar reserva';
      setMessage({ text: errorMsg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Get today's date for min attribute
  const today = new Date().toISOString().split('T')[0];

  if (loadingRooms) {
    return (
      <div className="reservation-tab">
        <Spinner size="medium" text="A carregar salas..." />
      </div>
    );
  }

  return (
    <div className="reservation-tab">
      <h2>Reservar Sala</h2>
      <form onSubmit={handleSubmit} className="reservation-form">
        <div className="form-group">
          <label htmlFor="room">Sala:</label>
          <select
            id="room"
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            required
          >
            <option value="">Selecione uma sala</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="date">Data:</label>
          <input
            type="date"
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={today}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="startTime">Hora de Início:</label>
            <input
              type="time"
              id="startTime"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="endTime">Hora de Fim:</label>
            <input
              type="time"
              id="endTime"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="description">Descrição (opcional):</label>
          <input
            type="text"
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={50}
            placeholder="Ex: Reunião de equipa, Entrevista..."
            className="description-input"
          />
          <span className="char-count">{description.length}/50</span>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <button type="submit" disabled={loading} className="submit-btn">
          {loading && <span className="button-spinner"></span>}
          {loading ? 'A processar...' : 'Reservar'}
        </button>
      </form>
    </div>
  );
};

export default ReservationTab;
