#!/usr/bin/env python3
"""
Generate 10 realistic test elections with CSV files for user mazenfahim.g@gmail.com
"""

import csv
import random
import requests
from datetime import datetime, timedelta
from faker import Faker
import os

# Initialize Faker for generating realistic data
fake = Faker()

# Configuration
API_BASE_URL = "http://localhost/api"
LOGIN_EMAIL = "mazenfahim.g@gmail.com"
LOGIN_PASSWORD = "123456"
NUM_ELECTIONS = 10

# Realistic election data
ELECTION_TEMPLATES = [
    {
        "title": "University Student Council Elections 2024",
        "type": "simple",
        "num_candidates": 8,
        "num_voters": 150,
        "duration_hours": 12
    },
    {
        "title": "Municipal Mayor Election - Springfield",
        "type": "simple", 
        "num_candidates": 5,
        "num_voters": 200,
        "duration_hours": 8
    },
    {
        "title": "Regional Parliament Elections - Northern District",
        "type": "district_based",
        "num_candidates": 12,
        "num_voters": 300,
        "duration_hours": 10
    },
    {
        "title": "State Governor Election - California Districts",
        "type": "governorate_based",
        "num_candidates": 6,
        "num_voters": 250,
        "duration_hours": 12
    },
    {
        "title": "Hospital Board of Directors Election",
        "type": "simple",
        "num_candidates": 7,
        "num_voters": 120,
        "duration_hours": 6
    },
    {
        "title": "Teachers Union Representative Election",
        "type": "district_based",
        "num_candidates": 10,
        "num_voters": 180,
        "duration_hours": 8
    },
    {
        "title": "Corporate Shareholders Annual Vote",
        "type": "simple",
        "num_candidates": 4,
        "num_voters": 100,
        "duration_hours": 4
    },
    {
        "title": "Community Council Elections - Metro Area",
        "type": "governorate_based",
        "num_candidates": 15,
        "num_voters": 350,
        "duration_hours": 14
    },
    {
        "title": "Professional Association Board Election",
        "type": "simple",
        "num_candidates": 6,
        "num_voters": 160,
        "duration_hours": 10
    },
    {
        "title": "City Council Representative Election",
        "type": "district_based",
        "num_candidates": 9,
        "num_voters": 220,
        "duration_hours": 12
    }
]

# Geographic areas for district/governorate elections
DISTRICTS = [
    "North District", "South District", "East District", "West District", 
    "Central District", "Riverside District", "Mountain District", "Coastal District"
]

GOVERNORATES = [
    "Cairo", "Alexandria", "Giza", "Aswan", "Luxor", "Red Sea", 
    "Sinai", "Delta", "Upper Egypt", "Western Desert"
]

COUNTRIES = [
    "Egypt", "United States", "Canada", "United Kingdom", "Germany", 
    "France", "Australia", "New Zealand", "UAE", "Saudi Arabia"
]

def generate_hashed_id(prefix="", index=0):
    """Generate a realistic hashed national ID"""
    timestamp = int(datetime.now().timestamp())
    return f"{prefix}_{timestamp}_{index:04d}_{random.randint(1000, 9999)}"

def generate_phone_number():
    """Generate a realistic phone number"""
    country_codes = ["+1", "+20", "+44", "+49", "+33", "+61", "+971"]
    country_code = random.choice(country_codes)
    number = ''.join([str(random.randint(0, 9)) for _ in range(9)])
    return f"{country_code}{number}"

