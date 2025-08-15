import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Shield, Check, AlertCircle } from 'lucide-react';
import CandidateCard from './CandidateCard';
import Modal from './Modal';

let VoterAuthForm = ({ election, onClose }) => {
  let { organizations, candidates, castVote } = useApp();
  let [step, setStep] = useState(1); 
  let [voterId, setVoterId] = useState('');
  let [verificationCode, setVerificationCode] = useState('');
  let [selectedCandidate, setSelectedCandidate] = useState(null);
  let [isVerifying, setIsVerifying] = useState(false);
  let [error, setError] = useState('');
  let [voteResult, setVoteResult] = useState(null);
  let [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'info' });

  let organization = organizations.find(org => org.id === election.organizationId);
  let electionCandidates = candidates.filter(c => election.candidates.includes(c.id));

  // Helper functions for modal
  let showModal = (title, message, type = 'info') => {
    setModalConfig({ isOpen: true, title, message, type });
  };

  let closeModal = () => {
    setModalConfig({ isOpen: false, title: '', message: '', type: 'info' });
  };

  let handleIdSubmit = async (e) => {
    e.preventDefault();
    setIsVerifying(true);
    setError('');

   
    setTimeout(() => {
      if (voterId.length >= 10) { 
        setStep(2);
    
        showModal('Verification Code Sent', `Verification code sent to voter ID: ${voterId}`, 'success');
      } else {
        setError('Invalid National ID. Please check and try again.');
      }
      setIsVerifying(false);
    }, 2000);
  };

  let handleCodeSubmit = (e) => {
    e.preventDefault();
    if (verificationCode === '123456') { 
      setStep(3);
      setError('');
    } else {
      setError('Invalid verification code. Please try again.');
    }
  };

  let handleVoteSubmit = () => {
    if (!selectedCandidate) {
      setError('Please select a candidate to vote for.');
      return;
    }

    let result = castVote(election.id, selectedCandidate.id, voterId);
    setVoteResult(result);
    setStep(4);
  };

  let renderIdEntry = () => (
    <div>
      <div className="text-center mb-6">
        <Shield className="h-12 w-12 text-blue-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Voter Verification</h3>
        <p className="text-gray-600">Enter your National ID to verify eligibility</p>
      </div>

      <form onSubmit={handleIdSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            National ID Number
          </label>
          <input
            type="text"
            value={voterId}
            onChange={(e) => setVoterId(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your National ID"
            required
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isVerifying}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50"
        >
          {isVerifying ? 'Verifying...' : 'Verify ID'}
        </button>
      </form>
    </div>
  );

  let renderCodeEntry = () => (
    <div>
      <div className="text-center mb-6">
        <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Enter Verification Code</h3>
        <p className="text-gray-600">
          We've sent a verification code to your registered contact method
        </p>
      </div>

      <form onSubmit={handleCodeSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Verification Code
          </label>
          <input
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg tracking-widest"
            placeholder="123456"
            maxLength="6"
            required
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        <button
          type="submit"
          className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors duration-200"
        >
          Verify Code
        </button>

        <button
          type="button"
          onClick={() => setStep(1)}
          className="w-full px-4 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors duration-200"
        >
          Back to ID Entry
        </button>
      </form>

      <div className="mt-4 text-center text-sm text-gray-600">
        Demo code: <span className="font-mono font-semibold">123456</span>
      </div>
    </div>
  );

  let renderVoting = () => (
    <div>
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Cast Your Vote</h3>
        <p className="text-gray-600">Select your preferred candidate</p>
      </div>

      <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
        {electionCandidates.map((candidate) => (
          <div
            key={candidate.id}
            onClick={() => setSelectedCandidate(candidate)}
            className={`cursor-pointer transition-all duration-200 ${
              selectedCandidate?.id === candidate.id
                ? 'ring-2 ring-blue-500 bg-blue-50'
                : 'hover:bg-gray-50'
            }`}
          >
            <CandidateCard candidate={candidate} />
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      <div className="flex space-x-4">
        <button
          onClick={handleVoteSubmit}
          className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors duration-200"
        >
          Cast Vote
        </button>
        <button
          onClick={() => setStep(2)}
          className="px-4 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors duration-200"
        >
          Back
        </button>
      </div>
    </div>
  );

  let renderConfirmation = () => (
    <div className="text-center">
      {voteResult?.success ? (
        <>
          <Check className="h-16 w-16 text-green-500 mx-auto mb-6" />
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">Vote Cast Successfully!</h3>
          <p className="text-gray-600 mb-6">
            Thank you for participating in {election.title}. Your vote has been recorded securely.
          </p>
          {selectedCandidate && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-800">
                You voted for: <span className="font-semibold">{selectedCandidate.name}</span>
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">Vote Failed</h3>
          <p className="text-red-600 mb-6">{voteResult?.message}</p>
        </>
      )}
      
      <button
        onClick={onClose}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200"
      >
        Close
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{election.title}</h2>
            <p className="text-sm text-gray-600">{organization?.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {step === 1 && renderIdEntry()}
          {step === 2 && renderCodeEntry()}
          {step === 3 && renderVoting()}
          {step === 4 && renderConfirmation()}
        </div>
      </div>
      
      {/* Modal for notifications */}
      <Modal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        title={modalConfig.title}
        type={modalConfig.type}
      >
        <div className="text-center">
          <p className="text-sm text-gray-600">{modalConfig.message}</p>
        </div>
      </Modal>
    </div>
  );
};

export default VoterAuthForm;