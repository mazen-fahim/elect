import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';

const SummaryGenerator = ({ election, winner }) => {
    const [summary, setSummary] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const generateSummary = () => {
        setIsGenerating(true);
        setSummary('');

        setTimeout(() => {
            const winnerPercentage =
                election.totalVotes > 0 ? ((winner.votes / election.totalVotes) * 100).toFixed(1) : 0;

            const summaryText = `The ${election.title} has concluded with decisive results. ${winner.name} from ${winner.party} emerged victorious, securing ${winner.votes.toLocaleString()} votes (${winnerPercentage}% of the total). This election saw significant voter participation with ${election.totalVotes.toLocaleString()} total votes cast across all candidates. The victory margin demonstrates ${
                winnerPercentage > 60
                    ? 'strong voter confidence'
                    : winnerPercentage > 50
                      ? 'solid support'
                      : 'a competitive race'
            } in the winning candidate's platform. The election was conducted transparently with secure digital voting processes ensuring the integrity of the democratic process.`;

            setSummary(summaryText);
            setIsGenerating(false);
        }, 3000);
    };

    useEffect(() => {
        if (winner && election.totalVotes > 0) {
            generateSummary();
        }
    }, [winner, election]);

    if (!winner || election.totalVotes === 0) {
        return null;
    }

    return (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl border border-purple-200 p-8 mb-8">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                        <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">AI Election Summary</h2>
                </div>
                <button
                    onClick={generateSummary}
                    disabled={isGenerating}
                    className="flex items-center space-x-2 px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
                >
                    <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                    <span>{isGenerating ? 'Generating...' : 'Regenerate'}</span>
                </button>
            </div>

            {isGenerating ? (
                <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
                </div>
            ) : (
                <p className="text-gray-700 leading-relaxed">{summary}</p>
            )}
        </div>
    );
};

export default SummaryGenerator;

