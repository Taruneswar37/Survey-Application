import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import axios from 'axios';
import { toast } from 'sonner';
import { Send, CheckCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const FillSurvey = () => {
  const { surveyId } = useParams();
  const [survey, setSurvey] = useState(null);
  const [answers, setAnswers] = useState({});
  const [respondentName, setRespondentName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchSurvey = async () => {
      try {
        const response = await axios.get(`${API}/surveys/public/${surveyId}`);
        setSurvey(response.data);
        // Initialize answers
        const initialAnswers = {};
        response.data.questions.forEach(q => {
          initialAnswers[q.id] = '';
        });
        setAnswers(initialAnswers);
      } catch (error) {
        toast.error('Survey not found or inactive');
      } finally {
        setLoading(false);
      }
    };
    fetchSurvey();
  }, [surveyId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required questions
    for (let question of survey.questions) {
      if (question.required && !answers[question.id]) {
        toast.error(`Please answer: ${question.text}`);
        return;
      }
    }
    
    setSubmitting(true);
    try {
      const formattedAnswers = Object.keys(answers).map(questionId => ({
        question_id: questionId,
        answer: answers[questionId]
      }));
      
      await axios.post(`${API}/responses`, {
        survey_id: surveyId,
        answers: formattedAnswers,
        respondent_name: respondentName || null
      });
      
      setSubmitted(true);
      toast.success('Response submitted successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8F9FA]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8F9FA]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Survey Not Found</h2>
          <p className="text-muted-foreground">This survey may have been deleted or is inactive.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8F9FA]">
        <div className="text-center max-w-md fade-in" data-testid="success-message">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-foreground mb-2">Thank You!</h2>
          <p className="text-muted-foreground">Your response has been recorded successfully.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] py-12 px-4">
      <div className="max-w-2xl mx-auto fade-in">
        <div className="bg-white border border-border rounded-md shadow-sm p-8 mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="survey-title">{survey.title}</h1>
          {survey.description && (
            <p className="text-muted-foreground" data-testid="survey-description">{survey.description}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" data-testid="survey-form">
          <div className="bg-white border border-border rounded-md shadow-sm p-6">
            <Label htmlFor="respondentName">Your Name (Optional)</Label>
            <Input
              id="respondentName"
              placeholder="Enter your name"
              value={respondentName}
              onChange={(e) => setRespondentName(e.target.value)}
              className="mt-2"
              data-testid="respondent-name-input"
            />
          </div>

          {survey.questions.map((question, index) => (
            <div key={question.id} className="bg-white border border-border rounded-md shadow-sm p-6 space-y-4" data-testid={`question-${index}`}>
              <Label className="text-base font-semibold">
                {index + 1}. {question.text}
                {question.required && <span className="text-destructive ml-1">*</span>}
              </Label>

              {question.type === 'short_answer' && (
                <Input
                  placeholder="Your answer"
                  value={answers[question.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                  required={question.required}
                  data-testid={`answer-${index}`}
                />
              )}

              {question.type === 'long_answer' && (
                <Textarea
                  placeholder="Your answer"
                  value={answers[question.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                  required={question.required}
                  rows={4}
                  data-testid={`answer-${index}`}
                />
              )}

              {question.type === 'multiple_choice' && (
                <RadioGroup
                  value={answers[question.id] || ''}
                  onValueChange={(value) => setAnswers({ ...answers, [question.id]: value })}
                  required={question.required}
                >
                  {question.options?.map((option, optIndex) => (
                    <div key={optIndex} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`${question.id}-${optIndex}`} data-testid={`answer-${index}-option-${optIndex}`} />
                      <Label htmlFor={`${question.id}-${optIndex}`} className="font-normal cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </div>
          ))}

          <Button
            type="submit"
            className="w-full btn-primary"
            disabled={submitting}
            data-testid="submit-response-button"
          >
            <Send className="w-4 h-4 mr-2" />
            {submitting ? 'Submitting...' : 'Submit Response'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default FillSurvey;