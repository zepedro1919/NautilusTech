import React, { useState, useEffect } from 'react';
import api from '../../../../core/api';
import { Spinner, TableSkeleton } from '../../../../core/components/Loading/Loading';
import './AdminScreens.css';

const UsersTab = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [credentials, setCredentials] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/admin/users', {
        headers: { 'x-user-id': user.id }
      });
      setUsers(res.data);
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Erro ao carregar utilizadores', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (userToEdit = null) => {
    setCredentials(null);
    setMessage({ text: '', type: '' });
    
    if (userToEdit) {
      setEditingUser(userToEdit);
      setFormData({ name: userToEdit.name, email: userToEdit.email, phone: userToEdit.phone_number || '' });
    } else {
      setEditingUser(null);
      setFormData({ name: '', email: '', phone: '' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({ name: '', email: '', phone: '' });
    setCredentials(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    try {
      if (editingUser) {
        const res = await api.put(`/api/admin/users/${editingUser.id}`, formData, {
          headers: { 'x-user-id': user.id }
        });
        setMessage({ text: res.data.message, type: 'success' });
        fetchUsers();
        setTimeout(() => handleCloseModal(), 1500);
      } else {
        const res = await api.post('/api/admin/users', formData, {
          headers: { 'x-user-id': user.id }
        });
        setMessage({ text: res.data.message, type: 'success' });
        setCredentials(res.data.credentials);
        fetchUsers();
      }
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Erro ao guardar utilizador', type: 'error' });
    }
  };

  const handleDelete = async (userId, userName) => {
    if (!window.confirm(`Tem a certeza que deseja eliminar o utilizador "${userName}"?`)) return;

    try {
      const res = await api.delete(`/api/admin/users/${userId}`, {
        headers: { 'x-user-id': user.id }
      });
      setMessage({ text: res.data.message, type: 'success' });
      fetchUsers();
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Erro ao eliminar utilizador', type: 'error' });
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="admin-tab-container">
      <div className="admin-header">
        <h2>Gestão de Utilizadores</h2>
      </div>
      <Spinner size="medium" text="A carregar utilizadores..." />
    </div>
  );

  return (
    <div>
      <div className="admin-header">
        <h2>Gestão de Utilizadores</h2>
        <button className="add-btn" onClick={() => handleOpenModal()}>
          <span>+</span> Novo Utilizador
        </button>
      </div>

      {message.text && !showModal && (
        <div className={`admin-message ${message.type}`}>{message.text}</div>
      )}

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Pesquisar por nome ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredUsers.length === 0 ? (
        <div className="admin-empty-state"><p>Nenhum utilizador encontrado.</p></div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Telefone</th>
                <th>Departamento</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.phone_number || '-'}</td>
                  <td><span className="badge department">{u.departments}</span></td>
                  <td>
                    <button className="action-btn edit" onClick={() => handleOpenModal(u)}>Editar</button>
                    <button 
                      className="action-btn delete" 
                      onClick={() => handleDelete(u.id, u.name)}
                      disabled={u.id === user.id}
                      title={u.id === user.id ? 'Não pode eliminar a sua própria conta' : ''}
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

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingUser ? 'Editar Utilizador' : 'Novo Utilizador'}</h3>
              <button className="modal-close-btn" onClick={handleCloseModal}>&times;</button>
            </div>

            {message.text && <div className={`admin-message ${message.type}`}>{message.text}</div>}

            {credentials && (
              <div className="credentials-box">
                <h4>Credenciais Geradas</h4>
                <div className="credential-item">
                  <span className="credential-label">Username:</span>
                  <span className="credential-value">{credentials.username}</span>
                </div>
                <div className="credential-item">
                  <span className="credential-label">Password:</span>
                  <span className="credential-value">{credentials.password}</span>
                </div>
                <p className="note">{credentials.note}</p>
              </div>
            )}

            {!credentials && (
              <form className="admin-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Nome <span className="required">*</span></label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome completo"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email <span className="required">*</span></label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Telefone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(opcional)"
                  />
                </div>
                {!editingUser && (
                  <div className="admin-message info">
                    O username e password serão gerados automaticamente e enviados por email ao utilizador.
                  </div>
                )}
                <div className="form-buttons">
                  <button type="button" className="form-btn secondary" onClick={handleCloseModal}>Cancelar</button>
                  <button type="submit" className="form-btn primary">
                    {editingUser ? 'Guardar Alterações' : 'Criar Utilizador'}
                  </button>
                </div>
              </form>
            )}

            {credentials && (
              <div className="form-buttons">
                <button className="form-btn primary" onClick={handleCloseModal}>Fechar</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersTab;
