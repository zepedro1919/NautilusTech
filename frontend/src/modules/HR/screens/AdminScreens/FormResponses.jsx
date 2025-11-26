import React, { useState, useEffect } from 'react';
import api from '../../../../core/api';

const FormResponses = ({ user, form, onBack }) => {
  const [responses, setResponses] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list', 'summary'

  useEffect(() => {
    if (form?.id) {
      fetchResponses();
    }
  }, [form]);

  const fetchResponses = async () => {
    try {
      const res = await api.get(`/api/rh/admin/forms/${form.id}/responses`, {
        headers: { 'x-user-id': user.id }
      });
      setResponses(res.data.responses || []);
      setQuestions(res.data.questions || form.questions || []);
      setIsAnonymous(res.data.is_anonymous || form.is_anonymous);
    } catch (err) {
      console.error('Erro ao carregar respostas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get(`/api/rh/admin/forms/${form.id}/export`, {
        headers: { 'x-user-id': user.id }
      });
      
      // Convert JSON data to CSV
      const data = res.data.data;
      if (!data || data.length === 0) {
        alert('Não há dados para exportar');
        return;
      }
      
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${form.title.replace(/[^a-z0-9]/gi, '_')}_respostas.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao exportar:', err);
      alert('Erro ao exportar dados');
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAnswerValue = (answer) => {
    if (!answer) return null;
    if (answer.answer_options) {
      const opts = typeof answer.answer_options === 'string' 
        ? JSON.parse(answer.answer_options) 
        : answer.answer_options;
      return Array.isArray(opts) ? opts.join(', ') : opts;
    }
    return answer.answer_text;
  };

  const getQuestionSummary = (questionId) => {
    const question = questions.find(q => q.id === questionId);
    if (!question) return null;

    const answers = responses.flatMap(r => 
      (r.answers || []).filter(a => a.question_id === questionId)
    );

    if (['radio', 'checkbox', 'select'].includes(question.question_type)) {
      const counts = {};
      answers.forEach(a => {
        const value = getAnswerValue(a) || '(sem resposta)';
        counts[value] = (counts[value] || 0) + 1;
      });
      return { type: 'options', data: counts, total: answers.length };
    }

    if (question.question_type === 'rating') {
      const ratings = answers.map(a => parseInt(a.answer_text) || 0).filter(r => r > 0);
      const avg = ratings.length > 0 
        ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
        : 0;
      const distribution = [1, 2, 3, 4, 5].map(r => ({
        rating: r,
        count: ratings.filter(v => v === r).length
      }));
      return { type: 'rating', average: avg, distribution, total: ratings.length };
    }

    return { 
      type: 'text', 
      answers: answers.map(a => a.answer_text).filter(Boolean),
      total: answers.length 
    };
  };

  const renderRatingBar = (count, total) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return (
      <div className="rating-bar">
        <div className="rating-fill" style={{ width: `${percentage}%` }} />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="form-responses">
        <div className="loading">A carregar respostas...</div>
      </div>
    );
  }

  return (
    <div className="form-responses">
      <div className="responses-header">
        <button className="btn-back" onClick={onBack}>← Voltar</button>
        <div className="header-info">
          <h2>{form.title}</h2>
          <span className="response-count">{responses.length} resposta(s)</span>
        </div>
        <div className="header-actions">
          <div className="view-toggle">
            <button 
              className={viewMode === 'list' ? 'active' : ''} 
              onClick={() => setViewMode('list')}
            >
              📋 Lista
            </button>
            <button 
              className={viewMode === 'summary' ? 'active' : ''} 
              onClick={() => setViewMode('summary')}
            >
              📊 Resumo
            </button>
          </div>
          <button 
            className="btn-export" 
            onClick={handleExport}
            disabled={exporting || responses.length === 0}
          >
            {exporting ? 'A exportar...' : '📥 Exportar CSV'}
          </button>
        </div>
      </div>

      {responses.length === 0 ? (
        <div className="empty-responses">
          <span className="empty-icon">📭</span>
          <p>Este formulário ainda não tem respostas.</p>
          {form.is_active ? (
            <p className="hint">As respostas aparecerão aqui quando os colaboradores responderem.</p>
          ) : (
            <p className="hint">O formulário está inativo. Ative-o para receber respostas.</p>
          )}
        </div>
      ) : viewMode === 'summary' ? (
        <div className="summary-view">
          {questions.map((question, idx) => {
            const summary = getQuestionSummary(question.id);
            if (!summary) return null;

            return (
              <div key={question.id} className="question-summary">
                <div className="summary-header">
                  <span className="question-num">Q{idx + 1}</span>
                  <h4>{question.question_text}</h4>
                  <span className="answer-count">{summary.total} resposta(s)</span>
                </div>

                {summary.type === 'rating' && (
                  <div className="rating-summary">
                    <div className="average-rating">
                      <span className="avg-value">{summary.average}</span>
                      <span className="avg-label">média</span>
                      <div className="stars">
                        {[1, 2, 3, 4, 5].map(star => (
                          <span 
                            key={star} 
                            className={star <= Math.round(summary.average) ? 'filled' : ''}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="rating-distribution">
                      {summary.distribution.reverse().map(({ rating, count }) => (
                        <div key={rating} className="rating-row">
                          <span className="rating-label">{rating} ★</span>
                          {renderRatingBar(count, summary.total)}
                          <span className="rating-count">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {summary.type === 'options' && (
                  <div className="options-summary">
                    {Object.entries(summary.data)
                      .sort((a, b) => b[1] - a[1])
                      .map(([option, count]) => (
                        <div key={option} className="option-row">
                          <span className="option-label">{option}</span>
                          <div className="option-bar">
                            <div 
                              className="option-fill" 
                              style={{ width: `${(count / summary.total) * 100}%` }}
                            />
                          </div>
                          <span className="option-count">
                            {count} ({Math.round((count / summary.total) * 100)}%)
                          </span>
                        </div>
                      ))}
                  </div>
                )}

                {summary.type === 'text' && (
                  <div className="text-answers">
                    {summary.answers.slice(0, 5).map((answer, i) => (
                      <div key={i} className="text-answer">
                        "{answer}"
                      </div>
                    ))}
                    {summary.answers.length > 5 && (
                      <p className="more-answers">
                        +{summary.answers.length - 5} resposta(s) adicionais
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="list-view">
          <div className="responses-table">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  {!isAnonymous && <th>Participante</th>}
                  <th>Data</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {responses.map((response, idx) => (
                  <tr key={response.id}>
                    <td>{idx + 1}</td>
                    {!isAnonymous && <td>{response.user_name || 'Anónimo'}</td>}
                    <td>{formatDate(response.submitted_at)}</td>
                    <td>
                      <button 
                        className="btn-view"
                        onClick={() => setSelectedResponse(
                          selectedResponse?.id === response.id ? null : response
                        )}
                      >
                        {selectedResponse?.id === response.id ? 'Fechar' : 'Ver Respostas'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedResponse && (
            <div className="response-detail">
              <div className="detail-header">
                <h4>Respostas de {isAnonymous ? 'Participante Anónimo' : selectedResponse.user_name}</h4>
                <span className="detail-date">{formatDate(selectedResponse.submitted_at)}</span>
              </div>
              <div className="detail-answers">
                {questions.map((question, idx) => {
                  const answer = (selectedResponse.answers || []).find(a => a.question_id === question.id);
                  return (
                    <div key={question.id} className="answer-item">
                      <span className="question-label">Q{idx + 1}: {question.question_text}</span>
                      <span className="answer-value">
                        {getAnswerValue(answer) || <em>Sem resposta</em>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FormResponses;
