import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { LayoutDashboard, Plus, LogOut, BarChart3 } from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-border flex flex-col" data-testid="sidebar">
      <div className="p-6 border-b border-border">
        <h2 className="text-2xl font-bold text-foreground" data-testid="app-logo">SurveyPro</h2>
        <p className="text-sm text-muted-foreground mt-1">{user?.full_name}</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        <Link to="/dashboard">
          <Button
            variant="ghost"
            className={`w-full justify-start ${
              isActive('/dashboard') ? 'bg-secondary/50 text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            } rounded-md px-3 py-2 transition-colors`}
            data-testid="nav-dashboard"
          >
            <LayoutDashboard className="w-4 h-4 mr-3" />
            My Surveys
          </Button>
        </Link>

        <Link to="/dashboard/create">
          <Button
            variant="ghost"
            className={`w-full justify-start ${
              isActive('/dashboard/create') ? 'bg-secondary/50 text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            } rounded-md px-3 py-2 transition-colors`}
            data-testid="nav-create"
          >
            <Plus className="w-4 h-4 mr-3" />
            Create Survey
          </Button>
        </Link>
      </nav>

      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          onClick={logout}
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md px-3 py-2 transition-colors"
          data-testid="logout-button"
        >
          <LogOut className="w-4 h-4 mr-3" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;