import React, { useState, useEffect } from 'react';
import api from '../../../../core/api';
import { Spinner, TableSkeleton } from '../../../../core/components/Loading/Loading';
import FormBuilder from './FormBuilder';
import FormResponses from './FormResponses';
import './FormsTab.css';

const FormsTab = ({ user }) => {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list', 'create', 'edit', 'responses'
  const [selectedForm, setSelectedForm] = useState(null);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    fetchForms();
    fetchDepartments();
  }, []);

  const fetchForms = async () => {
    try {
      const res = await api.get('/api/rh/admin/forms', {
        headers: { 'x-user-id': user.id }
      });
      setForms(res.data);
    } catch (err) {
      console.error('Erro ao carregar formulários:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/api/admin/departments', {
        headers: { 'x-user-id': user.id }
      });
      setDepartments(res.data);
    } catch (err) {
      console.error('Erro ao carregar departamentos:', err);
    }
  };

  const handleCreateForm = () => {
    setSelectedForm(null);
    setView('create');
  };

  const handleEditForm = async (formId) => {
    try {
      const res = await api.get(`/api/rh/admin/forms/${formId}`, {
        headers: { 'x-user-id': user.id }
      });
      setSelectedForm(res.data);
      setView('edit');
    } catch (err) {
      console.error('Erro ao carregar formulário:', err);
      alert('Erro ao carregar formulário');
    }
  };

  const handleViewResponses = async (formId) => {
    try {
      const res = await api.get(`/api/rh/admin/forms/${formId}`, {
        headers: { 'x-user-id': user.id }
      });
      setSelectedForm(res.data);
      setView('responses');
    } catch (err) {
      console.error('Erro ao carregar formulário:', err);
    }
  };

  const handleToggleActive = async (formId) => {
    try {
      const res = await api.patch(`/api/rh/admin/forms/${formId}/toggle`, {}, {
        headers: { 'x-user-id': user.id }
      });
      setForms(forms.map(f => 
        f.id === formId ? { ...f, is_active: res.data.is_active } : f
      ));
    } catch (err) {
      console.error('Erro ao alterar estado:', err);
    }
  };

  const handleDeleteForm = async (formId) => {
    if (!window.confirm('Tem a certeza que deseja eliminar este formulário? Todas as respostas serão perdidas.')) {
      return;
    }

    try {
      await api.delete(`/api/rh/admin/forms/${formId}`, {
        headers: { 'x-user-id': user.id }
      });
      setForms(forms.filter(f => f.id !== formId));
    } catch (err) {
      console.error('Erro ao eliminar formulário:', err);
      alert('Erro ao eliminar formulário');
    }
  };

  const handleFormSaved = () => {
    fetchForms();
    setView('list');
    setSelectedForm(null);
  };

  const handleBack = () => {
    setView('list');
    setSelectedForm(null);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="forms-tab">
        <div className="forms-header">
          <h2>Gestão de Formulários</h2>
        </div>
        <div className="loading-container">
          <Spinner size="medium" text="A carregar formulários..." />
        </div>
      </div>
    );
  }

  if (view === 'create' || view === 'edit') {
    return (
      <FormBuilder
        user={user}
        form={selectedForm}
        departments={departments}
        onSave={handleFormSaved}
        onCancel={handleBack}
      />
    );
  }

  if (view === 'responses') {
    return (
      <FormResponses
        user={user}
        form={selectedForm}
        onBack={handleBack}
      />
    );
  }

  return (
    <div className="forms-tab">
      <div className="forms-header">
        <h2>Gestão de Formulários</h2>
        <button className="btn-primary" onClick={handleCreateForm}>
          + Novo Formulário
        </button>
      </div>

      {forms.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📋</span>
          <p>Ainda não existem formulários.</p>
          <p className="empty-hint">Crie o primeiro formulário para recolher feedback dos colaboradores.</p>
        </div>
      ) : (
        <div className="forms-list">
          {forms.map((form) => (
            <div key={form.id} className={`form-card ${!form.is_active ? 'inactive' : ''}`}>
              <div className="form-card-header">
                <h3>{form.title}</h3>
                <div className="form-badges">
                  {form.is_anonymous && <span className="badge anonymous">Anónimo</span>}
                  <span className={`badge ${form.is_active ? 'active' : 'inactive'}`}>
                    {form.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>

              {form.description && (
                <p className="form-description">{form.description}</p>
              )}

              <div className="form-meta">
                <span>📅 Criado: {formatDate(form.created_at)}</span>
                {form.expires_at && <span>⏰ Expira: {formatDate(form.expires_at)}</span>}
                <span>📊 Respostas: {form.response_count || 0}</span>
              </div>

              <div className="form-departments">
                <span className="label">Destinatários:</span>
                {form.target_departments?.filter(d => d).length > 0 ? (
                  form.target_departments.filter(d => d).map((dept, i) => (
                    <span key={i} className="dept-tag">{dept}</span>
                  ))
                ) : (
                  <span className="no-dept">Nenhum departamento selecionado</span>
                )}
              </div>

              <div className="form-actions">
                <button 
                  className="btn-secondary"
                  onClick={() => handleViewResponses(form.id)}
                >
                  📊 Ver Respostas
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => handleEditForm(form.id)}
                >
                  ✏️ Editar
                </button>
                <button 
                  className={`btn-toggle ${form.is_active ? 'active' : ''}`}
                  onClick={() => handleToggleActive(form.id)}
                >
                  {form.is_active ? '⏸️ Desativar' : '▶️ Ativar'}
                </button>
                <button 
                  className="btn-danger"
                  onClick={() => handleDeleteForm(form.id)}
                >
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FormsTab;
