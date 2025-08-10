import csv
import io
from datetime import datetime
from typing import List, Dict, Any
import pandas as pd
from fastapi import HTTPException, UploadFile
from core.shared import Country


class CSVHandler:
    """Service for handling CSV file uploads and processing"""
    
    @staticmethod
    async def process_candidates_csv(file: UploadFile) -> List[Dict[str, Any]]:
        """
        Process uploaded candidates CSV file
        Expected columns: hashed_national_id, name, district, governorate, country, 
                         party, symbol_name, birth_date, description
        """
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="File must be a CSV")
        
        content = await file.read()
        df = pd.read_csv(io.StringIO(content.decode('utf-8')))
        
        # Validate required columns
        required_columns = ['hashed_national_id', 'name', 'country', 'birth_date']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required columns: {', '.join(missing_columns)}"
            )
        
        candidates = []
        for index, row in df.iterrows():
            try:
                # Validate country
                country_value = row['country']
                if country_value not in [c.value for c in Country]:
                    raise ValueError(f"Invalid country: {country_value}")
                
                # Parse birth_date
                birth_date = pd.to_datetime(row['birth_date']).to_pydatetime()
                
                candidate_data = {
                    'hashed_national_id': str(row['hashed_national_id']),
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
                
            except Exception as e:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Error processing row {index + 1}: {str(e)}"
                )
        
        return candidates
    
    @staticmethod
    async def process_voters_csv(file: UploadFile) -> List[Dict[str, Any]]:
        """
        Process uploaded voters CSV file
        Expected columns: voter_hashed_national_id, phone_number, governorate
        """
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="File must be a CSV")
        
        content = await file.read()
        df = pd.read_csv(io.StringIO(content.decode('utf-8')))
        
        # Validate required columns
        required_columns = ['voter_hashed_national_id', 'phone_number']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required columns: {', '.join(missing_columns)}"
            )
        
        voters = []
        for index, row in df.iterrows():
            try:
                voter_data = {
                    'voter_hashed_national_id': str(row['voter_hashed_national_id']),
                    'phone_number': str(row['phone_number']),
                    'governorate': str(row.get('governorate', '')) if pd.notna(row.get('governorate')) else None,
                }
                voters.append(voter_data)
                
            except Exception as e:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Error processing row {index + 1}: {str(e)}"
                )
        
        return voters
    
    @staticmethod
    def get_candidates_csv_template() -> str:
        """Return CSV template for candidates"""
        return """hashed_national_id,name,district,governorate,country,party,symbol_name,birth_date,description,symbol_icon_url,photo_url
abc123hash,John Doe,Downtown,Cairo,Egypt,Democratic Party,Eagle,1980-01-15,Experienced candidate,https://example.com/symbol.png,https://example.com/photo.jpg"""
    
    @staticmethod
    def get_voters_csv_template() -> str:
        """Return CSV template for voters"""
        return """voter_hashed_national_id,phone_number,governorate
def456hash,+201234567890,Cairo
ghi789hash,+201234567891,Alexandria"""

