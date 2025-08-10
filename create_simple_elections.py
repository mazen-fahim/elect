#!/usr/bin/env python3
"""
Create 9 simple elections using API-only method first
"""

import requests
import json
from datetime import datetime, timedelta

# Configuration
API_BASE_URL = "http://localhost/api"
LOGIN_EMAIL = "mazenfahim.g@gmail.com"
LOGIN_PASSWORD = "123456"

ELECTIONS = [
    {
        "title": "University Student Council Elections 2024",
        "types": "simple",
        "starts_at": (datetime.now() + timedelta(days=1, hours=9)).isoformat(),
        "ends_at": (datetime.now() + timedelta(days=1, hours=21)).isoformat(),
        "num_of_votes_per_voter": 1,
        "potential_number_of_voters": 150,
        "method": "api",
        "api_endpoint": "https://api.university.edu/voter-check"
    },
    {
        "title": "Municipal Mayor Election - Springfield",
        "types": "simple",
        "starts_at": (datetime.now() + timedelta(days=2, hours=8)).isoformat(),
        "ends_at": (datetime.now() + timedelta(days=2, hours=16)).isoformat(),
        "num_of_votes_per_voter": 1,
        "potential_number_of_voters": 200,
        "method": "api", 
        "api_endpoint": "https://api.springfield.gov/voter-eligibility"
    },
    {
        "title": "Regional Parliament Elections - Northern District",
        "types": "api_managed",
        "starts_at": (datetime.now() + timedelta(days=3, hours=9)).isoformat(),
        "ends_at": (datetime.now() + timedelta(days=3, hours=19)).isoformat(),
        "num_of_votes_per_voter": 2,
        "potential_number_of_voters": 300,
        "method": "api",
        "api_endpoint": "https://api.parliament.gov/district-voting"
    },
    {
        "title": "Hospital Board of Directors Election",
        "types": "simple",
        "starts_at": (datetime.now() + timedelta(days=5, hours=10)).isoformat(),
        "ends_at": (datetime.now() + timedelta(days=5, hours=16)).isoformat(),
        "num_of_votes_per_voter": 3,
        "potential_number_of_voters": 120,
        "method": "api",
        "api_endpoint": "https://api.medicalhospital.org/staff-verify"
    },
    {
        "title": "Teachers Union Representative Election",
        "types": "api_managed",
        "starts_at": (datetime.now() + timedelta(days=6, hours=8)).isoformat(),
        "ends_at": (datetime.now() + timedelta(days=6, hours=16)).isoformat(),
        "num_of_votes_per_voter": 1,
        "potential_number_of_voters": 180,
        "method": "api",
        "api_endpoint": "https://api.teachersunion.org/member-check"
    },
    {
        "title": "Corporate Shareholders Annual Vote",
        "types": "simple",
        "starts_at": (datetime.now() + timedelta(days=7, hours=14)).isoformat(),
        "ends_at": (datetime.now() + timedelta(days=7, hours=18)).isoformat(),
        "num_of_votes_per_voter": 1,
        "potential_number_of_voters": 100,
        "method": "api",
        "api_endpoint": "https://api.corporation.com/shareholder-verify"
    },
    {
        "title": "Community Council Elections - Metro Area",
        "types": "api_managed",
        "starts_at": (datetime.now() + timedelta(days=8, hours=9)).isoformat(),
        "ends_at": (datetime.now() + timedelta(days=8, hours=23)).isoformat(),
        "num_of_votes_per_voter": 2,
        "potential_number_of_voters": 350,
        "method": "api",
        "api_endpoint": "https://api.metrocouncil.gov/resident-check"
    },
    {
        "title": "Professional Association Board Election",
        "types": "simple",
        "starts_at": (datetime.now() + timedelta(days=9, hours=9)).isoformat(),
        "ends_at": (datetime.now() + timedelta(days=9, hours=19)).isoformat(),
        "num_of_votes_per_voter": 2,
        "potential_number_of_voters": 160,
        "method": "api",
        "api_endpoint": "https://api.professional-assoc.org/member-verify"
    },
    {
        "title": "City Council Representative Election",
        "types": "api_managed",
        "starts_at": (datetime.now() + timedelta(days=10, hours=8)).isoformat(),
        "ends_at": (datetime.now() + timedelta(days=10, hours=20)).isoformat(),
        "num_of_votes_per_voter": 1,
        "potential_number_of_voters": 220,
        "method": "api",
        "api_endpoint": "https://api.citycouncil.gov/voter-eligibility"
    }
]

def login_user():
    """Login and get auth token"""
    try:
        response = requests.post(
            f"{API_BASE_URL}/auth/login",
            json={"email": LOGIN_EMAIL, "password": LOGIN_PASSWORD},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            return data.get('access_token')
        else:
            print(f"Login failed: {response.status_code} - {response.text}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"Login request failed: {e}")
        return None

def create_election(election_data, token):
    """Create an election using the API method"""
    try:
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        
        response = requests.post(
            f"{API_BASE_URL}/election/",
            json=election_data,
            headers=headers,
            timeout=30
        )
        
        if response.status_code in [200, 201]:
            result = response.json()
            print(f"✅ Created: {election_data['title']}")
            print(f"   ID: {result.get('id', 'N/A')}")
            return True
        else:
            print(f"❌ Failed: {election_data['title']}")
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.text[:200]}...")
            return False
            
    except Exception as e:
        print(f"❌ Error creating {election_data['title']}: {e}")
        return False

def main():
    """Main function"""
    print("🗳️  Creating 9 API-Based Elections")
    print("=" * 40)
    
    # Login first
    token = login_user()
    if not token:
        print("❌ Failed to login")
        return
    
    print("✅ Login successful!")
    print()
    
    # Create elections
    success_count = 0
    for i, election_data in enumerate(ELECTIONS, 1):
        print(f"📊 Creating Election {i}:")
        
        if create_election(election_data, token):
            success_count += 1
        
        print()
    
    print("=" * 40)
    print(f"🎉 Creation Complete!")
    print(f"✅ Successfully created: {success_count}/{len(ELECTIONS)} elections")

if __name__ == "__main__":
    main()
