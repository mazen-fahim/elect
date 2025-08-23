"""
AI Analytics Service for Election Intelligence
Provides RAG-based insights and analytics for elections using Google Gemini API
"""

import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import httpx
import json
import os

logger = logging.getLogger(__name__)

@dataclass
class ElectionAnalytics:
    """Simple analytics data structure"""
    election_id: int
    total_voters: int
    total_votes: int
    turnout_percentage: float
    top_candidates: List[Dict[str, Any]]
    insights: List[str]
    recommendations: List[str]

class SimpleRAGService:
    """Simple RAG service using Google Gemini API"""
    
    def __init__(self):
        # Get Gemini API key from environment
        self.gemini_api_key = os.getenv('GEMINI_API_KEY')
        logger.info(f"Gemini API key loaded: {'Yes' if self.gemini_api_key else 'No'}")
        if self.gemini_api_key:
            logger.info(f"API key starts with: {self.gemini_api_key[:10]}...")
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent"
    
    async def get_election_analytics(self, election_data: Dict[str, Any]) -> ElectionAnalytics:
        """Get AI-powered analytics for an election using Gemini API"""
        try:
            # Prepare context for AI
            context = self._prepare_election_context(election_data)
            
            # Get AI insights using Gemini API
            insights = await self._get_ai_insights(context)
            
            # Get AI recommendations
            recommendations = await self._get_ai_recommendations(context)
            
            return ElectionAnalytics(
                election_id=election_data.get('id'),
                total_voters=election_data.get('total_voters', 0),
                total_votes=election_data.get('total_votes', 0),
                turnout_percentage=self._calculate_turnout(
                    election_data.get('total_votes', 0),
                    election_data.get('total_voters', 0)
                ),
                top_candidates=election_data.get('candidates', [])[:3],
                insights=insights,
                recommendations=recommendations
            )
        except Exception as e:
            logger.error(f"Error getting election analytics: {str(e)}")
            return self._get_fallback_analytics(election_data)
    
    def _prepare_election_context(self, election_data: Dict[str, Any]) -> str:
        """Prepare context string for AI analysis"""
        context = f"""
        Election: {election_data.get('title', 'Unknown')}
        Type: {election_data.get('type', 'Unknown')}
        Total Voters: {election_data.get('total_voters', 0)}
        Total Votes: {election_data.get('total_votes', 0)}
        Turnout: {self._calculate_turnout(election_data.get('total_votes', 0), election_data.get('total_voters', 0))}%
        Candidates: {len(election_data.get('candidates', []))}
        Status: {election_data.get('status', 'Unknown')}
        """
        return context
    
    def _calculate_turnout(self, votes: int, voters: int) -> float:
        """Calculate turnout percentage"""
        if voters == 0:
            return 0.0
        return round((votes / voters) * 100, 2)
    
    async def _get_ai_insights(self, context: str) -> List[str]:
        """Get AI insights using Gemini API"""
        if not self.gemini_api_key:
            return self._get_default_insights()
        
        try:
            prompt = f"""
            Analyze this election data and provide 3 key insights:
            {context}
            
            Provide insights in this format:
            - Insight 1
            - Insight 2  
            - Insight 3
            """
            
            response = await self._call_gemini_api(prompt)
            return self._parse_ai_response(response)
        except Exception as e:
            logger.error(f"Error getting AI insights: {str(e)}")
            return self._get_default_insights()
    
    async def _get_ai_recommendations(self, context: str) -> List[str]:
        """Get AI recommendations using Gemini API"""
        if not self.gemini_api_key:
            return self._get_default_recommendations()
        
        try:
            prompt = f"""
            Based on this election data, provide 3 actionable recommendations:
            {context}
            
            Provide recommendations in this format:
            - Recommendation 1
            - Recommendation 2
            - Recommendation 3
            """
            
            response = await self._call_gemini_api(prompt)
            return self._parse_ai_response(response)
        except Exception as e:
            logger.error(f"Error getting AI recommendations: {str(e)}")
            return self._get_default_recommendations()
    
    async def _call_gemini_api(self, prompt: str) -> str:
        """Call Gemini API for AI analysis"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}?key={self.gemini_api_key}",
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {
                            "maxOutputTokens": 300,
                            "temperature": 0.7
                        }
                    },
                    timeout=30.0
                )
                response.raise_for_status()
                data = response.json()
                logger.info(f"Gemini API response: {data}")
                return data['candidates'][0]['content']['parts'][0]['text']
        except Exception as e:
            logger.error(f"Gemini API call failed: {str(e)}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response status: {e.response.status_code}")
                logger.error(f"Response body: {e.response.text}")
            raise
    
    def _parse_ai_response(self, response: str) -> List[str]:
        """Parse AI response into list of insights/recommendations"""
        lines = response.strip().split('\n')
        items = []
        for line in lines:
            line = line.strip()
            if line.startswith('-') or line.startswith('•'):
                items.append(line[1:].strip())
            elif line and len(items) < 3:
                items.append(line)
        return items[:3] if items else self._get_default_insights()
    
    def _get_default_insights(self) -> List[str]:
        """Fallback insights when AI is not available"""
        return [
            "Voter turnout analysis based on historical patterns",
            "Candidate performance evaluation metrics",
            "Geographic distribution of voting activity"
        ]
    
    def _get_default_recommendations(self) -> List[str]:
        """Fallback recommendations when AI is not available"""
        return [
            "Consider implementing voter engagement campaigns",
            "Analyze candidate outreach strategies",
            "Review geographic coverage of election activities"
        ]
    
    def _get_fallback_analytics(self, election_data: Dict[str, Any]) -> ElectionAnalytics:
        """Fallback analytics when AI fails"""
        return ElectionAnalytics(
            election_id=election_data.get('id'),
            total_voters=election_data.get('total_voters', 0),
            total_votes=election_data.get('total_votes', 0),
            turnout_percentage=self._calculate_turnout(
                election_data.get('total_votes', 0),
                election_data.get('total_voters', 0)
            ),
            top_candidates=election_data.get('candidates', [])[:3],
            insights=self._get_default_insights(),
            recommendations=self._get_default_recommendations()
        )

# Create service instance
rag_service = SimpleRAGService()


