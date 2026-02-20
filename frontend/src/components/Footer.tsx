import React from 'react';
import { BRAND_NAME } from '../config';

export default function Footer() {
    return (
        <footer className="w-full mt-auto py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="border-t border-gray-200/50 pt-8 flex flex-col md:flex-row justify-between items-center">
                    <p className="text-xs text-gray-400 mb-4 md:mb-0 font-medium tracking-wide">
                        &copy; 2026 <span className="font-semibold text-gray-600">{BRAND_NAME}</span>. All Rights Reserved.
                    </p>
                    <div className="flex space-x-6 text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
                        <a href="#" className="hover:text-black transition-colors">Privacy Policy</a>
                        <a href="#" className="hover:text-black transition-colors">Terms of Service</a>
                        <a href="#" className="hover:text-black transition-colors">Contact</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
