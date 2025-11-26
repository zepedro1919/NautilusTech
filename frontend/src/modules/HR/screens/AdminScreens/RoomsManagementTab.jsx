import React, { useState, useEffect } from 'react';
import api from '../../../../core/api';
import { Spinner } from '../../../../core/components/Loading/Loading';
import './AdminScreens.css';

const RoomsManagementTab = ({ user }) => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [formData, setFormData] = useState({ name: '' });

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/admin/rooms', {
        headers: { 'x-user-id': user.id }
      });
      setRooms(res.data);
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Erro ao carregar salas', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (room = null) => {
    setMessage({ text: '', type: '' });
    if (room) {
      setEditingRoom(room);
      setFormData({ 
        name: room.name
      });
    } else {
      setEditingRoom(null);
      setFormData({ name: '' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRoom(null);
    setFormData({ name: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    const payload = {
      ...formData,
      capacity: formData.capacity ? parseInt(formData.capacity) : null
    };

    try {
      if (editingRoom) {
        const res = await api.put(`/api/admin/rooms/${editingRoom.id}`, payload, {
          headers: { 'x-user-id': user.id }
        });
        setMessage({ text: res.data.message, type: 'success' });
      } else {
        const res = await api.post('/api/admin/rooms', payload, {
          headers: { 'x-user-id': user.id }
        });
        setMessage({ text: res.data.message, type: 'success' });
      }
      fetchRooms();
      setTimeout(() => handleCloseModal(), 1500);
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Erro ao guardar sala', type: 'error' });
    }
  };

  const handleDelete = async (roomId, roomName) => {
    if (!window.confirm(`Tem a certeza que deseja eliminar a sala "${roomName}"?`)) return;

    try {
      const res = await api.delete(`/api/admin/rooms/${roomId}`, {
        headers: { 'x-user-id': user.id }
      });
      setMessage({ text: res.data.message, type: 'success' });
      fetchRooms();
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Erro ao eliminar sala', type: 'error' });
    }
  };

  if (loading) return <Spinner text="A carregar salas..." />;

  return (
    <div>
      <div className="admin-header">
        <h2>Gestão de Salas</h2>
        <button className="add-btn" onClick={() => handleOpenModal()}>
          <span>+</span> Nova Sala
        </button>
      </div>

      {message.text && !showModal && (
        <div className={`admin-message ${message.type}`}>{message.text}</div>
      )}

      {rooms.length === 0 ? (
        <div className="admin-empty-state"><p>Nenhuma sala encontrada.</p></div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id}>
                  <td>{room.name}</td>
                  <td>
                    <button className="action-btn edit" onClick={() => handleOpenModal(room)}>Editar</button>
                    <button className="action-btn delete" onClick={() => handleDelete(room.id, room.name)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingRoom ? 'Editar Sala' : 'Nova Sala'}</h3>
              <button className="modal-close-btn" onClick={handleCloseModal}>&times;</button>
            </div>

            {message.text && <div className={`admin-message ${message.type}`}>{message.text}</div>}

            <form className="admin-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nome <span className="required">*</span></label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome da sala"
                  required
                />
              </div>
              <div className="form-buttons">
                <button type="button" className="form-btn secondary" onClick={handleCloseModal}>Cancelar</button>
                <button type="submit" className="form-btn primary">
                  {editingRoom ? 'Guardar Alterações' : 'Criar Sala'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomsManagementTab;
