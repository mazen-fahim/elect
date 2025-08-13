import React from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

const Modal = ({ 
    isOpen, 
    onClose, 
    title, 
    children, 
    type = 'info', 
    showCloseButton = true,
    size = 'sm' 
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircle className="h-5 w-5 text-green-600" />;
            case 'error':
                return <AlertCircle className="h-5 w-5 text-red-600" />;
            case 'warning':
                return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
            default:
                return <Info className="h-5 w-5 text-blue-600" />;
        }
    };

    const getSizeClasses = () => {
        switch (size) {
            case 'sm':
                return 'max-w-sm';
            case 'md':
                return 'max-w-md';
            case 'lg':
                return 'max-w-lg';
            default:
                return 'max-w-sm';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
            <div className={`bg-white rounded-lg shadow-xl w-full ${getSizeClasses()}`}>
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <div className="flex items-center">
                        {getIcon()}
                        <h3 className="ml-2 text-base font-medium text-gray-900">{title}</h3>
                    </div>
                    {showCloseButton && (
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
                
                <div className="p-4">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
