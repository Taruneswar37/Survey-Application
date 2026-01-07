import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import api from '../utils/api';
import { toast } from 'sonner';
import { ArrowLeft, Users, Eye } from 'lucide-react';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { initializeSocket, getSocket } from '../utils/socket';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const SurveyResults = () => {
  const { surveyId } = useParams();
  const [analytics, setAnalytics] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveUpdateCount, setLiveUpdateCount] = useState(0);

  const fetchData = async () => {
    try {
      const [analyticsRes, responsesRes] = await Promise.all([
        api.get(`/analytics/${surveyId}`),
        api.get(`/responses/survey/${surveyId}`)
      ]);
      setAnalytics(analyticsRes.data);
      setResponses(responsesRes.data);
    } catch (error) {
      toast.error('Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Initialize WebSocket for real-time updates
    const socket = initializeSocket();
    
    socket.emit('join_survey', { survey_id: surveyId });
    
    socket.on('new_response', (data) => {
      if (data.survey_id === surveyId) {
        setLiveUpdateCount(prev => prev + 1);
        toast.success('New response received!', {
          description: 'Click "Refresh" to see updated results'
        });
      }
    });

    return () => {
      if (socket) {
        socket.off('new_response');
      }
    };
  }, [surveyId]);

  const handleRefresh = () => {
    setLiveUpdateCount(0);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold text-foreground mb-2">No Results Available</h2>
        <p className="text-muted-foreground">Unable to load analytics data</p>
      </div>
    );
  }

  const chartColors = ['#0055FF', '#33CC99', '#FF3333', '#FFCC00', '#9933FF', '#FF6B9D', '#00D9FF'];

  return (
    <div className="space-y-8 fade-in" data-testid="results-page">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-bold text-foreground" data-testid="survey-title">{analytics.survey_title}</h1>
            <p className="text-muted-foreground mt-1">Survey Results & Analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {liveUpdateCount > 0 && (
            <span className="text-sm text-primary font-medium animate-pulse" data-testid="live-update-badge">
              {liveUpdateCount} new response{liveUpdateCount > 1 ? 's' : ''}
            </span>
          )}
          <Button onClick={handleRefresh} variant="outline" data-testid="refresh-button">
            Refresh
          </Button>
          <Link to={`/survey/${surveyId}`} target="_blank">
            <Button variant="outline" data-testid="view-survey-button">
              <Eye className="w-4 h-4 mr-2" />
              View Survey
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-border rounded-md shadow-sm p-6" data-testid="total-responses-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Responses</p>
              <p className="text-3xl font-bold text-foreground" data-testid="total-responses-count">{analytics.total_responses}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-border rounded-md shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-md bg-accent/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Questions</p>
              <p className="text-3xl font-bold text-foreground">{analytics.questions_analytics?.length || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-border rounded-md shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-md bg-green-500/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completion Rate</p>
              <p className="text-3xl font-bold text-foreground">100%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {analytics.questions_analytics?.map((question, index) => (
          <div key={question.question_id} className="bg-white border border-border rounded-md shadow-sm p-6" data-testid={`question-analytics-${index}`}>
            <h3 className="text-xl font-semibold text-foreground mb-4">
              {index + 1}. {question.question_text}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Type: {question.question_type.replace('_', ' ').toUpperCase()} | {question.answers?.length || 0} responses
            </p>

            {question.question_type === 'multiple_choice' && question.answer_distribution && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="chart-container" data-testid={`chart-${index}`}>
                  <Doughnut
                    data={{
                      labels: Object.keys(question.answer_distribution),
                      datasets: [{
                        data: Object.values(question.answer_distribution),
                        backgroundColor: chartColors,
                        borderWidth: 0
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: {
                            padding: 16,
                            font: { size: 12, family: 'Inter' }
                          }
                        }
                      }
                    }}
                  />
                </div>
                <div className="chart-container">
                  <Bar
                    data={{
                      labels: Object.keys(question.answer_distribution),
                      datasets: [{
                        label: 'Responses',
                        data: Object.values(question.answer_distribution),
                        backgroundColor: chartColors[0],
                        borderRadius: 4
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: { stepSize: 1 }
                        }
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {(question.question_type === 'short_answer' || question.question_type === 'long_answer') && (
              <div className="space-y-3" data-testid={`text-answers-${index}`}>
                {question.answers?.slice(0, 10).map((answer, ansIndex) => (
                  <div key={ansIndex} className="p-4 bg-secondary/50 rounded-md border border-border">
                    <p className="text-sm text-foreground">{answer || '(No answer)'}</p>
                  </div>
                ))}
                {question.answers?.length > 10 && (
                  <p className="text-sm text-muted-foreground italic">
                    + {question.answers.length - 10} more responses
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SurveyResults;