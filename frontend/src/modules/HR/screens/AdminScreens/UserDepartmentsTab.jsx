import React, { useState, useEffect } from 'react';
import api from '../../../../core/api';
import { Spinner } from '../../../../core/components/Loading/Loading';
import './AdminScreens.css';

const UserDepartmentsTab = ({ user }) => {
  const [assignments, setAssignments] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ userId: '', departmentId: '' });
  const [filterUser, setFilterUser] = useState('');
  const [filterDept, setFilterDept] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [assignmentsRes, usersRes, deptsRes] = await Promise.all([
        api.get('/api/admin/user-departments', { headers: { 'x-user-id': user.id } }),
        api.get('/api/admin/users', { headers: { 'x-user-id': user.id } }),
        api.get('/api/admin/departments', { headers: { 'x-user-id': user.id } })
      ]);
      setAssignments(assignmentsRes.data);
      setUsers(usersRes.data);
      setDepartments(deptsRes.data);
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Erro ao carregar dados', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setMessage({ text: '', type: '' });
    setFormData({ userId: '', departmentId: '' });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({ userId: '', departmentId: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    try {
      const res = await api.post('/api/admin/user-departments', formData, {
        headers: { 'x-user-id': user.id }
      });
      setMessage({ text: res.data.message, type: 'success' });
      fetchData();
      setTimeout(() => handleCloseModal(), 1500);
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Erro ao adicionar atribuição', type: 'error' });
    }
  };

  const handleDelete = async (assignmentId, userName, deptName) => {
    if (!window.confirm(`Remover "${userName}" do departamento "${deptName}"?`)) return;

    try {
      const res = await api.delete(`/api/admin/user-departments/${assignmentId}`, {
        headers: { 'x-user-id': user.id }
      });
      setMessage({ text: res.data.message, type: 'success' });
      fetchData();
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Erro ao remover atribuição', type: 'error' });
    }
  };

  const filteredAssignments = assignments.filter(a => {
    const matchesUser = !filterUser || a.user_id.toString() === filterUser;
    const matchesDept = !filterDept || a.department_id.toString() === filterDept;
    return matchesUser && matchesDept;
  });

  if (loading) return <Spinner text="A carregar atribuições..." />;

  return (
    <div>
      <div className="admin-header">
        <h2>Atribuições de Departamentos</h2>
        <button className="add-btn" onClick={handleOpenModal}>
          <span>+</span> Nova Atribuição
        </button>
      </div>

      {message.text && !showModal && (
        <div className={`admin-message ${message.type}`}>{message.text}</div>
      )}

      <div className="filter-bar">
        <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)}>
          <option value="">Todos os utilizadores</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
          <option value="">Todos os departamentos</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {filteredAssignments.length === 0 ? (
        <div className="admin-empty-state"><p>Nenhuma atribuição encontrada.</p></div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Utilizador</th>
                <th>Email</th>
                <th>Departamento</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssignments.map((a) => (
                <tr key={a.id}>
                  <td>{a.user_name}</td>
                  <td>{a.user_email}</td>
                  <td><span className="badge department">{a.department_name}</span></td>
                  <td>
                    <button 
                      className="action-btn delete" 
                      onClick={() => handleDelete(a.id, a.user_name, a.department_name)}
                    >
                      Remover
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
              <h3>Nova Atribuição</h3>
              <button className="modal-close-btn" onClick={handleCloseModal}>&times;</button>
            </div>

            {message.text && <div className={`admin-message ${message.type}`}>{message.text}</div>}

            <form className="admin-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Utilizador <span className="required">*</span></label>
                <select
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  required
                >
                  <option value="">Selecione um utilizador</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Departamento <span className="required">*</span></label>
                <select
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  required
                >
                  <option value="">Selecione um departamento</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="admin-message info">
                Esta atribuição determinará os chats de grupo e permissões do utilizador.
              </div>
              <div className="form-buttons">
                <button type="button" className="form-btn secondary" onClick={handleCloseModal}>Cancelar</button>
                <button type="submit" className="form-btn primary">Adicionar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDepartmentsTab;
