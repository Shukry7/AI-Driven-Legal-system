"""
FastAPI routes for the Translation module.

Endpoints:
  POST /api/translate/document   – translate uploaded PDF (async via background thread)
  POST /api/translate/text       – translate raw text (async via background thread)
  GET  /api/translate/progress/{job_id}  – SSE / polling progress
  GET  /api/translate/job/{job_id}       – full job result
  GET  /api/translate/history            – list recent jobs
  GET  /api/translate/export/{job_id}    – download translated file
  GET  /api/translate/glossary           – legal glossary
  GET  /api/translate/model-info         – model performance info
"""

from __future__ import annotations

import logging
import os
import re
import time
import threading
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import JSONResponse, Response

# ── resolve imports ────────────────────────────────────────────────────────
import sys

_backend = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(_backend))

from app.services.translation_service import (
    create_job,
    fail_job,
    finalize_job,
    get_glossary,
    get_job,
    get_job_progress,
    get_model_info,
    list_jobs,
    load_models,
    translate_raw_text,
    translate_sections,
    export_translation,
    _split_into_sections,
)
from app.services.pdf_service import pdf_bytes_to_text

logger = logging.getLogger(__name__)
router = APIRouter()

UPLOADS_DIR = _backend / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)


def _secure(name: str) -> str:
    name = os.path.basename(name)
    name = re.sub(r"[^\w\s.\-]", "_", name).strip().strip(".")
    return re.sub(r"_+", "_", name) or "unnamed"


# ── startup hook (preload models in background) ───────────────────────────

def preload_models():
    """Call from app startup to warm-up models."""
    try:
        load_models()
        logger.info("✓ Translation models preloaded")
    except Exception as e:
        logger.warning("Translation model preload skipped: %s", e)


# ═══════════════════════════════════════════════════════════════════════════
# POST /api/translate/document
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/translate/document")
async def translate_document(
    file: UploadFile = File(...),
    source_language: str = Form("en"),
    target_language: str = Form("si"),
):
    """Accept a PDF, extract text, kick off translation in background, return job_id."""
    try:
        if not file.filename:
            raise HTTPException(400, "No file provided")

        filename = _secure(file.filename)
        file_bytes = await file.read()

        # Save PDF
        saved = UPLOADS_DIR / filename
        saved.write_bytes(file_bytes)

        # Extract text (uses same PDF service as clause team, but strip their markers)
        ok, raw_text = pdf_bytes_to_text(file_bytes)
        if not ok:
            raise HTTPException(500, f"PDF extraction failed: {raw_text}")

        # Strip formatting markers from clause-detection extraction
        raw_text = re.sub(r"<<F:[^>]+>>", "", raw_text)
        raw_text = re.sub(r"<</F>>", "", raw_text)
        raw_text = re.sub(r"<<BOLD>>|<</BOLD>>", "", raw_text)

        sections = _split_into_sections(raw_text)
        job_id = create_job(filename, source_language, target_language, mode="document")

        # Non-blocking model check — don't wait for preload to finish
        try:
            models = load_models(block=False)
        except Exception:
            models = {}
        mk = f"{source_language}_{target_language}"
        model_used = "mBART-legal-" + mk if mk in models else "mock-fallback"

        # Run translation in background thread so the request returns immediately
        def _run():
            t0 = time.time()
            try:
                # This WILL block until models are ready (inside the bg thread, that's fine)
                translated, overall_conf, correction_stats = translate_sections(
                    sections, source_language, target_language, job_id
                )
                elapsed = time.time() - t0
                finalize_job(
                    job_id,
                    source_sections=sections,
                    translated_sections=translated,
                    overall_confidence=overall_conf,
                    processing_time=elapsed,
                    model_used=model_used,
                    correction_stats=correction_stats,
                )
                logger.info("Translation job %s completed in %.1fs with %d corrections", 
                           job_id, elapsed, correction_stats.get('total_corrections', 0))
            except Exception as exc:
                logger.exception("Translation job %s failed", job_id)
                fail_job(job_id, str(exc))

        threading.Thread(target=_run, daemon=True).start()

        return JSONResponse({
            "success": True,
            "job_id": job_id,
            "status": "processing",
            "filename": filename,
            "source_language": source_language,
            "target_language": target_language,
            "total_sections": len(sections),
            "model_used": model_used,
            "source_sections": sections,
        })
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Document translate endpoint error")
        return JSONResponse({"success": False, "error": str(exc)}, status_code=500)


