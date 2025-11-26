import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../../../core/api';
import { Spinner } from '../../../../core/components/Loading/Loading';
import './CalendarTab.css';

const CalendarTab = ({ user }) => {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [reservations, setReservations] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [activeReservation, setActiveReservation] = useState(null);

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      fetchReservations();
    }
  }, [selectedRoom, currentMonth]);

  const fetchRooms = async () => {
    try {
      const res = await api.get('/api/rh/rooms');
      setRooms(res.data);
      if (res.data.length > 0) {
        setSelectedRoom(res.data[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar salas:', err);
    }
  };

  const fetchReservations = async () => {
    if (!selectedRoom) return;

    setLoading(true);
    const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      .toISOString().split('T')[0];
    const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
      .toISOString().split('T')[0];

    try {
      const res = await api.get(`/api/rh/reservations?roomId=${selectedRoom}&startDate=${startDate}&endDate=${endDate}`);
      setReservations(res.data);
    } catch (err) {
      console.error('Erro ao carregar reservas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReservation = async (reservationId) => {
    if (!window.confirm('Tem a certeza que deseja cancelar esta reserva?')) {
      return;
    }

    try {
      await api.delete(`/api/rh/reservations/${reservationId}`);
      setReservations(reservations.filter(r => r.id !== reservationId));
    } catch (err) {
      alert('Erro ao cancelar reserva: ' + (err.response?.data?.message || 'Erro desconhecido'));
    }
  };

  // Memoize calendar days calculation
  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    return days;
  }, [currentMonth]);

  // Memoize reservations indexed by date for O(1) lookup
  const reservationsByDate = useMemo(() => {
    const map = {};
    reservations.forEach(r => {
      const dateKey = r.reservation_date.split('T')[0];
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(r);
    });
    return map;
  }, [reservations]);

  const getReservationsForDay = useCallback((day) => {
    if (!day) return [];
    const dateStr = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      .toISOString().split('T')[0];
    return reservationsByDate[dateStr] || [];
  }, [currentMonth, reservationsByDate]);

  const previousMonth = useCallback(() => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  }, [currentMonth]);

  const nextMonth = useCallback(() => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  }, [currentMonth]);

  const formatTime = useCallback((time) => time.substring(0, 5), []);

  const monthNames = useMemo(() => [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ], []);

  const weekDays = useMemo(() => ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'], []);

  return (
    <div className="calendar-tab">
      <div className="calendar-header">
        <h2>Calendário de Reservas</h2>
        <div className="room-selector">
          <label>Sala:</label>
          <select value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)}>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="calendar-controls">
        <button onClick={previousMonth} className="month-nav-btn">◀</button>
        <h3>{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h3>
        <button onClick={nextMonth} className="month-nav-btn">▶</button>
      </div>

      {loading ? (
        <div className="calendar-loading">
          <Spinner size="medium" text="A carregar reservas..." />
        </div>
      ) : (
        <div className="calendar-grid">
          {weekDays.map((day) => (
            <div key={day} className="calendar-weekday">
              {day}
            </div>
          ))}
          {daysInMonth.map((day, index) => {
            const dayReservations = getReservationsForDay(day);
            return (
              <div key={index} className={`calendar-day ${!day ? 'empty' : ''}`}>
                {day && (
                  <>
                    <div className="day-number">{day}</div>
                    <div className="reservations-list">
                      {dayReservations.map((reservation) => {
                        const isOwner = reservation.user_id === user.id;
                        const isActive = activeReservation === reservation.id;
                        return (
                          <div
                            key={reservation.id}
                            className={`reservation-item ${isOwner ? 'own-reservation' : ''} ${isActive ? 'active' : ''}`}
                            onMouseEnter={() => setActiveReservation(reservation.id)}
                            onMouseLeave={() => setActiveReservation(null)}
                            onClick={() => {
                              // On mobile, toggle active state on click
                              setActiveReservation(isActive ? null : reservation.id);
                            }}
                          >
                            <span className="reservation-time">
                              {formatTime(reservation.initial_time)} - {formatTime(reservation.end_time)}
                            </span>
                            <span className="reservation-user">{reservation.user_name}</span>
                            
                            {/* Tooltip with description - shown on hover/click */}
                            {isActive && (
                              <div className="reservation-tooltip">
                                <div className="tooltip-header">
                                  <strong>{reservation.user_name}</strong>
                                  <span>{formatTime(reservation.initial_time)} - {formatTime(reservation.end_time)}</span>
                                </div>
                                {reservation.description && (
                                  <div className="tooltip-description">
                                    📝 {reservation.description}
                                  </div>
                                )}
                                {isOwner && (
                                  <button
                                    className="tooltip-cancel-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteReservation(reservation.id);
                                    }}
                                  >
                                    Cancelar Reserva
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CalendarTab;
