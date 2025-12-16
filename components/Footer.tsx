import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 py-8">
      <div className="container mx-auto px-4 text-center">
        <p className="mb-2">Passport Photo AI Helper</p>
        <p className="text-sm">
          &copy; {new Date().getFullYear()} All rights reserved. Not affiliated with any government agency.
        </p>
        <div className="mt-4 flex justify-center gap-4 text-xs">
          <a href="#" className="hover:text-white">Privacy Policy</a>
          <a href="#" className="hover:text-white">Terms of Service</a>
          <a href="#" className="hover:text-white">Contact Support</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;