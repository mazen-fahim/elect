import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi, electionApi } from '../services/api';

// Global state management for CSV election creation
let ELECTION_CREATION_IN_PROGRESS = false;
let ELECTION_ALREADY_CREATED = false;

// Debug function to reset global state (available in console)
window.resetPaymentState = () => {
  ELECTION_CREATION_IN_PROGRESS = false;
  ELECTION_ALREADY_CREATED = false;
  sessionStorage.removeItem('electionCreated');
  sessionStorage.removeItem('createdElections');
  console.log('PaymentSuccess: Global state reset for debugging');
};

// Debug function to clear all payment-related storage
window.clearPaymentStorage = () => {
  localStorage.removeItem('afterPaymentCreateElection');
  localStorage.removeItem('pendingElectionData');
  localStorage.removeItem('plannedVoters');
  sessionStorage.removeItem('electionCreated');
  sessionStorage.removeItem('createdElections');
  sessionStorage.removeItem('orgId');
  ELECTION_CREATION_IN_PROGRESS = false;
  ELECTION_ALREADY_CREATED = false;
  console.log('PaymentSuccess: All payment storage cleared for debugging');
};

// Debug function to show current state
window.showPaymentState = () => {
  console.log('PaymentSuccess: Current state:');
  console.log('  Global flags:', {
    ELECTION_CREATION_IN_PROGRESS,
    ELECTION_ALREADY_CREATED
  });
  console.log('  localStorage:', {
    afterPaymentCreateElection: localStorage.getItem('afterPaymentCreateElection'),
    pendingElectionData: localStorage.getItem('pendingElectionData') ? 'exists' : 'none',
    plannedVoters: localStorage.getItem('plannedVoters')
  });
  console.log('  sessionStorage:', {
    electionCreated: sessionStorage.getItem('electionCreated'),
    createdElections: sessionStorage.getItem('createdElections'),
    orgId: sessionStorage.getItem('orgId')
  });
  
  const createdElections = JSON.parse(sessionStorage.getItem('createdElections') || '[]');
  console.log('  Created elections:', createdElections);
};

// Debug function to test CSV election creation
window.testCsvElectionCreation = async () => {
  console.log('PaymentSuccess: Testing CSV election creation...');
  
  // Create test CSV data with timestamp to make it unique
  const timestamp = Date.now();
  const testCsvData = {
    title: `Test CSV Election ${timestamp}`,
    types: 'simple',
    starts_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    ends_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
    num_of_votes_per_voter: 1,
    potential_number_of_voters: 4,
    method: 'csv',
    candidatesFile: {
      name: 'test_candidates.csv',
      content: `national_id,name,country,party,symbol_name,birth_date,description
12345678901234,Test Candidate 1,Egypt,Test Party,Test Symbol,1973-04-15,Test description
23456789012345,Test Candidate 2,Egypt,Test Party,Test Symbol,1969-09-22,Test description`
    },
    votersFile: {
      name: 'test_voters.csv',
      content: `national_id,phone_number
56789012345678,+201234567890
67890123456789,+201234567891`
    }
  };
  
  // Store test data
  localStorage.setItem('afterPaymentCreateElection', '1');
  localStorage.setItem('pendingElectionData', JSON.stringify(testCsvData));
  
  console.log('PaymentSuccess: Test CSV data stored:', testCsvData.title);
  console.log('PaymentSuccess: Now refresh the page to test');
  console.log('PaymentSuccess: Election ID will be:', generateElectionId(testCsvData));
};

// Function to generate unique election ID for state management
const generateElectionId = (electionData) => {
  return `${electionData.title}_${electionData.starts_at}_${electionData.ends_at}`;
};

// Function to check if specific election was already created
const isElectionAlreadyCreated = (electionId) => {
  const createdElections = JSON.parse(sessionStorage.getItem('createdElections') || '[]');
  return createdElections.includes(electionId);
};

// Function to mark specific election as created
const markElectionAsCreated = (electionId) => {
  const createdElections = JSON.parse(sessionStorage.getItem('createdElections') || '[]');
  if (!createdElections.includes(electionId)) {
    createdElections.push(electionId);
    sessionStorage.setItem('createdElections', JSON.stringify(createdElections));
  }
};

