import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import api from '../../../../core/api';
import { Spinner, MessageSkeleton, ListSkeleton } from '../../../../core/components/Loading/Loading';
import './ChatTab.css';

const ChatTab = ({ user }) => {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showGroupsList, setShowGroupsList] = useState(false);
  const [pendingForms, setPendingForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState(null);
  const [formAnswers, setFormAnswers] = useState({});
  const [submittingForm, setSubmittingForm] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const messagesEndRef = useRef(null);
  const isFirstLoad = useRef(true);

  // Track tab visibility to pause polling when hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      fetchMessages();
      fetchPendingForms();
      // Poll for new messages every 5 seconds (only when tab is visible)
      const interval = setInterval(() => {
        if (isTabVisible) fetchMessages();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedGroup, isTabVisible]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const res = await api.get(`/api/rh/chat/groups?userId=${user.id}`);
      setGroups(res.data);
      if (res.data.length > 0) {
        setSelectedGroup(res.data[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar grupos:', err);
    } finally {
      setLoadingGroups(false);
    }
  }, [user.id]);

  const fetchMessages = useCallback(async () => {
    if (!selectedGroup) return;

    // Only show loading skeleton on first load
    if (isFirstLoad.current) {
      setLoadingMessages(true);
    }

    try {
      const res = await api.get(`/api/rh/chat/messages/${selectedGroup}`);
      setMessages(res.data);
      isFirstLoad.current = false;
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, [selectedGroup]);

  const fetchPendingForms = useCallback(async () => {
    if (!selectedGroup) return;
    
    try {
      const res = await api.get(`/api/rh/forms/pending?userId=${user.id}&departmentId=${selectedGroup}`);
      setPendingForms(res.data);
    } catch (err) {
      console.error('Erro ao carregar formulários:', err);
    }
  }, [selectedGroup, user.id]);

  const handleOpenForm = async (formId) => {
    try {
      const res = await api.get(`/api/rh/forms/${formId}?userId=${user.id}`);
      setSelectedForm(res.data);
      setFormAnswers({});
    } catch (err) {
      console.error('Erro ao carregar formulário:', err);
      alert(err.response?.data?.error || 'Erro ao carregar formulário');
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setFormAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleCheckboxChange = (questionId, option, checked) => {
    setFormAnswers(prev => {
      const current = prev[questionId] || [];
      if (checked) {
        return { ...prev, [questionId]: [...current, option] };
      } else {
        return { ...prev, [questionId]: current.filter(o => o !== option) };
      }
    });
  };

  const handleSubmitForm = async () => {
    if (!selectedForm) return;

    // Validate required questions
    for (const q of selectedForm.questions) {
      if (q.is_required) {
        const answer = formAnswers[q.id];
        if (!answer || (Array.isArray(answer) && answer.length === 0)) {
          alert(`A pergunta "${q.question_text}" é obrigatória`);
          return;
        }
      }
    }

    setSubmittingForm(true);
    try {
      const answers = selectedForm.questions.map(q => {
        const value = formAnswers[q.id];
        if (['checkbox'].includes(q.question_type)) {
          return { question_id: q.id, answer_options: value || [] };
        } else if (['radio', 'select'].includes(q.question_type)) {
          return { question_id: q.id, answer_options: value ? [value] : [] };
        } else {
          return { question_id: q.id, answer_text: value || '' };
        }
      });

      await api.post(`/api/rh/forms/${selectedForm.id}/respond`, {
        userId: user.id,
        answers
      });

      alert('Resposta enviada com sucesso!');
      setSelectedForm(null);
      setFormAnswers({});
      fetchPendingForms();
    } catch (err) {
      console.error('Erro ao submeter:', err);
      alert(err.response?.data?.error || 'Erro ao submeter resposta');
    } finally {
      setSubmittingForm(false);
    }
  };

  const parseOptions = (options) => {
    if (!options) return [];
    if (Array.isArray(options)) return options;
    try {
      return JSON.parse(options);
    } catch {
      return [];
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setLoading(true);
    try {
      const res = await api.post('/api/rh/chat/messages', {
        userId: user.id,
        departmentId: selectedGroup,
        message: newMessage
      });
      
      setMessages([...messages, res.data]);
      setNewMessage('');
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      alert('Erro ao enviar mensagem');
    } finally {
      setLoading(false);
    }
  };

  const handleGroupSelect = (groupId) => {
    if (groupId !== selectedGroup) {
      isFirstLoad.current = true; // Reset for new group
      setMessages([]); // Clear messages immediately
    }
    setSelectedGroup(groupId);
    setShowGroupsList(false); // Close mobile dropdown
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTimestamp = useCallback((timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }) + ' ' +
             date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    }
  }, []);

  // Memoize current group to avoid recalculation on every render
  const currentGroup = useMemo(() => {
    return groups.find(g => g.id === selectedGroup);
  }, [groups, selectedGroup]);

  const getGroupName = () => currentGroup?.name || '';

  return (
    <div className="chat-tab">
      {/* Desktop Sidebar */}
      <div className="chat-sidebar">
        <h3>Grupos</h3>
        <div className="groups-list">
          {loadingGroups ? (
            <ListSkeleton count={4} />
          ) : (
            groups.map((group) => (
              <button
                key={group.id}
                className={`group-item ${selectedGroup === group.id ? 'active' : ''}`}
                onClick={() => handleGroupSelect(group.id)}
              >
                <span className="group-icon">
                  {group.type === 'general' ? '🌍' : '👥'}
                </span>
                <span className="group-name">{group.name}</span>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="chat-main">
        {/* Chat Header with Mobile Group Selector */}
        <div className="chat-header">
          <button 
            className="mobile-group-toggle"
            onClick={() => setShowGroupsList(!showGroupsList)}
          >
            <span className="current-group-icon">
              {currentGroup?.type === 'general' ? '🌍' : '👥'}
            </span>
            <span className="current-group-name">{getGroupName()}</span>
            <span className="dropdown-arrow">{showGroupsList ? '▲' : '▼'}</span>
          </button>
          <h2 className="desktop-header">{getGroupName()}</h2>
        </div>

        {/* Mobile Groups Dropdown */}
        {showGroupsList && (
          <div className="mobile-groups-dropdown">
            {groups.map((group) => (
              <button
                key={group.id}
                className={`mobile-group-item ${selectedGroup === group.id ? 'active' : ''}`}
                onClick={() => handleGroupSelect(group.id)}
              >
                <span className="group-icon">
                  {group.type === 'general' ? '🌍' : '👥'}
                </span>
                <span className="group-name">{group.name}</span>
              </button>
            ))}
          </div>
        )}

        <div className="messages-container">
          {/* Pending Forms Alert */}
          {pendingForms.length > 0 && (
            <div className="pending-forms-alert">
              <div className="alert-header">
                <span className="alert-icon">📋</span>
                <span>Tens {pendingForms.length} formulário(s) para responder</span>
              </div>
              <div className="pending-forms-list">
                {pendingForms.map(form => (
                  <div key={form.id} className="pending-form-item">
                    <div className="form-info">
                      <strong>{form.title}</strong>
                      {form.description && <p>{form.description}</p>}
                      {form.expires_at && (
                        <span className="expires">
                          Expira: {new Date(form.expires_at).toLocaleDateString('pt-PT')}
                        </span>
                      )}
                    </div>
                    <button 
                      className="btn-respond"
                      onClick={() => handleOpenForm(form.id)}
                    >
                      Responder
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loadingMessages ? (
            <MessageSkeleton count={5} />
          ) : messages.length === 0 ? (
            <div className="no-messages">
              <span className="no-messages-icon">💬</span>
              <p>Sem mensagens neste grupo.</p>
              <p className="no-messages-hint">Seja o primeiro a enviar uma mensagem!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.user_id === user.id;
              return (
                <div key={msg.id} className={`message ${isOwn ? 'own-message' : ''}`}>
                  <div className="message-header">
                    <span className="message-author">{msg.user_name}</span>
                    <span className="message-time">{formatTimestamp(msg.created_at)}</span>
                  </div>
                  <div className="message-content">{msg.message}</div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="message-input-form">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escreva a sua mensagem..."
            disabled={loading}
            className="message-input"
          />
          <button type="submit" disabled={loading || !newMessage.trim()} className="send-btn">
            {loading ? '...' : '📤'}
          </button>
        </form>
      </div>

      {/* Form Response Modal */}
      {selectedForm && (
        <div className="form-modal-overlay" onClick={() => setSelectedForm(null)}>
          <div className="form-modal" onClick={e => e.stopPropagation()}>
            <div className="form-modal-header">
              <h3>{selectedForm.title}</h3>
              <button className="btn-close" onClick={() => setSelectedForm(null)}>✕</button>
            </div>
            
            {selectedForm.description && (
              <p className="form-modal-description">{selectedForm.description}</p>
            )}
            
            {selectedForm.is_anonymous && (
              <div className="anonymous-notice">
                🔒 As respostas são anónimas
              </div>
            )}

            <div className="form-questions">
              {selectedForm.questions.map((q, idx) => (
                <div key={q.id} className="form-question">
                  <label>
                    {idx + 1}. {q.question_text}
                    {q.is_required && <span className="required">*</span>}
                  </label>

                  {q.question_type === 'text' && (
                    <input
                      type="text"
                      value={formAnswers[q.id] || ''}
                      onChange={e => handleAnswerChange(q.id, e.target.value)}
                      placeholder="A sua resposta..."
                    />
                  )}

                  {q.question_type === 'textarea' && (
                    <textarea
                      value={formAnswers[q.id] || ''}
                      onChange={e => handleAnswerChange(q.id, e.target.value)}
                      placeholder="A sua resposta..."
                      rows={3}
                    />
                  )}

                  {q.question_type === 'radio' && (
                    <div className="options-list">
                      {parseOptions(q.options).map((opt, i) => (
                        <label key={i} className="option-item">
                          <input
                            type="radio"
                            name={`question-${q.id}`}
                            value={opt}
                            checked={formAnswers[q.id] === opt}
                            onChange={e => handleAnswerChange(q.id, e.target.value)}
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  )}

                  {q.question_type === 'checkbox' && (
                    <div className="options-list">
                      {parseOptions(q.options).map((opt, i) => (
                        <label key={i} className="option-item">
                          <input
                            type="checkbox"
                            checked={(formAnswers[q.id] || []).includes(opt)}
                            onChange={e => handleCheckboxChange(q.id, opt, e.target.checked)}
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  )}

                  {q.question_type === 'select' && (
                    <select
                      value={formAnswers[q.id] || ''}
                      onChange={e => handleAnswerChange(q.id, e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      {parseOptions(q.options).map((opt, i) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {q.question_type === 'rating' && (
                    <div className="rating-input">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          className={`star-btn ${(formAnswers[q.id] || 0) >= star ? 'active' : ''}`}
                          onClick={() => handleAnswerChange(q.id, star.toString())}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="form-modal-actions">
              <button 
                className="btn-cancel" 
                onClick={() => setSelectedForm(null)}
              >
                Cancelar
              </button>
              <button 
                className="btn-submit" 
                onClick={handleSubmitForm}
                disabled={submittingForm}
              >
                {submittingForm ? 'A enviar...' : 'Enviar Resposta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatTab;