# ═══════════════════════════════════════════════════════════════════════════
# POST /api/translate/text
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/translate/text")
async def translate_text_endpoint(
    text: str = Form(...),
    source_language: str = Form("en"),
    target_language: str = Form("si"),
):
    """Translate raw text (not from a file). Returns job_id with background processing."""
    try:
        if not text.strip():
            raise HTTPException(400, "Empty text")

        job_id = create_job("text_input", source_language, target_language, mode="text", raw_text=text)

        # Non-blocking model check
        try:
            models = load_models(block=False)
        except Exception:
            models = {}
        mk = f"{source_language}_{target_language}"
        model_used = "mBART-legal-" + mk if mk in models else "mock-fallback"

        sections = _split_into_sections(text)

        def _run():
            t0 = time.time()
            try:
                translated_sections, overall_conf, correction_stats = translate_sections(
                    sections, source_language, target_language, job_id
                )
                raw_translated = " ".join(s["translated_content"] for s in translated_sections)
                elapsed = time.time() - t0
                finalize_job(
                    job_id,
                    source_sections=sections,
                    translated_sections=translated_sections,
                    overall_confidence=overall_conf,
                    processing_time=elapsed,
                    correction_stats=correction_stats,
                    model_used=model_used,
                    raw_translated=raw_translated,
                )
            except Exception as exc:
                logger.exception("Text translation job %s failed", job_id)
                fail_job(job_id, str(exc))

        threading.Thread(target=_run, daemon=True).start()

        return JSONResponse({
            "success": True,
            "job_id": job_id,
            "status": "processing",
            "filename": "text_input",
            "source_language": source_language,
            "target_language": target_language,
            "total_sections": len(sections),
            "model_used": model_used,
            "source_sections": sections,
        })
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Text translate endpoint error")
        return JSONResponse({"success": False, "error": str(exc)}, status_code=500)


# ═══════════════════════════════════════════════════════════════════════════
# GET /api/translate/progress/{job_id}
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/translate/progress/{job_id}")
async def translation_progress(job_id: str):
    """Light-weight polling endpoint for progress updates."""
    info = get_job_progress(job_id)
    if "error" in info and info["error"] == "Job not found":
        raise HTTPException(404, "Job not found")
    return JSONResponse(info)


