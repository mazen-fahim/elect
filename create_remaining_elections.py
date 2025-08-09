#!/usr/bin/env python3
"""
Create the remaining 9 test elections manually
"""

import requests
import json
from datetime import datetime, timedelta
import os

# Configuration
API_BASE_URL = "http://localhost/api"
LOGIN_EMAIL = "mazenfahim.g@gmail.com"
LOGIN_PASSWORD = "123456"

# Remaining elections (excluding the one already created - election 4)
REMAINING_ELECTIONS = [1, 2, 3, 5, 6, 7, 8, 9, 10]

ELECTION_TEMPLATES = [
    {
        "title": "University Student Council Elections 2024",
        "type": "simple",
        "duration_hours": 12
    },
    {
        "title": "Municipal Mayor Election - Springfield", 
        "type": "simple",
        "duration_hours": 8
    },
    {
        "title": "Regional Parliament Elections - Northern District",
        "type": "district_based",
        "duration_hours": 10
    },
    None,  # Election 4 already exists
    {
        "title": "Hospital Board of Directors Election",
        "type": "simple",
        "duration_hours": 6
    },
    {
        "title": "Teachers Union Representative Election",
        "type": "district_based",
        "duration_hours": 8
    },
    {
        "title": "Corporate Shareholders Annual Vote",
        "type": "simple",
        "duration_hours": 4
    },
    {
        "title": "Community Council Elections - Metro Area",
        "type": "governorate_based",
        "duration_hours": 14
    },
    {
        "title": "Professional Association Board Election",
        "type": "simple",
        "duration_hours": 10
    },
    {
        "title": "City Council Representative Election",
        "type": "district_based",
        "duration_hours": 12
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

def create_election_with_csv(election_num, template, token):
    """Create an election using the CSV method"""
    try:
        # Generate start and end times
        base_time = datetime.now() + timedelta(days=election_num)
        start_time = base_time.replace(
            hour=9 + (election_num % 8), 
            minute=0,
            second=0,
            microsecond=0
        )
        end_time = start_time + timedelta(hours=template['duration_hours'])
        
        # Use existing CSV files
        candidates_file_path = f"test_elections/election_{election_num:02d}_candidates.csv"
        voters_file_path = f"test_elections/election_{election_num:02d}_voters.csv"
        
        if not os.path.exists(candidates_file_path) or not os.path.exists(voters_file_path):
            print(f"❌ CSV files not found for election {election_num}")
            return False
        
        # Prepare form data
        form_data = {
            'title': template['title'],
            'types': template['type'],
            'starts_at': start_time.isoformat(),
            'ends_at': end_time.isoformat(),
            'num_of_votes_per_voter': 1,
            'potential_number_of_voters': 200
        }
        
        # Prepare files
        files = {
            'candidates_file': open(candidates_file_path, 'rb'),
            'voters_file': open(voters_file_path, 'rb')
        }
        
        # Make API request
        headers = {'Authorization': f'Bearer {token}'}
        
        response = requests.post(
            f"{API_BASE_URL}/election/create-with-csv",
            data=form_data,
            files=files,
            headers=headers,
            timeout=30
        )
        
        # Close files
        files['candidates_file'].close()
        files['voters_file'].close()
        
        if response.status_code in [200, 201]:
            election_data = response.json()
            print(f"✅ Created election: {template['title']}")
            print(f"   ID: {election_data.get('id', 'N/A')}")
            print(f"   Start: {start_time.strftime('%Y-%m-%d %H:%M')}")
            print(f"   End: {end_time.strftime('%Y-%m-%d %H:%M')}")
            return True
        else:
            print(f"❌ Failed to create election {election_num}: {response.status_code}")
            print(f"   Response: {response.text[:200]}...")
            return False
            
    except Exception as e:
        print(f"❌ Error creating election {election_num}: {e}")
        return False

def main():
    """Main function to create remaining elections"""
    print("🗳️  Creating Remaining 9 Test Elections")
    print("=" * 40)
    
    # Login first
    print("🔐 Logging in...")
    token = login_user()
    if not token:
        print("❌ Failed to login. Please check credentials and API availability.")
        return
    
    print("✅ Login successful!")
    print()
    
    # Create remaining elections
    success_count = 0
    for election_num in REMAINING_ELECTIONS:
        template = ELECTION_TEMPLATES[election_num - 1]
        if template is None:
            continue
            
        print(f"📊 Creating Election {election_num}:")
        
        if create_election_with_csv(election_num, template, token):
            success_count += 1
        
        print()
    
    print("=" * 40)
    print(f"🎉 Creation Complete!")
    print(f"✅ Successfully created: {success_count}/{len(REMAINING_ELECTIONS)} elections")

if __name__ == "__main__":
    main()
