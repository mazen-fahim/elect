import asyncio

import cloudinary
import cloudinary.uploader
from fastapi import HTTPException, UploadFile, status

from core.settings import settings


class ImageService:
    def __init__(self):
        self.init_cloudinary()

    @staticmethod
    def init_cloudinary():
        if not all(
            [
                settings.CLOUDINARY_CLOUD_NAME,
                settings.CLOUDINARY_API_KEY,
                settings.CLOUDINARY_API_SECRET,
            ]
        ):
            print("Cloudinary credentials are not fully configured. Uploads will be disabled.")
            return

        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
            secure=True,
        )
        print("Cloudinary configured successfully.")

    async def upload_image(self, file: UploadFile | None) -> str | None:
        if not file:
            return None
            
        if not cloudinary.config().api_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Image upload service is not configured.",
            )
        loop = asyncio.get_running_loop()
        try:
            upload_result = await loop.run_in_executor(
                None,
                cloudinary.uploader.upload,
                file.file,
            )
            secure_url = upload_result.get("secure_url")
            if not secure_url:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Cloudinary did not return a secure URL.",
                )
            return secure_url
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload image: {e}",
            ) from e