// Debug function to remove specific election from created list
window.removeElectionFromCreated = (electionTitle) => {
  const createdElections = JSON.parse(sessionStorage.getItem('createdElections') || '[]');
  const filtered = createdElections.filter(id => !id.includes(electionTitle));
  sessionStorage.setItem('createdElections', JSON.stringify(filtered));
  console.log(`PaymentSuccess: Removed elections containing "${electionTitle}" from created list`);
  console.log('  Remaining created elections:', filtered);
};

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const hasExecuted = useRef(false);

  useEffect(() => {
    console.log('PaymentSuccess: Component mounted, checking state...');
    console.log('PaymentSuccess: hasExecuted.current:', hasExecuted.current);
    console.log('PaymentSuccess: ELECTION_CREATION_IN_PROGRESS:', ELECTION_CREATION_IN_PROGRESS);
    console.log('PaymentSuccess: ELECTION_ALREADY_CREATED:', ELECTION_ALREADY_CREATED);
    
    // Prevent execution if this component instance has already executed
    if (hasExecuted.current) {
      console.log('PaymentSuccess: Component already executed, skipping');
      return;
    }

    // Check if there's pending election data
    const shouldCreate = localStorage.getItem('afterPaymentCreateElection') === '1';
    const pending = localStorage.getItem('pendingElectionData');
    
    if (!shouldCreate || !pending) {
      console.log('PaymentSuccess: No pending election data, redirecting');
      navigate('/org/dashboard', { replace: true });
      return;
    }

    // Parse the pending election data to get election ID
    let payload;
    try {
      payload = JSON.parse(pending);
    } catch (parseError) {
      console.error('PaymentSuccess: Failed to parse pending election data:', parseError);
      navigate('/org/dashboard', { replace: true });
      return;
    }

    // Generate unique election ID for this specific election
    const electionId = generateElectionId(payload);
    console.log('PaymentSuccess: Election ID:', electionId);

    // Check if this specific election was already created
    if (isElectionAlreadyCreated(electionId)) {
      console.log('PaymentSuccess: This specific election already created, redirecting');
      const orgId = sessionStorage.getItem('orgId');
      if (orgId) {
        navigate(`/org/${orgId}/dashboard`, { replace: true });
      } else {
        navigate('/org/dashboard', { replace: true });
      }
      return;
    }

    // Check if any election creation is in progress
    if (ELECTION_CREATION_IN_PROGRESS) {
      console.log('PaymentSuccess: Election creation already in progress, skipping');
      return;
    }

    // Mark this component as executed and set global flag
    hasExecuted.current = true;
    ELECTION_CREATION_IN_PROGRESS = true;

    const createElectionAfterPayment = async () => {
      try {
        console.log('PaymentSuccess: Starting election creation process for:', electionId);
        
        console.log('PaymentSuccess: Creating election:', { 
          title: payload.title, 
          method: payload.method,
          payloadKeys: Object.keys(payload)
        });
        
        let created = null;
        
        if (payload.method === 'csv') {
          console.log('PaymentSuccess: Processing CSV election creation');
          console.log('PaymentSuccess: CSV payload details:', {
            title: payload.title,
            types: payload.types,
            starts_at: payload.starts_at,
            ends_at: payload.ends_at,
            num_of_votes_per_voter: payload.num_of_votes_per_voter,
            potential_number_of_voters: payload.potential_number_of_voters
          });
          
          // CSV-based creation
          const formData = new FormData();
          formData.append('title', payload.title);
          formData.append('types', payload.types);
          formData.append('starts_at', payload.starts_at);
          formData.append('ends_at', payload.ends_at);
          formData.append('num_of_votes_per_voter', payload.num_of_votes_per_voter);
          formData.append('potential_number_of_voters', payload.potential_number_of_voters);
          
          // Recreate File objects from stored data
          if (payload.candidatesFile && payload.votersFile) {
            try {
              console.log('PaymentSuccess: CSV file data found:', {
                candidatesFile: {
                  name: payload.candidatesFile.name,
                  contentLength: payload.candidatesFile.content?.length || 0
                },
                votersFile: {
                  name: payload.votersFile.name,
                  contentLength: payload.votersFile.content?.length || 0
                }
              });
              
              // Validate CSV content before creating files
              if (!payload.candidatesFile.content || payload.candidatesFile.content.trim().length === 0) {
                throw new Error('Candidates CSV content is empty');
              }
              if (!payload.votersFile.content || payload.votersFile.content.trim().length === 0) {
                throw new Error('Voters CSV content is empty');
              }
              
              // Validate that files have at least a header row and one data row
              const candidatesLines = payload.candidatesFile.content.split('\n').filter(line => line.trim() !== '');
              const votersLines = payload.votersFile.content.split('\n').filter(line => line.trim() !== '');
              
              if (candidatesLines.length < 2) {
                throw new Error('Candidates CSV must have at least a header row and one data row');
              }
              if (votersLines.length < 2) {
                throw new Error('Voters CSV must have at least a header row and one data row');
              }
              
              // Validate CSV headers
              const candidatesHeader = candidatesLines[0].toLowerCase().split(',').map(col => col.trim());
              const votersHeader = votersLines[0].toLowerCase().split(',').map(col => col.trim());
              
              const requiredCandidateColumns = ['national_id', 'name', 'country', 'birth_date'];
              const requiredVoterColumns = ['national_id', 'phone_number'];
              
              const missingCandidateColumns = requiredCandidateColumns.filter(col => !candidatesHeader.includes(col));
              const missingVoterColumns = requiredVoterColumns.filter(col => !votersHeader.includes(col));
              
              if (missingCandidateColumns.length > 0) {
                throw new Error(`Candidates CSV missing required columns: ${missingCandidateColumns.join(', ')}`);
              }
              if (missingVoterColumns.length > 0) {
                throw new Error(`Voters CSV missing required columns: ${missingVoterColumns.join(', ')}`);
              }
              
              console.log('PaymentSuccess: CSV content validation passed:', {
                candidatesLines: candidatesLines.length,
                votersLines: votersLines.length,
                candidatesHeader: candidatesHeader,
                votersHeader: votersHeader
              });
              
              // Debug: Show first few lines of CSV content
              console.log('PaymentSuccess: Candidates CSV content preview:');
              console.log('  Header:', candidatesLines[0]);
              if (candidatesLines.length > 1) {
                console.log('  First data row:', candidatesLines[1]);
              }
              
              console.log('PaymentSuccess: Voters CSV content preview:');
              console.log('  Header:', votersLines[0]);
              if (votersLines.length > 1) {
                console.log('  First data row:', votersLines[1]);
              }
              
              // Convert stored file data back to File objects
              const candidatesFile = new File([payload.candidatesFile.content], payload.candidatesFile.name, { type: 'text/csv' });
              const votersFile = new File([payload.votersFile.content], payload.votersFile.name, { type: 'text/csv' });
              
              console.log('PaymentSuccess: File objects recreated:', {
                candidatesFile: {
                  name: candidatesFile.name,
                  size: candidatesFile.size,
                  type: candidatesFile.type
                },
                votersFile: {
                  name: votersFile.name,
                  size: votersFile.size,
                  type: votersFile.type
                }
              });
              
              formData.append('candidates_file', candidatesFile);
              formData.append('voters_file', votersFile);
              
              // Debug: Log FormData contents
              console.log('PaymentSuccess: FormData contents:');
              for (let [key, value] of formData.entries()) {
                if (value instanceof File) {
                  console.log(`  ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
                } else {
                  console.log(`  ${key}: ${value}`);
                }
              }
              
              console.log('PaymentSuccess: File objects recreated from stored data');
              console.log('PaymentSuccess: Calling CSV election API...');
              created = await electionApi.createWithCsv(formData);
              console.log('PaymentSuccess: CSV election API response:', created);
              
            } catch (fileError) {
              console.error('PaymentSuccess: Error recreating files:', fileError);
              throw new Error('Failed to recreate CSV files for election creation');
            }
          } else {
            console.error('PaymentSuccess: Missing CSV file data');
            throw new Error('Missing CSV file data for election creation');
          }
        } else {
          // API-based creation
          console.log('PaymentSuccess: Calling API election API...');
          created = await electionApi.create({
            title: payload.title,
            types: payload.types,
            starts_at: payload.starts_at,
            ends_at: payload.ends_at,
            num_of_votes_per_voter: payload.num_of_votes_per_voter,
            potential_number_of_voters: payload.potential_number_of_voters,
            method: 'api',
            api_endpoint: payload.api_endpoint,
          });
        }

        console.log('PaymentSuccess: Election created successfully:', created?.id);
        
        // Mark this specific election as created
        markElectionAsCreated(electionId);
        
        // Clean up localStorage
        localStorage.removeItem('afterPaymentCreateElection');
        localStorage.removeItem('pendingElectionData');
        localStorage.removeItem('plannedVoters');
        localStorage.setItem('orgIsPaid', '1');

        // Navigate to dashboard
        const me = await authApi.getCurrentUser();
        const orgId = me?.organization_id ?? me?.id;
        if (orgId) {
          sessionStorage.setItem('orgId', orgId);
          navigate(`/org/${orgId}/dashboard`, { replace: true });
        } else {
          navigate('/org/dashboard', { replace: true });
        }

      } catch (error) {
        console.error('PaymentSuccess: Error creating election:', error);
        
        // Clean up on error
        localStorage.removeItem('afterPaymentCreateElection');
        localStorage.removeItem('pendingElectionData');
        localStorage.removeItem('plannedVoters');
        localStorage.setItem('orgIsPaid', '1');
        
        // Navigate to dashboard anyway
        navigate('/org/dashboard', { replace: true });
      } finally {
        // Reset the global flag
        ELECTION_CREATION_IN_PROGRESS = false;
      }
    };

    // Execute the creation
    createElectionAfterPayment();

  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
        <div className="mb-4">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Payment Successful!</h2>
        <p className="text-gray-600 mb-4">Your payment has been processed successfully.</p>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
        </div>
        <p className="text-sm text-gray-500 mt-4">Creating your election...</p>
      </div>
    </div>
  );
};

export default PaymentSuccess;
