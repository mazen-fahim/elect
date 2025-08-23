import React from "react";
import { AlertTriangle, X } from "lucide-react";

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, election }) => {
  if (!isOpen || !election) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-red-100 rounded-full">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            Delete Election
          </h3>
          <button
            onClick={onClose}
            className="ml-auto p-1 hover:bg-gray-100 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-gray-700 mb-3">
            Are you sure you want to delete{" "}
            <span className="font-semibold">"{election.title}"</span>?
          </p>

          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
            <p className="font-medium text-gray-700 mb-2">
              This will permanently delete:
            </p>
            <ul className="space-y-1">
              <li>• The election, all candidates and voters associated</li>
              <li>• All voting records and data</li>
              <li>• All related notifications</li>
            </ul>
          </div>

          <p className="text-red-600 text-sm font-medium mt-3">
            This action cannot be undone.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Delete Election
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
