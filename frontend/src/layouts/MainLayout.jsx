import React from 'react';
import Navbar from '../components/Navbar';

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-radial-gradient">
      {/* Navigation header & bottom bars */}
      <Navbar />
      
      {/* Main content wrapper */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-24 md:py-8 flex flex-col justify-start">
        {children}
      </main>
    </div>
  );
}