# ═══════════════════════════════════════════════════════════════════════════
# GET /api/translate/job/{job_id}
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/translate/job/{job_id}")
async def get_translation_job(job_id: str):
    """Return the full job payload (sections, confidence, stats, etc.)."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return JSONResponse(job)


# ═══════════════════════════════════════════════════════════════════════════
# GET /api/translate/history
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/translate/history")
async def translation_history(limit: int = Query(20, ge=1, le=100)):
    """List recent translation jobs."""
    jobs = list_jobs(limit)
    return JSONResponse({"jobs": jobs})


# ═══════════════════════════════════════════════════════════════════════════
# POST /api/translate/cancel/{job_id}
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/translate/cancel/{job_id}")
async def cancel_translation(job_id: str):
    """Mark a running translation job as stopped by user."""
    from app.services.translation_service import _load_job, _save_job
    job = _load_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job["status"] in ("completed", "failed", "stopped"):
        return JSONResponse({"message": "Job already finished", "status": job["status"]})
    job["status"] = "stopped"
    # Don't set error - this was intentional stop, not a failure
    _save_job(job_id, job)
    return JSONResponse({"message": "Job stopped", "status": "stopped"})


# ═══════════════════════════════════════════════════════════════════════════
# POST /api/translate/skip-section/{job_id}
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/translate/skip-section/{job_id}")
async def skip_section(job_id: str, section_index: int = Form(...)):
    """Mark a section to be skipped during translation."""
    from app.services.translation_service import _load_job, _save_job
    job = _load_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    skip_set = set(job.get("skip_sections", []))
    skip_set.add(section_index)
    job["skip_sections"] = list(skip_set)
    _save_job(job_id, job)
    return JSONResponse({"message": f"Section {section_index} marked for skip", "skip_sections": list(skip_set)})


# ═══════════════════════════════════════════════════════════════════════════
# DELETE /api/translate/job/{job_id}
# ═══════════════════════════════════════════════════════════════════════════

@router.delete("/translate/job/{job_id}")
async def delete_translation_job(job_id: str):
    """Delete a translation job."""
    from app.services.translation_service import JOBS_DIR
    job_file = JOBS_DIR / f"{job_id}.json"
    if not job_file.exists():
        raise HTTPException(404, "Job not found")
    job_file.unlink()
    return JSONResponse({"message": "Job deleted"})


# ═══════════════════════════════════════════════════════════════════════════
# GET /api/translate/export/{job_id}
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/translate/export/{job_id}")
async def export_translation_file(
    job_id: str,
    format: str = Query("txt", regex="^(pdf|txt|json)$"),
):
    """Download translated file in PDF / TXT / JSON."""
    try:
        data, content_type = export_translation(job_id, format)
    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, f"Export failed: {e}")

    ext = format
    return Response(
        content=data,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="translation_{job_id[:8]}.{ext}"'},
    )


# ═══════════════════════════════════════════════════════════════════════════
# GET /api/translate/glossary
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/translate/glossary")
async def glossary_endpoint(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    try:
        return JSONResponse(get_glossary(category, search))
    except Exception as exc:
        logger.exception("glossary error")
        return JSONResponse({"error": str(exc)}, status_code=500)


# ═══════════════════════════════════════════════════════════════════════════
# GET /api/translate/model-info
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/translate/model-info")
async def model_info_endpoint():
    try:
        return JSONResponse(get_model_info())
    except Exception as exc:
        logger.exception("model-info error")
        return JSONResponse({"error": str(exc)}, status_code=500)


# ═══════════════════════════════════════════════════════════════════════════
# POST /api/translate/extract-saved  – extract text from a saved file
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/translate/extract-saved")
async def extract_saved_document(filename: str = Form(...)):
    """Extract and return text from a file already present in the uploads directory."""
    try:
        safe_name = _secure(filename)
        file_path = UPLOADS_DIR / safe_name
        if not file_path.exists():
            raise HTTPException(404, f"File '{safe_name}' not found in uploads")

        file_bytes = file_path.read_bytes()

        if file_path.suffix.lower() == ".pdf":
            ok, raw_text = pdf_bytes_to_text(file_bytes)
            if not ok:
                return JSONResponse({"success": False, "error": raw_text})
            raw_text = re.sub(r"<<F:[^>]+>>", "", raw_text)
            raw_text = re.sub(r"<</F>>", "", raw_text)
            raw_text = re.sub(r"<<BOLD>>|<</BOLD>>", "", raw_text)
        else:
            raw_text = file_bytes.decode("utf-8", errors="replace")

        preview = raw_text[:2000] if len(raw_text) > 2000 else raw_text
        return JSONResponse({"success": True, "full_text": raw_text, "preview": preview})
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("extract-saved error")
        return JSONResponse({"success": False, "error": str(exc)}, status_code=500)


# ═══════════════════════════════════════════════════════════════════════════
# GET /api/translate/uploads  – list PDF/TXT files saved in uploads folder
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/translate/uploads")
async def list_uploads():
    """Return a list of PDF/TXT files stored in the uploads directory."""
    try:
        files = []
        for p in sorted(UPLOADS_DIR.iterdir(), key=lambda x: x.stat().st_mtime, reverse=True):
            if p.suffix.lower() == ".pdf" and p.name.lower().endswith(".pdf"):
                stat = p.stat()
                files.append({
                    "filename": p.name,
                    "size": stat.st_size,
                    "modified": stat.st_mtime,
                })
        return JSONResponse({"files": files})
    except Exception as exc:
        logger.exception("list uploads error")
        return JSONResponse({"error": str(exc)}, status_code=500)


# ═══════════════════════════════════════════════════════════════════════════
# POST /api/translate/document-from-saved  – translate an already-saved file
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/translate/document-from-saved")
async def translate_document_from_saved(
    filename: str = Form(...),
    source_language: str = Form("en"),
    target_language: str = Form("si"),
):
    """Start translation of a file already present in the uploads directory."""
    try:
        safe_name = _secure(filename)
        file_path = UPLOADS_DIR / safe_name
        if not file_path.exists():
            raise HTTPException(404, f"File '{safe_name}' not found in uploads")

        file_bytes = file_path.read_bytes()

        if file_path.suffix.lower() == ".pdf":
            ok, raw_text = pdf_bytes_to_text(file_bytes)
            if not ok:
                raise HTTPException(500, f"PDF extraction failed: {raw_text}")
            raw_text = re.sub(r"<<F:[^>]+>>", "", raw_text)
            raw_text = re.sub(r"<</F>>", "", raw_text)
            raw_text = re.sub(r"<<BOLD>>|<</BOLD>>", "", raw_text)
        else:
            raw_text = file_bytes.decode("utf-8", errors="replace")

        sections = _split_into_sections(raw_text)
        job_id = create_job(safe_name, source_language, target_language, mode="document")

        try:
            models = load_models(block=False)
        except Exception:
            models = {}
        mk = f"{source_language}_{target_language}"
        model_used = "mBART-legal-" + mk if mk in models else "mock-fallback"

        def _run():
            t0 = time.time()
            try:
                translated, overall_conf, correction_stats = translate_sections(
                    sections, source_language, target_language, job_id
                )
                elapsed = time.time() - t0
                finalize_job(
                    job_id,
                    source_sections=sections,
                    translated_sections=translated,
                    overall_confidence=overall_conf,
                    processing_time=elapsed,
                    model_used=model_used,
                    correction_stats=correction_stats,
                )
            except Exception as exc:
                logger.exception("Translation job %s failed", job_id)
                fail_job(job_id, str(exc))

        threading.Thread(target=_run, daemon=True).start()

        return JSONResponse({
            "success": True,
            "job_id": job_id,
            "status": "processing",
            "filename": safe_name,
            "source_language": source_language,
            "target_language": target_language,
            "total_sections": len(sections),
            "model_used": model_used,
            "source_sections": sections,
        })
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("document-from-saved endpoint error")
        return JSONResponse({"success": False, "error": str(exc)}, status_code=500)
