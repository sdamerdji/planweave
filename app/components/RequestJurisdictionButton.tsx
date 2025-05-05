"use client";

import { useState } from "react";
import JurisdictionRequestModal from "./JurisdictionRequestModal";

export const RequestJurisdictionButton = () => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <span className="inline">
        <button 
          onClick={() => setShowModal(true)} 
          className="text-indigo-600 hover:underline ml-1 font-medium"
        >
          Request yours
        </button>
      </span>
      
      {/* Modal rendered outside of paragraph */}
      {showModal && (
        <JurisdictionRequestModal 
          isOpen={true} 
          onClose={() => setShowModal(false)} 
        />
      )}
    </>
  );
};

export default RequestJurisdictionButton; 