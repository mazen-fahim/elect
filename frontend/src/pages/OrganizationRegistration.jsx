import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Upload, Check } from 'lucide-react';

let OrganizationRegistration = () => {
    let { addOrganization } = useApp();
    let navigate = useNavigate();
    let [errorMessage, setErrorMessage] = useState('');
    let [dataSource, setDataSource] = useState('api'); // 'api' or 'csv'

    // Form data for organization
    let [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        country: '',
        apiEndpoint: '',
        csvFile: null,
        address: '',
        description: '',
    });

    const countries = [
        "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", 
        "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
        "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus",
        "Belgium", "Belize", "Benin", "Bhutan", "Bolivia",
        "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria",
        "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada",
        "Cape Verde", "Central African Republic", "Chad", "Chile", "China",
        "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia",
        "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti",
        "Dominica", "Dominican Republic", "East Timor", "Ecuador", "Egypt",
        "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Ethiopia",
        "Fiji", "Finland", "France", "Gabon", "Gambia",
        "Georgia", "Germany", "Ghana", "Greece", "Grenada",
        "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti",
        "Honduras", "Hungary", "Iceland", "India", "Indonesia",
        "Iran", "Iraq", "Ireland", "Israel", "Italy",
        "Ivory Coast", "Jamaica", "Japan", "Jordan", "Kazakhstan",
        "Kenya", "Kiribati", "North Korea", "South Korea", "Kosovo",
        "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon",
        "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania",
        "Luxembourg", "Macedonia", "Madagascar", "Malawi", "Malaysia",
        "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania",
        "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco",
        "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
        "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand",
        "Nicaragua", "Niger", "Nigeria", "Norway", "Oman",
        "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea",
        "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
        "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis",
        "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino",
        "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles",
        "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands",
        "Somalia", "South Africa", "South Sudan", "Spain", "Sri Lanka",
        "Sudan", "Suriname", "Swaziland", "Sweden", "Switzerland",
        "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand",
        "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey",
        "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates",
        "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu",
        "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia",
        "Zimbabwe"
    ];

    // Handle organization info changes
    let handleInputChange = (e) => {
        let { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setErrorMessage('');
    };

    // Handle file upload
    let handleFileUpload = (e) => {
        let file = e.target.files[0];
        setFormData((prev) => ({ ...prev, csvFile: file }));
        setErrorMessage('');
    };

    // Validation function
    const validateForm = () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword || !formData.country) {
            setErrorMessage("Please fill in all required fields.");
            return false;
        }
        
        if (!emailRegex.test(formData.email)) {
            setErrorMessage("Please enter a valid email address.");
            return false;
        }
        
        if (formData.password.length < 8) {
            setErrorMessage("Password must be at least 8 characters long.");
            return false;
        }
        
        if (formData.password !== formData.confirmPassword) {
            setErrorMessage("Passwords do not match.");
            return false;
        }
        
        return true;
    };

    // Form submit
    let handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        // Simulate saving to backend
        setTimeout(() => {
            addOrganization(formData);
            navigate('/login/org');
        }, 1000);
    };

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">Register Your Organization</h1>
                    <p className="text-gray-600">Join our platform and start managing your elections</p>
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
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-4">Organization Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
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
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Country *</label>
                                        <select
                                            name="country"
                                            value={formData.country}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        >
                                            <option value="">Select Country</option>
                                            {countries.map((country) => (
                                                <option key={country} value={country}>
                                                    {country}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                                        <input
                                            type="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password *</label>
                                        <input
                                            type="password"
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                    
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                                        <input
                                            type="text"
                                            name="address"
                                            value={formData.address}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                    
                                    <div className="md:col-span-2">
                                        <h4 className="text-sm font-medium text-gray-700 mb-2">Data Source (Optional)</h4>
                                        <div className="flex space-x-4 mb-4">
                                            <button
                                                type="button"
                                                onClick={() => setDataSource('api')}
                                                className={`px-4 py-2 rounded-lg font-medium ${
                                                    dataSource === 'api' 
                                                        ? 'bg-blue-600 text-white' 
                                                        : 'bg-gray-200 text-gray-700'
                                                }`}
                                            >
                                                API Endpoint
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDataSource('csv')}
                                                className={`px-4 py-2 rounded-lg font-medium ${
                                                    dataSource === 'csv' 
                                                        ? 'bg-blue-600 text-white' 
                                                        : 'bg-gray-200 text-gray-700'
                                                }`}
                                            >
                                                CSV File
                                            </button>
                                        </div>
                                        
                                        {dataSource === 'api' ? (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">API Endpoint</label>
                                                <input
                                                    type="url"
                                                    name="apiEndpoint"
                                                    value={formData.apiEndpoint}
                                                    onChange={handleInputChange}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="https://api.example.com/data"
                                                />
                                            </div>
                                        ) : (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">CSV File</label>
                                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                                                    <input
                                                        type="file"
                                                        accept=".csv"
                                                        className="hidden"
                                                        id="csv-upload"
                                                        onChange={handleFileUpload}
                                                    />
                                                    <label
                                                        htmlFor="csv-upload"
                                                        className="block text-center cursor-pointer"
                                                    >
                                                        {formData.csvFile ? (
                                                            <p className="text-green-600">✓ {formData.csvFile.name} uploaded</p>
                                                        ) : (
                                                            <>
                                                                <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                                                                <p className="text-gray-600">Click to upload CSV file</p>
                                                            </>
                                                        )}
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end mt-8">
                            <button
                                type="submit"
                                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                            >
                                Register Organization
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default OrganizationRegistration;