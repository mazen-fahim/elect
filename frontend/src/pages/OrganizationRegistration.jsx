import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Upload, CreditCard, Shield, Check } from 'lucide-react';

let OrganizationRegistration = () => {
    let { addOrganization } = useApp();
    let navigate = useNavigate();
    let [currentStep, setCurrentStep] = useState(1);
    let [errorMessage, setErrorMessage] = useState('');

    // Form data for organization
    let [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        type: '',
        description: '',
        website: '',
        contactPerson: '',
        documents: null,
    });

    // Form data for payment
    let [paymentData, setPaymentData] = useState({
        cardNumber: '',
        expiryDate: '',
        cvv: '',
        cardName: '',
    });

    let orgTypes = [
        'Political Party',
        'Student Organization',
        'Labor Union',
        'Professional Association',
        'Non-Profit Organization',
        'Community Group',
        'Other',
    ];

    // Handle organization info changes
    let handleInputChange = (e) => {
        let { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setErrorMessage('');
    };

    // Handle payment info changes
    let handlePaymentChange = (e) => {
        let { name, value } = e.target;
        setPaymentData((prev) => ({ ...prev, [name]: value }));
        setErrorMessage('');
    };

    // Handle file upload
    let handleFileUpload = (e) => {
        let file = e.target.files[0];
        setFormData((prev) => ({ ...prev, documents: file }));
        setErrorMessage('');
    };

    // Validation functions
    const validateStep1 = () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^[0-9]{10,15}$/;
        const urlRegex = /^(https?:\/\/)?([\w\d-]+\.)+\w{2,}(\/.+)?$/;

        if (!formData.name || !formData.type || !formData.email || !formData.phone || !formData.address || !formData.contactPerson) {
            setErrorMessage("Please fill in all required fields before continuing.");
            return false;
        }
        if (!emailRegex.test(formData.email)) {
            setErrorMessage("Please enter a valid email address.");
            return false;
        }
        if (!phoneRegex.test(formData.phone)) {
            setErrorMessage("Please enter a valid phone number (10-15 digits).");
            return false;
        }
        if (formData.website && !urlRegex.test(formData.website)) {
            setErrorMessage("Please enter a valid website URL.");
            return false;
        }
        return true;
    };

    const validateStep2 = () => {
        if (!formData.documents) {
            setErrorMessage("Please upload your required documents before continuing.");
            return false;
        }
        return true;
    };

    const validateStep3 = () => {
        const cardNumberRegex = /^[0-9]{13,19}$/;
        const expiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
        const cvvRegex = /^[0-9]{3,4}$/;

        if (!paymentData.cardNumber || !paymentData.expiryDate || !paymentData.cvv || !paymentData.cardName) {
            setErrorMessage("Please fill in all payment fields.");
            return false;
        }
        if (!cardNumberRegex.test(paymentData.cardNumber.replace(/\s/g, ''))) {
            setErrorMessage("Please enter a valid card number.");
            return false;
        }
        if (!expiryRegex.test(paymentData.expiryDate)) {
            setErrorMessage("Please enter a valid expiry date (MM/YY).");
            return false;
        }
        if (!cvvRegex.test(paymentData.cvv)) {
            setErrorMessage("Please enter a valid CVV.");
            return false;
        }
        return true;
    };

    // Go to next step with validation
    let nextStep = () => {
        if (currentStep === 1 && !validateStep1()) return;
        if (currentStep === 2 && !validateStep2()) return;
        setErrorMessage('');
        setCurrentStep(prev => prev + 1);
    };

    // Go to previous step
    let prevStep = () => {
        setErrorMessage('');
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        }
    };

    // Final form submit
    let handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateStep3()) return;

        // Simulate saving to backend
        setTimeout(() => {
            addOrganization(formData);
            navigate('/login/org');
        }, 2000);
    };

    // Step 1: Organization Information
    let renderStep1 = () => (
        <div className="space-y-6">
            <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Organization Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Organization Name *</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Organization Type *</label>
                        <select
                            name="type"
                            value={formData.type}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        >
                            <option value="">Select Type</option>
                            {orgTypes.map((type) => (
                                <option key={type} value={type}>
                                    {type}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                        <input
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Website (Optional)</label>
                        <input
                            type="url"
                            name="website"
                            value={formData.website}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Contact Person *</label>
                        <input
                            type="text"
                            name="contactPerson"
                            value={formData.contactPerson}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            rows="4"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Brief description of your organization..."
                        />
                    </div>
                </div>
            </div>
        </div>
    );

    // Step 2: Documentation
    let renderStep2 = () => (
        <div className="space-y-6">
            <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Documentation</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start space-x-3">
                        <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-medium text-blue-800">Required Documents</h4>
                            <p className="text-sm text-blue-700 mt-1">
                                Please upload official documents to verify your organization's legitimacy.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">
                        Upload registration documents, articles of incorporation, or other official papers
                    </p>
                    <input
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.png"
                        className="hidden"
                        id="document-upload"
                        onChange={handleFileUpload}
                    />
                    <label
                        htmlFor="document-upload"
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 cursor-pointer"
                    >
                        Choose Files
                    </label>
                    {formData.documents && (
                        <p className="text-sm text-green-600 mt-2">✓ {formData.documents.name} uploaded</p>
                    )}
                </div>

                <div className="text-sm text-gray-600">
                    <p className="font-medium mb-2">Accepted file types:</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li>PDF documents (.pdf)</li>
                        <li>Word documents (.doc, .docx)</li>
                        <li>Images (.jpg, .png)</li>
                        <li>Maximum file size: 10MB</li>
                    </ul>
                </div>
            </div>
        </div>
    );

    // Step 3: Payment Information
    let renderStep3 = () => (
        <div className="space-y-6">
             <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Payment Information</h3>

                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 mb-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h4 className="text-lg font-semibold text-gray-900">Registration Fee</h4>
                            <p className="text-gray-600">One-time setup and verification fee</p>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-gray-900">$99</div>
                            <div className="text-sm text-gray-600">USD</div>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center space-x-3 mb-6">
                        <CreditCard className="h-6 w-6 text-gray-400" />
                        <h4 className="text-lg font-medium text-gray-900">Payment Details</h4>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Card Number</label>
                            <input
                                type="text"
                                name="cardNumber"
                                value={paymentData.cardNumber}
                                onChange={handlePaymentChange}
                                placeholder="1234 5678 9012 3456"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                                <input
                                    type="text"
                                    name="expiryDate"
                                    value={paymentData.expiryDate}
                                    onChange={handlePaymentChange}
                                    placeholder="MM/YY"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">CVV</label>
                                <input
                                    type="text"
                                    name="cvv"
                                    value={paymentData.cvv}
                                    onChange={handlePaymentChange}
                                    placeholder="123"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Cardholder Name</label>
                            <input
                                type="text"
                                name="cardName"
                                value={paymentData.cardName}
                                onChange={handlePaymentChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">Register Your Organization</h1>
                    <p className="text-gray-600">Join VoteSecure and start creating secure digital elections</p>
                </div>

                {/* Step indicators */}
                <div className="flex items-center justify-center mb-8">
                    <div className="flex items-center space-x-4">
                        {[1, 2, 3].map((step) => (
                            <div key={step} className="flex items-center">
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                                        currentStep >= step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                                    }`}
                                >
                                    {currentStep > step ? <Check className="h-5 w-5" /> : step}
                                </div>
                                {step < 3 && (
                                    <div
                                        className={`w-16 h-1 mx-2 ${
                                            currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                                        }`}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Form container */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 p-8">
                    {/* Error message box */}
                    {errorMessage && (
                        <div className="mb-6 p-4 bg-red-100 text-red-700 border border-red-300 rounded-lg">
                            {errorMessage}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {currentStep === 1 && renderStep1()}
                        {currentStep === 2 && renderStep2()}
                        {currentStep === 3 && renderStep3()}

                        <div className="flex justify-between mt-8">
                            {currentStep > 1 && (
                                <button
                                    type="button"
                                    onClick={prevStep}
                                    className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors duration-200"
                                >
                                    Previous
                                </button>
                            )}
                            <div className="ml-auto">
                                {currentStep < 3 ? (
                                    <button
                                        type="button"
                                        onClick={nextStep}
                                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                                    >
                                        Next Step
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        className="px-8 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-blue-700 transition-all duration-200"
                                    >
                                        Complete Registration
                                    </button>
                                )}
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default OrganizationRegistration;
