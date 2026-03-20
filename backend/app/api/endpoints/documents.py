import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.core.dependencies import get_current_user
from app.models.user import User, Employee
from app.models.document import Document
from app.schemas.common import DocumentResponse

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.get("/{employee_id}", response_model=list[DocumentResponse])
def list_documents(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("super_admin", "hr_admin"):
        emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        if not emp or emp.id != employee_id:
            raise HTTPException(status_code=403, detail="Not authorized")
    return db.query(Document).filter(Document.employee_id == employee_id).all()


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    employee_id: int = Form(...),
    document_type: str = Form("other"),
    description: str = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    upload_dir = os.path.join(settings.UPLOAD_DIR, "documents", str(employee_id))
    os.makedirs(upload_dir, exist_ok=True)

    file_path = os.path.join(upload_dir, file.filename)
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    uploader = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    doc = Document(
        employee_id=employee_id,
        name=file.filename,
        document_type=document_type,
        file_path=file_path,
        file_size=len(content),
        mime_type=file.content_type,
        description=description,
        uploaded_by_id=uploader.id if uploader else None,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.get("/download/{doc_id}")
def download_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(doc.file_path, filename=doc.name, media_type=doc.mime_type)
