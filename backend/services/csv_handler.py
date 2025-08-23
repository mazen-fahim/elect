import csv
import io
import hashlib
from datetime import datetime
from typing import List, Dict, Any
import pandas as pd
from fastapi import HTTPException, UploadFile
from core.shared import Country, hash_national_id


class CSVHandler:
    """Service for handling CSV file uploads and processing"""
    
    @staticmethod
    def _hash_national_id(national_id: str) -> str:
        """Hash a national ID using SHA-256 - ALL national IDs are sensitive data"""
        # Use centralized hashing function to ensure consistency
        return hash_national_id(national_id)
    
    @staticmethod
    async def process_candidates_csv(file: UploadFile) -> List[Dict[str, Any]]:
        """
        Process uploaded candidates CSV file
        Expected columns: national_id, name, district, governorate, country, 
                         party, symbol_name, birth_date, description
        """
        print(f"DEBUG: CSVHandler.process_candidates_csv called with file: {file.filename}")
        
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="File must be a CSV")
        
        content = await file.read()
        print(f"DEBUG: Read {len(content)} bytes from candidates file")
        
        try:
            df = pd.read_csv(io.StringIO(content.decode('utf-8')))
            print(f"DEBUG: CSV parsed successfully, columns: {list(df.columns)}")
            print(f"DEBUG: CSV has {len(df)} rows")
            print(f"DEBUG: First few rows of data:")
            for i in range(min(3, len(df))):
                print(f"DEBUG: Row {i}: {dict(df.iloc[i])}")
        except Exception as e:
            print(f"DEBUG: Error parsing CSV: {str(e)}")
            print(f"DEBUG: CSV content preview: {content[:200]}...")
            raise HTTPException(status_code=400, detail=f"Error parsing CSV file: {str(e)}")
        
        # Validate required columns
        required_columns = ['national_id', 'name', 'country', 'birth_date']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            print(f"DEBUG: Missing required columns: {missing_columns}")
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required columns: {', '.join(missing_columns)}"
            )
        
        candidates = []
        for index, row in df.iterrows():
            try:
                print(f"DEBUG: Processing candidate row {index + 1}")
                
                # Validate country
                country_value = row['country']
                if country_value not in [c.value for c in Country]:
                    raise ValueError(f"Invalid country: {country_value}")
                
                # Parse birth_date
                birth_date = pd.to_datetime(row['birth_date']).to_pydatetime()
                
                # Get raw national ID and hash it
                raw_national_id = str(row['national_id']).strip()
                if not raw_national_id:
                    raise ValueError("National ID cannot be empty")
                
                # Hash the raw national ID before storage
                hashed_national_id = CSVHandler._hash_national_id(raw_national_id)
                
                candidate_data = {
                    'hashed_national_id': hashed_national_id,
                    'name': str(row['name']),
                    'district': str(row.get('district', '')) if pd.notna(row.get('district')) else None,
                    'governorate': str(row.get('governorate', '')) if pd.notna(row.get('governorate')) else None,
                    'country': country_value,
                    'party': str(row.get('party', '')) if pd.notna(row.get('party')) else None,
                    'symbol_name': str(row.get('symbol_name', '')) if pd.notna(row.get('symbol_name')) else None,
                    'birth_date': birth_date,
                    'description': str(row.get('description', '')) if pd.notna(row.get('description')) else None,
                    'symbol_icon_url': str(row.get('symbol_icon_url', '')) if pd.notna(row.get('symbol_icon_url')) else None,
                    'photo_url': str(row.get('photo_url', '')) if pd.notna(row.get('photo_url')) else None,
                }
                candidates.append(candidate_data)
                print(f"DEBUG: Successfully processed candidate row {index + 1}")
                
            except Exception as e:
                print(f"DEBUG: Error processing candidate row {index + 1}: {str(e)}")
                raise HTTPException(
                    status_code=400, 
                    detail=f"Error processing row {index + 1}: {str(e)}"
                )
        
        print(f"DEBUG: Successfully processed {len(candidates)} candidates")
        return candidates
    
    @staticmethod
    async def process_voters_csv(file: UploadFile) -> List[Dict[str, Any]]:
        """
        Process uploaded voters CSV file
        Expected columns: national_id, phone_number, governorate
        """
        print(f"DEBUG: CSVHandler.process_voters_csv called with file: {file.filename}")
        
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="File must be a CSV")
        
        content = await file.read()
        print(f"DEBUG: Read {len(content)} bytes from voters file")
        
        try:
            df = pd.read_csv(io.StringIO(content.decode('utf-8')))
            print(f"DEBUG: Voters CSV parsed successfully, columns: {list(df.columns)}")
            print(f"DEBUG: Voters CSV has {len(df)} rows")
            print(f"DEBUG: First few rows of voters data:")
            for i in range(min(3, len(df))):
                print(f"DEBUG: Row {i}: {dict(df.iloc[i])}")
        except Exception as e:
            print(f"DEBUG: Error parsing voters CSV: {str(e)}")
            print(f"DEBUG: Voters CSV content preview: {content[:200]}...")
            raise HTTPException(status_code=400, detail=f"Error parsing voters CSV file: {str(e)}")
        
        # Validate required columns
        required_columns = ['national_id', 'phone_number']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            print(f"DEBUG: Missing required voter columns: {missing_columns}")
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required columns: {', '.join(missing_columns)}"
            )
        
        voters = []
        for index, row in df.iterrows():
            try:
                print(f"DEBUG: Processing voter row {index + 1}")
                
                # Get raw national ID and hash it
                raw_national_id = str(row['national_id']).strip()
                if not raw_national_id:
                    raise ValueError("National ID cannot be empty")
                
                # Hash the raw national ID before storage
                hashed_national_id = CSVHandler._hash_national_id(raw_national_id)
                
                voter_data = {
                    'voter_hashed_national_id': hashed_national_id,
                    'phone_number': str(row['phone_number']),
                    'governorate': str(row.get('governorate', '')) if pd.notna(row.get('governorate')) else None,
                }
                voters.append(voter_data)
                print(f"DEBUG: Successfully processed voter row {index + 1}")
                
            except Exception as e:
                print(f"DEBUG: Error processing voter row {index + 1}: {str(e)}")
                raise HTTPException(
                    status_code=400, 
                    detail=f"Error processing row {index + 1}: {str(e)}"
                )
        
        print(f"DEBUG: Successfully processed {len(voters)} voters")
        return voters
    
    @staticmethod
    def get_candidates_csv_template() -> str:
        """Return CSV template for candidates - organizations upload raw national IDs"""
        return """national_id,name,district,governorate,country,party,symbol_name,birth_date,description,symbol_icon_url,photo_url
12345678901234,John Doe,Downtown,Cairo,Egypt,Democratic Party,Eagle,1980-01-15,Experienced candidate,https://example.com/symbol.png,https://example.com/photo.jpg
98765432109876,Jane Smith,Uptown,Alexandria,Egypt,Progressive Party,Star,1985-03-20,Community leader,https://example.com/symbol2.png,https://example.com/photo2.jpg"""
    
    @staticmethod
    def get_voters_csv_template() -> str:
        """Return CSV template for voters - organizations upload raw national IDs"""
        return """national_id,phone_number,governorate
12345678901234,+201234567890,Cairo
98765432109876,+201234567891,Alexandria"""

