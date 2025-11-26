import React, { useState, useEffect } from 'react';
import api from '../../../../core/api';
import { Spinner } from '../../../../core/components/Loading/Loading';
import './AdminScreens.css';

const DepartmentsTab = ({ user }) => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [formData, setFormData] = useState({ name: '' });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/admin/departments', {
        headers: { 'x-user-id': user.id }
      });
      setDepartments(res.data);
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Erro ao carregar departamentos', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (dept = null) => {
    setMessage({ text: '' });
    if (dept) {
      setEditingDept(dept);
      setFormData({ name: dept.name });
    } else {
      setEditingDept(null);
      setFormData({ name: '' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDept(null);
    setFormData({ name: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    try {
      if (editingDept) {
        const res = await api.put(`/api/admin/departments/${editingDept.id}`, formData, {
          headers: { 'x-user-id': user.id }
        });
        setMessage({ text: res.data.message, type: 'success' });
      } else {
        const res = await api.post('/api/admin/departments', formData, {
          headers: { 'x-user-id': user.id }
        });
        setMessage({ text: res.data.message, type: 'success' });
      }
      fetchDepartments();
      setTimeout(() => handleCloseModal(), 1500);
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Erro ao guardar departamento', type: 'error' });
    }
  };

  const handleDelete = async (deptId, deptName) => {
    if (!window.confirm(`Tem a certeza que deseja eliminar o departamento "${deptName}"?`)) return;

    try {
      const res = await api.delete(`/api/admin/departments/${deptId}`, {
        headers: { 'x-user-id': user.id }
      });
      setMessage({ text: res.data.message, type: 'success' });
      fetchDepartments();
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Erro ao eliminar departamento', type: 'error' });
    }
  };

  if (loading) return <Spinner text="A carregar departamentos..." />;

  return (
    <div>
      <div className="admin-header">
        <h2>Gestão de Departamentos</h2>
        <button className="add-btn" onClick={() => handleOpenModal()}>
          <span>+</span> Novo Departamento
        </button>
      </div>

      {message.text && !showModal && (
        <div className={`admin-message ${message.type}`}>{message.text}</div>
      )}

      {departments.length === 0 ? (
        <div className="admin-empty-state"><p>Nenhum departamento encontrado.</p></div>
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
              {departments.map((dept) => (
                <tr key={dept.id}>
                  <td>{dept.name}</td>
                  <td>
                    <button className="action-btn edit" onClick={() => handleOpenModal(dept)}>Editar</button>
                    <button className="action-btn delete" onClick={() => handleDelete(dept.id, dept.name)}>Eliminar</button>
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
              <h3>{editingDept ? 'Editar Departamento' : 'Novo Departamento'}</h3>
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
                  placeholder="Nome do departamento"
                  required
                />
              </div>
              <div className="form-buttons">
                <button type="button" className="form-btn secondary" onClick={handleCloseModal}>Cancelar</button>
                <button type="submit" className="form-btn primary">
                  {editingDept ? 'Guardar Alterações' : 'Criar Departamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentsTab;