def generate_candidates_csv(election_id, template):
    """Generate candidates CSV file"""
    filename = f"test_elections/election_{election_id:02d}_candidates.csv"
    
    with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['hashed_national_id', 'name', 'country', 'birth_date']
        
        # Add location field if needed
        if template['type'] == 'district_based':
            fieldnames.append('district')
        elif template['type'] == 'governorate_based':
            fieldnames.append('governorate')
            
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        for i in range(template['num_candidates']):
            candidate = {
                'hashed_national_id': generate_hashed_id(f"cand_e{election_id}", i),
                'name': fake.name(),
                'country': random.choice(COUNTRIES),
                'birth_date': fake.date_of_birth(minimum_age=25, maximum_age=70).strftime('%Y-%m-%d')
            }
            
            # Add location data if needed
            if template['type'] == 'district_based':
                candidate['district'] = random.choice(DISTRICTS)
            elif template['type'] == 'governorate_based':
                candidate['governorate'] = random.choice(GOVERNORATES)
                
            writer.writerow(candidate)
    
    return filename

def generate_voters_csv(election_id, template):
    """Generate voters CSV file"""
    filename = f"test_elections/election_{election_id:02d}_voters.csv"
    
    with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['voter_hashed_national_id', 'phone_number']
        
        # Add location field if needed
        if template['type'] == 'district_based':
            fieldnames.append('district')
        elif template['type'] == 'governorate_based':
            fieldnames.append('governorate')
            
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        for i in range(template['num_voters']):
            voter = {
                'voter_hashed_national_id': generate_hashed_id(f"voter_e{election_id}", i),
                'phone_number': generate_phone_number()
            }
            
            # Add location data if needed
            if template['type'] == 'district_based':
                voter['district'] = random.choice(DISTRICTS)
            elif template['type'] == 'governorate_based':
                voter['governorate'] = random.choice(GOVERNORATES)
                
            writer.writerow(voter)
    
    return filename

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

def create_election_with_csv(election_id, template, token):
    """Create an election using the CSV method"""
    try:
        # Generate start and end times
        base_time = datetime.now() + timedelta(days=random.randint(1, 30))
        start_time = base_time.replace(
            hour=random.randint(8, 16), 
            minute=random.choice([0, 15, 30, 45]),
            second=0,
            microsecond=0
        )
        end_time = start_time + timedelta(hours=template['duration_hours'])
        
        # Generate CSV files
        candidates_file = generate_candidates_csv(election_id, template)
        voters_file = generate_voters_csv(election_id, template)
        
        print(f"Generated CSV files:")
        print(f"  - {candidates_file}")
        print(f"  - {voters_file}")
        
        # Prepare form data
        form_data = {
            'title': template['title'],
            'types': template['type'],
            'starts_at': start_time.isoformat(),
            'ends_at': end_time.isoformat(),
            'num_of_votes_per_voter': random.randint(1, 3),
            'potential_number_of_voters': template['num_voters']
        }
        
        # Prepare files
        files = {
            'candidates_file': open(candidates_file, 'rb'),
            'voters_file': open(voters_file, 'rb')
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
            print(f"   Type: {template['type']}")
            print(f"   Candidates: {template['num_candidates']}")
            print(f"   Voters: {template['num_voters']}")
            return True
        else:
            print(f"❌ Failed to create election: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error creating election {election_id}: {e}")
        return False

def main():
    """Main function to generate all test elections"""
    print("🗳️  Generating 10 Test Elections with CSV Files")
    print("=" * 50)
    
    # Login first
    print("🔐 Logging in...")
    token = login_user()
    if not token:
        print("❌ Failed to login. Please check credentials and API availability.")
        return
    
    print("✅ Login successful!")
    print()
    
    # Generate elections
    success_count = 0
    for i in range(NUM_ELECTIONS):
        print(f"📊 Creating Election {i+1}/10:")
        template = ELECTION_TEMPLATES[i]
        
        if create_election_with_csv(i+1, template, token):
            success_count += 1
        
        print()
    
    print("=" * 50)
    print(f"🎉 Generation Complete!")
    print(f"✅ Successfully created: {success_count}/{NUM_ELECTIONS} elections")
    print(f"📁 CSV files location: test_elections/")
    print(f"📋 Total files generated: {success_count * 2} CSV files")

if __name__ == "__main__":
    main()
