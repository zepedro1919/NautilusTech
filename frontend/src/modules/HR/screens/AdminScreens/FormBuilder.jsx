import React, { useState, useEffect } from 'react';
import api from '../../../../core/api';

const QUESTION_TYPES = [
  { value: 'text', label: 'Texto curto' },
  { value: 'textarea', label: 'Texto longo' },
  { value: 'radio', label: 'Escolha única' },
  { value: 'checkbox', label: 'Escolha múltipla' },
  { value: 'select', label: 'Lista suspensa' },
  { value: 'rating', label: 'Avaliação (1-5)' },
];

const FormBuilder = ({ user, form, departments, onSave, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (form) {
      setTitle(form.title || '');
      setDescription(form.description || '');
      setIsAnonymous(form.is_anonymous || false);
      setExpiresAt(form.expires_at ? form.expires_at.split('T')[0] : '');
      setSelectedDepartments(form.target_departments?.map(d => d.id) || []);
      setQuestions(form.questions?.map(q => ({
        ...q,
        options: q.options || []
      })) || []);
    }
  }, [form]);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: Date.now(),
        question_text: '',
        question_type: 'text',
        options: [],
        is_required: false
      }
    ]);
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    
    // Reset options when changing type to non-option type
    if (field === 'question_type' && !['radio', 'checkbox', 'select'].includes(value)) {
      updated[index].options = [];
    }
    
    setQuestions(updated);
  };

  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const moveQuestion = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= questions.length) return;
    
    const updated = [...questions];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setQuestions(updated);
  };

  const addOption = (questionIndex) => {
    const updated = [...questions];
    updated[questionIndex].options = [...(updated[questionIndex].options || []), ''];
    setQuestions(updated);
  };

  const updateOption = (questionIndex, optionIndex, value) => {
    const updated = [...questions];
    updated[questionIndex].options[optionIndex] = value;
    setQuestions(updated);
  };

  const removeOption = (questionIndex, optionIndex) => {
    const updated = [...questions];
    updated[questionIndex].options = updated[questionIndex].options.filter((_, i) => i !== optionIndex);
    setQuestions(updated);
  };

  const toggleDepartment = (deptId) => {
    if (selectedDepartments.includes(deptId)) {
      setSelectedDepartments(selectedDepartments.filter(id => id !== deptId));
    } else {
      setSelectedDepartments([...selectedDepartments, deptId]);
    }
  };

  const selectAllDepartments = () => {
    setSelectedDepartments(departments.map(d => d.id));
  };

  const clearDepartments = () => {
    setSelectedDepartments([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim()) {
      alert('O título é obrigatório');
      return;
    }
    
    if (questions.length === 0) {
      alert('Adicione pelo menos uma pergunta');
      return;
    }

    if (selectedDepartments.length === 0) {
      alert('Selecione pelo menos um departamento');
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].question_text.trim()) {
        alert(`A pergunta ${i + 1} não pode estar vazia`);
        return;
      }
      if (['radio', 'checkbox', 'select'].includes(questions[i].question_type)) {
        const validOptions = questions[i].options.filter(o => o.trim());
        if (validOptions.length < 2) {
          alert(`A pergunta ${i + 1} precisa de pelo menos 2 opções`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        is_anonymous: isAnonymous,
        expires_at: expiresAt || null,
        department_ids: selectedDepartments,
        questions: questions.map(q => ({
          question_text: q.question_text.trim(),
          question_type: q.question_type,
          options: ['radio', 'checkbox', 'select'].includes(q.question_type) 
            ? q.options.filter(o => o.trim()) 
            : null,
          is_required: q.is_required
        })),
        created_by: user.id
      };

      if (form?.id) {
        await api.put(`/api/rh/admin/forms/${form.id}`, payload, {
          headers: { 'x-user-id': user.id }
        });
      } else {
        await api.post('/api/rh/admin/forms', payload, {
          headers: { 'x-user-id': user.id }
        });
      }

      onSave();
    } catch (err) {
      console.error('Erro ao guardar formulário:', err);
      alert('Erro ao guardar formulário');
    } finally {
      setSaving(false);
    }
  };

  const needsOptions = (type) => ['radio', 'checkbox', 'select'].includes(type);

  return (
    <div className="form-builder">
      <div className="builder-header">
        <button className="btn-back" onClick={onCancel}>← Voltar</button>
        <h2>{form ? 'Editar Formulário' : 'Novo Formulário'}</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="builder-section">
          <h3>Informações Básicas</h3>
          
          <div className="form-group">
            <label>Título *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Inquérito de Satisfação 2025"
              required
            />
          </div>

          <div className="form-group">
            <label>Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descrição do objetivo do formulário..."
              rows={3}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Data de Expiração (opcional)</label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                />
                Respostas anónimas
              </label>
              <span className="hint">Os nomes dos participantes não serão registados</span>
            </div>
          </div>
        </div>

        <div className="builder-section">
          <h3>Departamentos Destinatários *</h3>
          <div className="dept-actions">
            <button type="button" className="btn-small" onClick={selectAllDepartments}>
              Selecionar Todos
            </button>
            <button type="button" className="btn-small" onClick={clearDepartments}>
              Limpar
            </button>
          </div>
          <div className="dept-grid">
            {departments.map((dept) => (
              <label key={dept.id} className={`dept-checkbox ${selectedDepartments.includes(dept.id) ? 'selected' : ''}`}>
                <input
                  type="checkbox"
                  checked={selectedDepartments.includes(dept.id)}
                  onChange={() => toggleDepartment(dept.id)}
                />
                {dept.name}
              </label>
            ))}
          </div>
        </div>

        <div className="builder-section">
          <div className="section-header">
            <h3>Perguntas *</h3>
            <button type="button" className="btn-add" onClick={addQuestion}>
              + Adicionar Pergunta
            </button>
          </div>

          {questions.length === 0 ? (
            <div className="empty-questions">
              <p>Nenhuma pergunta adicionada.</p>
              <p className="hint">Clique em "Adicionar Pergunta" para começar.</p>
            </div>
          ) : (
            <div className="questions-list">
              {questions.map((question, index) => (
                <div key={question.id || index} className="question-card">
                  <div className="question-header">
                    <span className="question-number">Pergunta {index + 1}</span>
                    <div className="question-controls">
                      <button 
                        type="button" 
                        onClick={() => moveQuestion(index, -1)}
                        disabled={index === 0}
                        title="Mover para cima"
                      >
                        ↑
                      </button>
                      <button 
                        type="button" 
                        onClick={() => moveQuestion(index, 1)}
                        disabled={index === questions.length - 1}
                        title="Mover para baixo"
                      >
                        ↓
                      </button>
                      <button 
                        type="button" 
                        className="btn-remove"
                        onClick={() => removeQuestion(index)}
                        title="Remover pergunta"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="question-body">
                    <div className="form-group">
                      <label>Texto da Pergunta</label>
                      <input
                        type="text"
                        value={question.question_text}
                        onChange={(e) => updateQuestion(index, 'question_text', e.target.value)}
                        placeholder="Escreva a sua pergunta..."
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Tipo de Resposta</label>
                        <select
                          value={question.question_type}
                          onChange={(e) => updateQuestion(index, 'question_type', e.target.value)}
                        >
                          {QUESTION_TYPES.map(type => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group checkbox-group">
                        <label>
                          <input
                            type="checkbox"
                            checked={question.is_required}
                            onChange={(e) => updateQuestion(index, 'is_required', e.target.checked)}
                          />
                          Obrigatória
                        </label>
                      </div>
                    </div>

                    {needsOptions(question.question_type) && (
                      <div className="options-section">
                        <label>Opções</label>
                        {(question.options || []).map((option, optIndex) => (
                          <div key={optIndex} className="option-row">
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => updateOption(index, optIndex, e.target.value)}
                              placeholder={`Opção ${optIndex + 1}`}
                            />
                            <button
                              type="button"
                              className="btn-remove-option"
                              onClick={() => removeOption(index, optIndex)}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="btn-add-option"
                          onClick={() => addOption(index)}
                        >
                          + Adicionar Opção
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="builder-actions">
          <button type="button" className="btn-cancel" onClick={onCancel}>
            Cancelar
          </button>
          <button type="submit" className="btn-save" disabled={saving}>
            {saving ? 'A guardar...' : (form ? 'Guardar Alterações' : 'Criar Formulário')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FormBuilder;
