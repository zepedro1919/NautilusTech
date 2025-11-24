import React, { useState, useEffect } from 'react';
import api from '../../../api';
import './RoomCalendar.css'; // We will create this next

const RoomCalendar = () => {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [reservations, setReservations] = useState([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(getMonday(new Date()));
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mobileDayIndex, setMobileDayIndex] = useState(0); // 0-4 (Mon-Fri)

  // Handle Resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Helper: Get Monday of the provided date's week
  function getMonday(d) {
    d = new Date(d);
    var day = d.getDay(),
        diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
  }

  // Helper: Format date as YYYY-MM-DD for API
  const formatDate = (date) => date.toISOString().split('T')[0];

  // Helper: Add days to a date
  const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  // 1. Fetch Rooms on Mount
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await api.get('/api/rh/rooms');
        setRooms(res.data);
        if (res.data.length > 0) setSelectedRoom(res.data[0].id); // Select first room by default
      } catch (err) {
        console.error("Error fetching rooms:", err);
      }
    };
    fetchRooms();
  }, []);

  // 2. Fetch Reservations when Room or Week changes
  useEffect(() => {
    if (!selectedRoom) return;

    const fetchReservations = async () => {
      const start = formatDate(currentWeekStart);
      const end = formatDate(addDays(currentWeekStart, 4)); // Friday

      try {
        const res = await api.get(`/api/rh/reservations?roomId=${selectedRoom}&startDate=${start}&endDate=${end}`);
        setReservations(res.data);
      } catch (err) {
        console.error("Error fetching reservations:", err);
      }
    };

    fetchReservations();
  }, [selectedRoom, currentWeekStart]);

  // Navigation Handlers
  const prevWeek = () => setCurrentWeekStart(addDays(currentWeekStart, -7));
  const nextWeek = () => setCurrentWeekStart(addDays(currentWeekStart, 7));

  // Mobile Navigation
  const prevDay = () => {
    if (mobileDayIndex > 0) {
      setMobileDayIndex(mobileDayIndex - 1);
    } else {
      prevWeek();
      setMobileDayIndex(4); // Go to Friday of previous week
    }
  };

  const nextDay = () => {
    if (mobileDayIndex < 4) {
      setMobileDayIndex(mobileDayIndex + 1);
    } else {
      nextWeek();
      setMobileDayIndex(0); // Go to Monday of next week
    }
  };

  // Render Logic
  const weekDays = isMobile 
    ? [addDays(currentWeekStart, mobileDayIndex)] 
    : Array.from({ length: 5 }, (_, i) => addDays(currentWeekStart, i));

  const startHour = 8; // Calendar starts at 8:00
  const endHour = 19;  // Calendar ends at 19:00
  const hourHeight = 60; // 60px per hour

  const getEventStyle = (res) => {
    // Convert "14:30:00" to decimal hours (14.5)
    const [h, m] = res.initial_time.split(':').map(Number);
    const [endH, endM] = res.end_time.split(':').map(Number);
    
    const startDecimal = h + m / 60;
    const endDecimal = endH + endM / 60;
    
    const top = (startDecimal - startHour) * hourHeight;
    const height = (endDecimal - startDecimal) * hourHeight;

    return { top: `${top}px`, height: `${height - 2}px` };
  };

  return (
    <div className="calendar-container">
      {/* Header Controls */}
      <div className="calendar-header">
        <div className="room-selector">
          <label>Sala:</label>
          <select value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)}>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        
        {isMobile ? (
          <div className="week-nav mobile-nav">
            <button onClick={prevDay}>&lt;</button>
            <span>{weekDays[0].toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric' })}</span>
            <button onClick={nextDay}>&gt;</button>
          </div>
        ) : (
          <div className="week-nav">
            <button onClick={prevWeek}>&lt; Anterior</button>
            <span>{formatDate(currentWeekStart)} a {formatDate(addDays(currentWeekStart, 4))}</span>
            <button onClick={nextWeek}>Próxima &gt;</button>
          </div>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="calendar-grid">
        {/* Time Column */}
        <div className="time-column">
          {Array.from({ length: endHour - startHour + 1 }, (_, i) => (
            <div key={i} className="time-label" style={{ height: `${hourHeight}px` }}>
              {startHour + i}:00
            </div>
          ))}
        </div>

        {/* Days Columns */}
        {weekDays.map((day, index) => {
            const dateStr = formatDate(day);
            // Filter reservations for this specific day
            const dayReservations = reservations.filter(r => r.reservation_date.startsWith(dateStr));

            return (
              <div key={index} className="day-column">
                <div className="day-header">
                  {day.toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric' })}
                </div>
                <div className="day-content" style={{ height: `${(endHour - startHour) * hourHeight}px` }}>
                  {/* Render Events */}
                  {dayReservations.map(res => (
                    <div key={res.id} className="calendar-event" style={getEventStyle(res)}>
                      <span className="event-time">{res.initial_time.slice(0,5)} - {res.end_time.slice(0,5)}</span>
                      <span className="event-user">{res.user_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
        })}
      </div>
    </div>
  );
};

export default RoomCalendar;