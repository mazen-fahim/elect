import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};

export const AppProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [organizations, setOrganizations] = useState([
        {
            id: 'org1',
            name: 'Democratic Movement',
            email: 'admin@democratic-movement.org',
            phone: '+1-555-0123',
            address: '123 Democracy St, Capital City',
            type: 'Political Party',
            verified: true,
            elections: ['election1', 'election2'],
        },
        {
            id: 'org2',
            name: 'Student Union',
            email: 'president@studentunion.edu',
            phone: '+1-555-0456',
            address: '456 Campus Ave, University Town',
            type: 'Student Organization',
            verified: true,
            elections: ['election3'],
        },
    ]);

    const [elections, setElections] = useState([
        {
            id: 'election1',
            organizationId: 'org1',
            title: 'Presidential Election 2024',
            description: 'Choose the next president of our movement',
            type: 'simple',
            status: 'active',
            startDate: '2024-01-15',
            endDate: '2024-01-30',
            candidates: ['candidate1', 'candidate2', 'candidate3'],
            totalVotes: 1250,
            voterEligibilityUrl: 'https://api.voter-registry.gov/verify',
        },
        {
            id: 'election2',
            organizationId: 'org1',
            title: 'Regional Representatives',
            description: 'Select representatives for each region',
            type: 'district-based',
            status: 'upcoming',
            startDate: '2024-02-01',
            endDate: '2024-02-15',
            candidates: ['candidate4', 'candidate5'],
            totalVotes: 0,
            voterEligibilityUrl: 'https://api.voter-registry.gov/verify',
        },
        {
            id: 'election3',
            organizationId: 'org2',
            title: 'Student Body President',
            description: 'Choose your student representative',
            type: 'simple',
            status: 'completed',
            startDate: '2024-01-01',
            endDate: '2024-01-10',
            candidates: ['candidate6', 'candidate7'],
            totalVotes: 850,
            voterEligibilityUrl: 'https://api.university.edu/students/verify',
        },
    ]);

    const [candidates, setCandidates] = useState([
        {
            id: 'candidate1',
            name: 'Sarah Johnson',
            party: 'Progressive Alliance',
            photo: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=300',
            bio: 'Experienced leader with 15 years in public service',
            votes: 520,
        },
        {
            id: 'candidate2',
            name: 'Michael Chen',
            party: 'Unity Coalition',
            photo: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=300',
            bio: 'Former mayor with strong economic background',
            votes: 480,
        },
        {
            id: 'candidate3',
            name: 'Emma Rodriguez',
            party: 'Reform Party',
            photo: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=300',
            bio: 'Environmental advocate and policy expert',
            votes: 250,
        },
        {
            id: 'candidate4',
            name: 'David Wilson',
            party: 'Progressive Alliance',
            photo: 'https://images.pexels.com/photos/697509/pexels-photo-697509.jpeg?auto=compress&cs=tinysrgb&w=300',
            bio: 'Community organizer and civil rights activist',
            votes: 0,
        },
        {
            id: 'candidate5',
            name: 'Lisa Thompson',
            party: 'Unity Coalition',
            photo: 'https://images.pexels.com/photos/762020/pexels-photo-762020.jpeg?auto=compress&cs=tinysrgb&w=300',
            bio: 'Business leader and education advocate',
            votes: 0,
        },
        {
            id: 'candidate6',
            name: 'Alex Kumar',
            party: 'Student Action',
            photo: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=300',
            bio: 'Senior studying Political Science, former class president',
            votes: 450,
        },
        {
            id: 'candidate7',
            name: 'Jordan Martinez',
            party: 'Campus Unity',
            photo: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=300',
            bio: 'Junior studying Business, student council member',
            votes: 400,
        },
    ]);

    const [votes, setVotes] = useState([]);
    const [notifications, setNotifications] = useState([]);

    // Initialize user state from token on app load
    useEffect(() => {
        const initializeAuth = async () => {
            const token = localStorage.getItem('authToken');
            if (token) {
                try {
                    // Import authApi dynamically to avoid circular dependencies
                    const { authApi } = await import('../services/api');
                    const userInfo = await authApi.getCurrentUser();
                    
                    // Create complete user data
                    const userData = {
                        id: userInfo.id,
                        email: userInfo.email,
                        role: userInfo.role,
                        isActive: userInfo.is_active,
                        organizationId: userInfo.organization_id,
                        organizationName: userInfo.organization_name,
                    };
                    
                    setUser(userData);
                } catch (error) {
                    console.error('Failed to restore user session:', error);
                    // Token is invalid or expired, remove it
                    localStorage.removeItem('authToken');
                }
            }
            setIsLoading(false);
        };

        initializeAuth();
    }, []);

    const login = (userData) => {
        setUser(userData);
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('authToken');
    };

    const addOrganization = (org) => {
        const newOrg = { ...org, id: `org${Date.now()}`, verified: false, elections: [] };
        setOrganizations((prev) => [...prev, newOrg]);
        return newOrg;
    };

    const addElection = (election) => {
        const newElection = { ...election, id: `election${Date.now()}`, totalVotes: 0 };
        setElections((prev) => [...prev, newElection]);
        return newElection;
    };

    const addCandidate = (candidate) => {
        const newCandidate = { ...candidate, id: `candidate${Date.now()}`, votes: 0 };
        setCandidates((prev) => [...prev, newCandidate]);
        return newCandidate;
    };

    const castVote = (electionId, candidateId, voterId) => {
        const existingVote = votes.find((v) => v.electionId === electionId && v.voterId === voterId);
        if (existingVote) {
            return { success: false, message: 'You have already voted in this election' };
        }

        const newVote = {
            id: `vote${Date.now()}`,
            electionId,
            candidateId,
            voterId,
            timestamp: new Date().toISOString(),
        };
        setVotes((prev) => [...prev, newVote]);

        setCandidates((prev) => prev.map((c) => (c.id === candidateId ? { ...c, votes: c.votes + 1 } : c)));

        setElections((prev) => prev.map((e) => (e.id === electionId ? { ...e, totalVotes: e.totalVotes + 1 } : e)));

        return { success: true, message: 'Vote cast successfully' };
    };

    const addNotification = (notification) => {
        const newNotification = {
            id: `notif${Date.now()}`,
            ...notification,
            timestamp: new Date().toISOString(),
        };
        setNotifications((prev) => [newNotification, ...prev]);
    };

    const value = {
        user,
        isLoading,
        organizations,
        elections,
        candidates,
        votes,
        notifications,
        login,
        logout,
        addOrganization,
        addElection,
        addCandidate,
        castVote,
        addNotification,
        setOrganizations,
        setElections,
        setCandidates,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

