import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import AdminDashboard from './pages/AdminDashboard';
import OrganizationDashboard from './pages/OrganizationDashboard';
import OrganizationRegistration from './pages/OrganizationRegistration';
import OrganizationLogin from './pages/OrganizationLogin';
import PublicElections from './pages/PublicElections';
import VoterExperience from './pages/VoterExperience';
import ElectionResults from './pages/ElectionResults';
import VoterLogin from './pages/VoterLogin';
import VotingPage from './pages/VotingPage';
import DummyServiceManagement from './pages/DummyServiceManagement';
import Payment from './pages/Payment';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancel from './pages/PaymentCancel';
import EmailVerification from './pages/EmailVerification';


function App() {
    return (
        <AppProvider>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
                <Navbar />
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/SystemAdmin" element={<AdminDashboard />} />
                    <Route path="/org/:id/dashboard" element={<OrganizationDashboard />} />
                    <Route path="/org/payment" element={<Payment />} />
                    <Route path="/org/payment/success" element={<PaymentSuccess />} />
                    <Route path="/org/payment/cancel" element={<PaymentCancel />} />
                    <Route path="/login/org" element={<OrganizationLogin />} />
                    <Route path="/register" element={<OrganizationRegistration />} />
                    <Route path="/verify-email" element={<EmailVerification />} />
                    <Route path="/elections" element={<PublicElections />} />
                    <Route path="/vote/:electionId" element={<VoterLogin />} />
                    <Route path="/vote/:electionId/voting" element={<VotingPage />} />
                    <Route path="/results/:electionId" element={<ElectionResults />} />
                    {/* Admin-only route for testing dummy service */}
                    <Route path="/dummy-service" element={<DummyServiceManagement />} />

                </Routes>
            </div>
        </AppProvider>
    );
}

export default App;
