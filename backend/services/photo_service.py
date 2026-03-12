import uuid
import aiofiles
from pathlib import Path
from fastapi import UploadFile
from typing import List, Optional
from backend.config import UPLOADS_DIR
from backend.models.photo import Photo
from backend.repositories.local.photo_repo import LocalPhotoRepository


class PhotoService:
    def __init__(self, repo: LocalPhotoRepository):
        self.repo = repo

    async def upload(self, file: UploadFile, inspection_id: int, defect_ids: List[int] = None) -> Photo:
        ext = Path(file.filename).suffix if file.filename else ".jpg"
        if not ext:
            ext = ".jpg"
        filename = f"{uuid.uuid4().hex}{ext}"
        dest = UPLOADS_DIR / filename
        async with aiofiles.open(str(dest), "wb") as f:
            await f.write(await file.read())
        return await self.repo.create(inspection_id, filename, defect_ids or [])

    async def list(self, inspection_id: int = None, defect_id: int = None) -> List[Photo]:
        return await self.repo.list(inspection_id=inspection_id, defect_id=defect_id)

    async def get(self, id: int) -> Optional[Photo]:
        return await self.repo.get(id)

    async def set_defects(self, photo_id: int, defect_ids: List[int]) -> Photo:
        return await self.repo.set_defects(photo_id, defect_ids)

    async def delete(self, id: int) -> bool:
        photo = await self.repo.get(id)
        if not photo:
            return False
        dest = UPLOADS_DIR / photo.filename
        if dest.exists():
            dest.unlink()
        return await self.repo.delete(id)
