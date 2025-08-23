import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi, electionApi } from '../services/api';

// Global flag to prevent multiple executions across all component instances
let ELECTION_CREATION_IN_PROGRESS = false;
let ELECTION_ALREADY_CREATED = false;

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const hasExecuted = useRef(false);

  useEffect(() => {
    // Prevent execution if this component instance has already executed
    if (hasExecuted.current) {
      console.log('PaymentSuccess: Component already executed, skipping');
      return;
    }

    // Prevent execution if any other instance is already processing
    if (ELECTION_CREATION_IN_PROGRESS) {
      console.log('PaymentSuccess: Election creation already in progress, skipping');
      return;
    }

    // Prevent execution if election was already created
    if (ELECTION_ALREADY_CREATED) {
      console.log('PaymentSuccess: Election already created, redirecting');
      const orgId = sessionStorage.getItem('orgId');
      if (orgId) {
        navigate(`/org/${orgId}/dashboard`, { replace: true });
      } else {
        navigate('/org/dashboard', { replace: true });
      }
      return;
    }

    // Check session storage for previous creation
    const sessionCreated = sessionStorage.getItem('electionCreated');
    if (sessionCreated) {
      console.log('PaymentSuccess: Session shows election already created, redirecting');
      ELECTION_ALREADY_CREATED = true;
      const orgId = sessionStorage.getItem('orgId');
      if (orgId) {
        navigate(`/org/${orgId}/dashboard`, { replace: true });
      } else {
        navigate('/org/dashboard', { replace: true });
      }
      return;
    }

    // Mark this component as executed and set global flag
    hasExecuted.current = true;
    ELECTION_CREATION_IN_PROGRESS = true;
    sessionStorage.setItem('electionCreated', 'true');

    const createElectionAfterPayment = async () => {
      try {
        console.log('PaymentSuccess: Starting election creation process');
        
        const shouldCreate = localStorage.getItem('afterPaymentCreateElection') === '1';
        const pending = localStorage.getItem('pendingElectionData');
        
        console.log('PaymentSuccess: localStorage check:', {
          shouldCreate,
          pending: !!pending,
          pendingLength: pending ? pending.length : 0
        });
        
        if (!shouldCreate || !pending) {
          console.log('PaymentSuccess: No pending election data, cleaning up and redirecting');
          localStorage.removeItem('afterPaymentCreateElection');
          localStorage.removeItem('plannedVoters');
          localStorage.setItem('orgIsPaid', '1');
          
          const me = await authApi.getCurrentUser();
          const orgId = me?.organization_id ?? me?.id;
          if (orgId) {
            sessionStorage.setItem('orgId', orgId);
            navigate(`/org/${orgId}/dashboard`, { replace: true });
          } else {
            navigate('/org/dashboard', { replace: true });
          }
          return;
        }

        let payload;
        try {
          payload = JSON.parse(pending);
          console.log('PaymentSuccess: JSON parsed successfully');
        } catch (parseError) {
          console.error('PaymentSuccess: Failed to parse pending election data:', parseError);
          console.error('PaymentSuccess: Raw pending data:', pending);
          throw new Error('Failed to parse election data from localStorage');
        }
        
        console.log('PaymentSuccess: Creating election:', { 
          title: payload.title, 
          method: payload.method,
          csvSessionId: payload.csvSessionId,
          candidatesFileName: payload.candidatesFileName,
          votersFileName: payload.votersFileName,
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
            potential_number_of_voters: payload.potential_number_of_voters,
            hasCandidatesBase64: !!payload.candidatesFileBase64,
            hasVotersBase64: !!payload.votersFileBase64,
            candidatesFileName: payload.candidatesFileName,
            votersFileName: payload.votersFileName
          });
          
          // CSV-based creation
          const formData = new FormData();
          formData.append('title', payload.title);
          formData.append('types', payload.types);
          formData.append('starts_at', payload.starts_at);
          formData.append('ends_at', payload.ends_at);
          formData.append('num_of_votes_per_voter', payload.num_of_votes_per_voter);
          formData.append('potential_number_of_voters', payload.potential_number_of_voters);
          
          if (payload.candidatesFileBase64 && payload.votersFileBase64) {
            console.log('PaymentSuccess: Converting base64 data back to files');
            
            try {
              // Convert base64 back to File objects
              const candidatesArrayBuffer = Uint8Array.from(atob(payload.candidatesFileBase64), c => c.charCodeAt(0));
              const votersArrayBuffer = Uint8Array.from(atob(payload.votersFileBase64), c => c.charCodeAt(0));
              
              const candidatesFile = new File([candidatesArrayBuffer], payload.candidatesFileName || 'candidates.csv', { type: 'text/csv' });
              const votersFile = new File([votersArrayBuffer], payload.votersFileName || 'voters.csv', { type: 'text/csv' });
              
              console.log('PaymentSuccess: File objects created from base64:', {
                candidatesFile: candidatesFile.name,
                candidatesFileSize: candidatesFile.size,
                votersFile: votersFile.name,
                votersFileSize: votersFile.size
              });
              
              formData.append('candidates_file', candidatesFile);
              formData.append('voters_file', votersFile);
              
              // Log FormData contents
              console.log('PaymentSuccess: FormData contents:');
              for (let [key, value] of formData.entries()) {
                console.log('PaymentSuccess: FormData key:', key, 'value:', value);
              }
              
              console.log('PaymentSuccess: Calling CSV election API...');
              created = await electionApi.createWithCsv(formData);
              console.log('PaymentSuccess: CSV election API response:', created);
              
            } catch (conversionError) {
              console.error('PaymentSuccess: Error converting base64 to files:', conversionError);
              throw new Error('Failed to convert CSV data back to files');
            }
          } else {
            console.error('PaymentSuccess: Missing base64 CSV data:', {
              candidatesFileBase64: !!payload.candidatesFileBase64,
              votersFileBase64: !!payload.votersFileBase64
            });
            throw new Error('Missing CSV file data');
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
        
        // Mark as created globally
        ELECTION_ALREADY_CREATED = true;
        
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
    <div className="max-w-xl mx-auto bg-white rounded-xl shadow p-6 text-center">
      <h2 className="text-2xl font-bold mb-2">Payment Successful</h2>
      <p className="text-gray-600">
        Your payment has been processed successfully. Creating your election automatically...
      </p>
    </div>
  );
};

export default PaymentSuccess;