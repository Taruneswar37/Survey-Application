import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import api from '../utils/api';
import { toast } from 'sonner';
import { Plus, Trash2, Save } from 'lucide-react';

const CreateSurvey = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState([{
    id: `q_${Date.now()}`,
    type: 'short_answer',
    text: '',
    options: [],
    required: true
  }]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const addQuestion = () => {
    setQuestions([...questions, {
      id: `q_${Date.now()}`,
      type: 'short_answer',
      text: '',
      options: [],
      required: true
    }]);
  };

  const removeQuestion = (index) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    
    // Clear options if changing from multiple_choice to other types
    if (field === 'type' && value !== 'multiple_choice') {
      updated[index].options = [];
    } else if (field === 'type' && value === 'multiple_choice' && updated[index].options.length === 0) {
      updated[index].options = ['', ''];
    }
    
    setQuestions(updated);
  };

  const updateOption = (questionIndex, optionIndex, value) => {
    const updated = [...questions];
    updated[questionIndex].options[optionIndex] = value;
    setQuestions(updated);
  };

  const addOption = (questionIndex) => {
    const updated = [...questions];
    updated[questionIndex].options.push('');
    setQuestions(updated);
  };

  const removeOption = (questionIndex, optionIndex) => {
    const updated = [...questions];
    if (updated[questionIndex].options.length > 2) {
      updated[questionIndex].options.splice(optionIndex, 1);
      setQuestions(updated);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate
    if (!title.trim()) {
      toast.error('Please enter a survey title');
      return;
    }
    
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) {
        toast.error(`Question ${i + 1} is empty`);
        return;
      }
      if (q.type === 'multiple_choice') {
        const validOptions = q.options.filter(opt => opt.trim() !== '');
        if (validOptions.length < 2) {
          toast.error(`Question ${i + 1} needs at least 2 options`);
          return;
        }
        q.options = validOptions;
      }
    }
    
    setLoading(true);
    try {
      await api.post('/surveys', {
        title,
        description: description || null,
        questions
      });
      toast.success('Survey created successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create survey');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto fade-in" data-testid="create-survey-page">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Create Survey</h1>
        <p className="text-muted-foreground">Design your survey with custom questions</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border border-border rounded-md shadow-sm p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Survey Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Customer Satisfaction Survey"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              data-testid="survey-title-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Brief description of your survey"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              data-testid="survey-description-input"
            />
          </div>
        </div>

        <div className="space-y-4">
          {questions.map((question, qIndex) => (
            <div key={question.id} className="bg-white border border-border rounded-md shadow-sm p-6 space-y-4" data-testid={`question-${qIndex}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Question {qIndex + 1}</h3>
                {questions.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeQuestion(qIndex)}
                    className="text-destructive hover:text-destructive"
                    data-testid={`remove-question-${qIndex}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select
                  value={question.type}
                  onValueChange={(value) => updateQuestion(qIndex, 'type', value)}
                >
                  <SelectTrigger data-testid={`question-type-${qIndex}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short_answer">Short Answer</SelectItem>
                    <SelectItem value="long_answer">Long Answer</SelectItem>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Question Text *</Label>
                <Input
                  placeholder="Enter your question"
                  value={question.text}
                  onChange={(e) => updateQuestion(qIndex, 'text', e.target.value)}
                  required
                  data-testid={`question-text-${qIndex}`}
                />
              </div>

              {question.type === 'multiple_choice' && (
                <div className="space-y-2">
                  <Label>Options *</Label>
                  {question.options.map((option, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-2">
                      <Input
                        placeholder={`Option ${oIndex + 1}`}
                        value={option}
                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                        data-testid={`question-${qIndex}-option-${oIndex}`}
                      />
                      {question.options.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(qIndex, oIndex)}
                          data-testid={`remove-option-${qIndex}-${oIndex}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addOption(qIndex)}
                    data-testid={`add-option-${qIndex}`}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Option
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={addQuestion}
          className="w-full"
          data-testid="add-question-button"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Question
        </Button>

        <div className="flex gap-4">
          <Button
            type="submit"
            className="flex-1 btn-primary"
            disabled={loading}
            data-testid="save-survey-button"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Creating...' : 'Create Survey'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/dashboard')}
            data-testid="cancel-button"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateSurvey;