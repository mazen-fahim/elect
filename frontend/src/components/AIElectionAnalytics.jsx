import React, { useState, useEffect } from 'react';
import { aiAnalyticsApi } from '../services/api';

// Simple function to render basic Markdown formatting
const renderMarkdown = (text) => {
  if (!text) return '';
  
  // Convert **bold** to <strong>
  let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Convert *italic* to <em>
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  return formatted;
};

const AIElectionAnalytics = ({ electionId, organizationId }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analyticsType, setAnalyticsType] = useState(electionId ? 'election' : 'organization');

  useEffect(() => {
    if (electionId || organizationId) {
      fetchAnalytics();
    }
  }, [electionId, organizationId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      let response;
      if (electionId) {
        response = await aiAnalyticsApi.getElectionAnalytics(electionId);
      } else if (organizationId) {
        response = await aiAnalyticsApi.getOrganizationAnalytics();
      }
      
      if (response && response.success) {
        setAnalytics(response.data);
      } else {
        setError('Failed to fetch analytics');
      }
    } catch (err) {
      setError(err.message || 'Error fetching analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-red-600 text-center">
          <p className="font-semibold">Error loading analytics</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  // Render organization analytics
  if (analyticsType === 'organization') {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          AI-Powered Organization Analytics
        </h3>
        
        {/* Organization Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-600 font-medium">Total Elections</p>
            <p className="text-2xl font-bold text-blue-900">{analytics.total_elections}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-600 font-medium">Total Votes</p>
            <p className="text-2xl font-bold text-green-900">{analytics.total_votes}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-purple-600 font-medium">Average Turnout</p>
            <p className="text-2xl font-bold text-purple-900">{analytics.average_turnout}%</p>
          </div>
        </div>

        {/* AI Insights */}
        <div className="mb-6">
          <h4 className="text-md font-semibold text-gray-800 mb-3">AI Insights</h4>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <ul className="space-y-2">
              {analytics.ai_insights.map((insight, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-yellow-600 mr-2">•</span>
                  <span 
                    className="text-gray-700"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(insight) }}
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="mb-6">
          <h4 className="text-md font-semibold text-gray-800 mb-3">AI Recommendations</h4>
          <div className="bg-blue-50 p-4 rounded-lg">
            <ul className="space-y-2">
              {analytics.ai_recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span 
                    className="text-gray-700"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(recommendation) }}
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="mt-6 text-center">
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Refresh Analytics
          </button>
        </div>
      </div>
    );
  }

  // Render election analytics
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        AI-Powered Election Analytics
      </h3>
      
      {/* Basic Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-600 font-medium">Total Voters</p>
          <p className="text-2xl font-bold text-blue-900">{analytics.total_voters}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-green-600 font-medium">Total Votes</p>
          <p className="text-2xl font-bold text-green-900">{analytics.total_votes}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-sm text-purple-600 font-medium">Turnout</p>
          <p className="text-2xl font-bold text-purple-900">{analytics.turnout_percentage}%</p>
        </div>
      </div>

      {/* AI Insights */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-gray-800 mb-3">AI Insights</h4>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <ul className="space-y-2">
            {analytics.ai_insights.map((insight, index) => (
              <li key={index} className="flex items-start">
                <span className="text-yellow-600 mr-2">•</span>
                <span 
                  className="text-gray-700"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(insight) }}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-gray-800 mb-3">AI Recommendations</h4>
        <div className="bg-blue-50 p-4 rounded-lg">
          <ul className="space-y-2">
            {analytics.ai_recommendations.map((recommendation, index) => (
              <li key={index} className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span 
                  className="text-gray-700"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(recommendation) }}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Top Candidates */}
      {analytics.top_candidates && analytics.top_candidates.length > 0 && (
        <div>
          <h4 className="text-md font-semibold text-gray-800 mb-3">Top Candidates</h4>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="space-y-2">
              {analytics.top_candidates.map((candidate, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">{candidate.name}</span>
                  <span className="text-sm text-gray-500">
                    {candidate.party || 'Independent'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className="mt-6 text-center">
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
        >
          Refresh Analytics
        </button>
      </div>
    </div>
  );
};

export default AIElectionAnalytics;


