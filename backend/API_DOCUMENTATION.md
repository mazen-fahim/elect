# Election Creation API Documentation

## Overview
This document describes the enhanced election creation API that supports three methods for adding candidates and voters to elections:

1. **Manual addition** - Include candidates/voters directly in the election creation request
2. **CSV upload** - Upload CSV files with candidate and voter data 
3. **Bulk API** - Use dedicated endpoints to add candidates in bulk

## Authentication
All endpoints require organization-level authentication. Include the Bearer token in the Authorization header.

## 1. Election Creation with Manual Candidate/Voter Addition

### POST /api/election/

Create an election with optional candidates and voters included in the request body.

**Request Body:**
```json
{
  "title": "Student Council Election 2024",
  "types": "student_council",
  "starts_at": "2024-03-01T09:00:00Z",
  "ends_at": "2024-03-01T17:00:00Z",
  "num_of_votes_per_voter": 1,
  "potential_number_of_voters": 500,
  "candidates": [
    {
      "hashed_national_id": "abc123hash456",
      "name": "John Doe",
      "district": "District 1",
      "governorate": "Cairo",
      "country": "Egypt",
      "party": "Independent",
      "symbol_name": "Eagle",
      "birth_date": "1995-01-15T00:00:00Z",
      "description": "Experienced student leader"
    }
  ],
  "voters": [
    {
      "voter_hashed_national_id": "voter123hash456",
      "phone_number": "+201234567890",
      "governorate": "Cairo"
    }
  ]
}
```

**Response:**
```json
{
  "id": 1,
  "title": "Student Council Election 2024",
  "types": "student_council",
  "organization_id": 1,
  "starts_at": "2024-03-01T09:00:00Z",
  "ends_at": "2024-03-01T17:00:00Z",
  "num_of_votes_per_voter": 1,
  "potential_number_of_voters": 500,
  "status": "pending",
  "create_req_status": "pending",
  "created_at": "2024-01-15T10:30:00Z",
  "total_vote_count": 0,
  "number_of_candidates": 1
}
```

## 2. CSV Upload Methods

### CSV Templates

Get CSV templates for proper formatting:

#### GET /api/election/templates/candidates-csv
Returns template for candidates CSV file.

#### GET /api/election/templates/voters-csv
Returns template for voters CSV file.

### Upload Candidates via CSV

#### POST /api/election/{election_id}/candidates/csv

Upload candidates for an existing election using a CSV file.

**Request:**
- `file`: CSV file with candidate data
- Content-Type: multipart/form-data

**CSV Format (candidates):**
```csv
hashed_national_id,name,district,governorate,country,party,symbol_name,birth_date,description,symbol_icon_url,photo_url
abc123hash,John Doe,Downtown,Cairo,Egypt,Democratic Party,Eagle,1980-01-15,Experienced candidate,https://example.com/symbol.png,https://example.com/photo.jpg
```

**Required columns:**
- `hashed_national_id` (string)
- `name` (string)  
- `country` (string, must be valid Country enum value)
- `birth_date` (date in YYYY-MM-DD format)

**Optional columns:**
- `district`, `governorate`, `party`, `symbol_name`, `description`, `symbol_icon_url`, `photo_url`

### Upload Voters via CSV

#### POST /api/election/{election_id}/voters/csv

Upload voters for an existing election using a CSV file.

**CSV Format (voters):**
```csv
voter_hashed_national_id,phone_number,governorate
def456hash,+201234567890,Cairo
ghi789hash,+201234567891,Alexandria
```

**Required columns:**
- `voter_hashed_national_id` (string)
- `phone_number` (string)

**Optional columns:**
- `governorate`

## 3. Bulk Candidate API

### POST /api/candidates/bulk

Create multiple candidates at once using the API.

**Request Body:**
```json
[
  {
    "hashed_national_id": "abc123hash456",
    "name": "John Doe",
    "district": "District 1",
    "governorate": "Cairo", 
    "country": "Egypt",
    "party": "Independent",
    "symbol_name": "Eagle",
    "birth_date": "1995-01-15T00:00:00Z",
    "description": "Experienced candidate",
    "symbol_icon_url": "https://example.com/symbol.png",
    "photo_url": "https://example.com/photo.jpg"
  }
]
```

**Response:**
Array of created candidate objects.

## Error Handling

All endpoints return appropriate HTTP status codes:

- `201 Created` - Successful creation
- `400 Bad Request` - Invalid data or CSV format
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Organization doesn't own the election
- `404 Not Found` - Election not found
- `422 Unprocessable Entity` - Validation errors

## Workflow Examples

### Scenario 1: Create Election with Manual Data
1. POST to `/api/election/` with candidates and voters in request body
2. Election, candidates, and voters are created in one request

### Scenario 2: Create Election, then Upload CSV
1. POST to `/api/election/` with basic election data (no candidates/voters)
2. POST CSV file to `/api/election/{id}/candidates/csv`
3. POST CSV file to `/api/election/{id}/voters/csv`

### Scenario 3: Use Bulk API for Candidates
1. POST to `/api/candidates/bulk` to create candidates
2. POST to `/api/election/` (candidates will be available for future elections)
3. Create candidate participations separately or include existing candidates in election creation

## Notes

- Candidates are shared across the organization and can participate in multiple elections
- Voters are specific to each election
- Duplicate candidates (same hashed_national_id) are handled gracefully
- CSV files must be properly formatted UTF-8 encoded files
- All timestamps should be in ISO 8601 format with timezone information

