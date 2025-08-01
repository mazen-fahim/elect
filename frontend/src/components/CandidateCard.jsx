import React from 'react';
import { User } from 'lucide-react';

let CandidateCard = ({ candidate, showVotes = false }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200">
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          {candidate.photo ? (
            <img
              src={candidate.photo}
              alt={candidate.name}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-gray-400" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-lg font-semibold text-gray-900 truncate">
            {candidate.name}
          </h4>
          <p className="text-sm text-blue-600 font-medium">
            {candidate.party}
          </p>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {candidate.bio}
          </p>
          {showVotes && (
            <p className="text-sm font-medium text-green-600 mt-2">
              {candidate.votes.toLocaleString()} votes
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CandidateCard;