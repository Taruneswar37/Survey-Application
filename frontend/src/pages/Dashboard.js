import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import api from '../utils/api';
import { toast } from 'sonner';
import { Plus, FileText, BarChart3, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';

const Dashboard = () => {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSurveys = async () => {
    try {
      const response = await api.get('/surveys');
      setSurveys(response.data);
    } catch (error) {
      toast.error('Failed to load surveys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSurveys();
  }, []);

  const handleDelete = async (surveyId) => {
    try {
      await api.delete(`/surveys/${surveyId}`);
      toast.success('Survey deleted successfully');
      fetchSurveys();
    } catch (error) {
      toast.error('Failed to delete survey');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in" data-testid="dashboard-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">My Surveys</h1>
          <p className="text-muted-foreground mt-2">Create and manage your surveys</p>
        </div>
        <Link to="/dashboard/create">
          <Button className="btn-primary" data-testid="create-survey-button">
            <Plus className="w-4 h-4 mr-2" />
            Create Survey
          </Button>
        </Link>
      </div>

      {surveys.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-md border border-border" data-testid="empty-state">
          <img
            src="https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg"
            alt="Team collaborating"
            className="w-64 h-48 object-cover rounded-md mx-auto mb-6"
          />
          <h2 className="text-2xl font-semibold text-foreground mb-2">No surveys yet</h2>
          <p className="text-muted-foreground mb-6">Get started by creating your first survey</p>
          <Link to="/dashboard/create">
            <Button className="btn-primary" data-testid="create-first-survey-button">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Survey
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {surveys.map((survey) => (
            <div
              key={survey.id}
              className="bg-white border border-border rounded-md shadow-sm p-6 hover:shadow-md transition-shadow"
              data-testid={`survey-card-${survey.id}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground mb-2">{survey.title}</h3>
                  {survey.description && (
                    <p className="text-muted-foreground mb-4">{survey.description}</p>
                  )}
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {survey.questions?.length || 0} questions
                    </span>
                    <span className="flex items-center gap-1">
                      <BarChart3 className="w-4 h-4" />
                      {survey.response_count || 0} responses
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link to={`/dashboard/results/${survey.id}`}>
                    <Button variant="outline" size="sm" data-testid={`view-results-${survey.id}`}>
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Results
                    </Button>
                  </Link>
                  <Link to={`/survey/${survey.id}`} target="_blank">
                    <Button variant="outline" size="sm" data-testid={`fill-survey-${survey.id}`}>
                      <FileText className="w-4 h-4 mr-2" />
                      Fill
                    </Button>
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" data-testid={`delete-survey-${survey.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Survey</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this survey? This will also delete all responses. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(survey.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;