import React from 'react';
import { BRAND_NAME } from '../config';

export default function Footer() {
    return (
        <footer className="w-full mt-auto py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="border-t border-slate-200 pt-8 flex flex-col md:flex-row justify-between items-center">
                    <p className="text-xs text-slate-500 mb-4 md:mb-0">
                        &copy; 2026 <span className="font-medium text-slate-700">{BRAND_NAME}</span>. All Rights Reserved.
                    </p>
                    <div className="flex space-x-6 text-xs text-slate-500">
                        <a href="#" className="hover:text-slate-800 transition-colors">Privacy Policy</a>
                        <a href="#" className="hover:text-slate-800 transition-colors">Terms of Service</a>
                        <a href="#" className="hover:text-slate-800 transition-colors">Contact</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
