# import os
# import uuid
# from datetime import datetime
# from io import BytesIO
#
# import pandas as pd
# from fastapi import HTTPException, UploadFile, status
# from sqlalchemy.orm import Session
#
# from ..config import settings
# from ..models import Document
#
# DOCUMENT_UPLOAD_DIR = "uploads/documents"
# os.makedirs(DOCUMENT_UPLOAD_DIR, exist_ok=True)
#
#
# class RegistrationService:
#     def __init__(self, db: Session):
#         self.db = db
#         self.max_document_size = settings.MAX_DOCUMENT_SIZE
#         self.max_spreadsheet_size = settings.MAX_SPREADSHEET_SIZE
#
#     # Document handling methods
#     def upload_documents(self, org_id: int, files: list[UploadFile]) -> list[Document]:
#         """Handle document uploads for an organization"""
#         self._verify_organization_exists(org_id)
#         return [self._save_document(file, org_id) for file in files]
#
#     def _save_document(self, file: UploadFile, org_id: int) -> Document:
#         """Save uploaded document to filesystem and database"""
#         file_ext = os.path.splitext(file.filename)[1]
#         unique_filename = f"{org_id}_{uuid.uuid4()}{file_ext}"
#         file_path = os.path.join(DOCUMENT_UPLOAD_DIR, unique_filename)
#
#         with open(file_path, "wb") as buffer:
#             buffer.write(file.file.read())
#
#         doc = Document(
#             filename=unique_filename,
#             filepath=file_path,
#             content_type=file.content_type,
#             organization_id=org_id,
#             upload_date=datetime.now(),
#         )
#         self.db.add(doc)
#         self.db.commit()
#         return doc
#
#     # Bulk registration methods
#     async def process_spreadsheet(self, file: UploadFile) -> dict:
#         """Process and validate uploaded spreadsheet file"""
#         try:
#             if file.size > self.max_spreadsheet_size:
#                 raise HTTPException(
#                     status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
#                     detail=f"Spreadsheet too large. Max size is {self.max_spreadsheet_size / 1024 / 1024}MB",
#                 )
#             contents = await file.read()
#             df = self._read_spreadsheet(file.content_type, contents)
#             self._validate_spreadsheet(df)
#
#             return {
#                 "filename": file.filename,
#                 "data": df.replace({pd.NA: None}).to_dict("records"),
#                 "row_count": len(df),
#             }
#         except HTTPException:
#             raise
#         except Exception as e:
#             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"File processing error: {str(e)}")
#
#     def _save_document(self, file: UploadFile, org_id: int) -> Document:
#         """Save uploaded document with size check"""
#         if file.size > self.max_document_size:
#             raise HTTPException(
#                 status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
#                 detail=f"Document too large. Max size is {self.max_document_size / 1024 / 1024}MB",
#             )
#
#     def _read_spreadsheet(self, content_type: str, contents: bytes) -> pd.DataFrame:
#         """Read spreadsheet based on file type"""
#         if content_type == "text/csv":
#             return pd.read_csv(BytesIO(contents))
#         return pd.read_excel(BytesIO(contents))  # Excel
#
#     def _validate_spreadsheet(self, df: pd.DataFrame):
#         """Validate spreadsheet content"""
#         if df.empty:
#             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")
#
#         required_columns = {"name", "email", "phone", "address", "org_type"}
#         if missing := required_columns - set(df.columns):
#             raise HTTPException(
#                 status_code=status.HTTP_400_BAD_REQUEST, detail=f"Missing required columns: {', '.join(missing)}"
#             )
