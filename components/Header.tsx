import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Camera, Home, PenTool } from 'lucide-react';

const Header: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-blue-700 text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <Camera className="w-8 h-8" />
          <span>Passport<span className="text-blue-200">AI</span></span>
        </Link>
        <nav className="flex gap-4 sm:gap-6">
          <Link 
            to="/" 
            className={`flex items-center gap-1 text-sm font-medium transition-colors ${isActive('/') ? 'text-white' : 'text-blue-200 hover:text-white'}`}
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </Link>
          <Link 
            to="/editor" 
            className={`flex items-center gap-1 text-sm font-medium transition-colors ${isActive('/editor') ? 'text-white' : 'text-blue-200 hover:text-white'}`}
          >
            <PenTool className="w-4 h-4" />
            <span className="hidden sm:inline">Create Photo</span>
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;