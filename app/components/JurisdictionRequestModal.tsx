"use client";

import { X } from "lucide-react";
import { Form } from "./Form";

interface JurisdictionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JurisdictionRequestModal = ({ isOpen, onClose }: JurisdictionRequestModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full relative overflow-hidden animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
          
          <h3 className="text-2xl font-semibold mb-2 text-center">Request Your Jurisdiction</h3>
          <div className="text-gray-600 mb-6 text-center">
            Let us know which jurisdiction you'd like us to add next.
          </div>
          
          <div className="modal-form-wrapper">
            <Form additionalQuestion="Which jurisdiction would you like us to add to our system?" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default JurisdictionRequestModal; 