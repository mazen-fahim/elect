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
                    <Route path="/login/org" element={<OrganizationLogin />} />
                    <Route path="/register" element={<OrganizationRegistration />} />
                    <Route path="/elections" element={<PublicElections />} />
                    <Route path="/vote/:electionId" element={<VoterLogin />} />
                    <Route path="/results/:electionId" element={<ElectionResults />} />

                </Routes>
            </div>
        </AppProvider>
    );
}

export default App;
