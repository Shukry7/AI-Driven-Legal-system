import os
import time
import threading
import json
import datetime
from typing import Optional


def _cleanup_loop(app, uploads_dir: str, retention_seconds: float, check_interval_seconds: float):
    app.logger.info("uploads-cleanup: loop started (retention_seconds=%s, check_interval_seconds=%s)",
                    retention_seconds, check_interval_seconds)
    while True:
        try:
            now = time.time()
            # iterate files in uploads and remove those older than retention
            for name in os.listdir(uploads_dir):
                # skip metadata files
                if name.endswith('.meta.json'):
                    continue
                path = os.path.join(uploads_dir, name)
                # prefer explicit uploaded_at in sidecar metadata
                meta_path = path + '.meta.json'
                created_ts = None
                if os.path.exists(meta_path):
                    try:
                        with open(meta_path, 'r', encoding='utf-8') as m:
                            data = json.load(m)
                        uploaded_at = data.get('uploaded_at')
                        if uploaded_at:
                            # accept ISO format
                            try:
                                dt = datetime.datetime.fromisoformat(uploaded_at.replace('Z', '+00:00'))
                                created_ts = dt.timestamp()
                            except Exception:
                                created_ts = None
                    except Exception:
                        app.logger.exception('uploads-cleanup: failed to read meta %s', meta_path)

                try:
                    if created_ts is None:
                        created_ts = os.path.getmtime(path)
                except Exception:
                    continue

                age = now - created_ts
                if age >= retention_seconds:
                    try:
                        # remove primary file
                        os.remove(path)
                        app.logger.info("uploads-cleanup: deleted %s (age_seconds=%.0f)", path, age)
                    except Exception:
                        app.logger.exception("uploads-cleanup: failed to delete %s", path)

                    # attempt to remove common sidecars (text and metadata)
                    try:
                        txt_path = path + '.txt' if not path.lower().endswith('.txt') else None
                        if txt_path and os.path.exists(txt_path):
                            os.remove(txt_path)
                            app.logger.info('uploads-cleanup: deleted sidecar %s', txt_path)
                    except Exception:
                        app.logger.exception('uploads-cleanup: failed to delete sidecar txt for %s', path)

                    try:
                        if os.path.exists(meta_path):
                            os.remove(meta_path)
                            app.logger.info('uploads-cleanup: deleted meta %s', meta_path)
                    except Exception:
                        app.logger.exception('uploads-cleanup: failed to delete meta %s', meta_path)
        except Exception:
            app.logger.exception("uploads-cleanup: iteration failed")
        time.sleep(check_interval_seconds)


def start_uploads_cleanup(app, retention_hours: Optional[float] = None, check_interval_minutes: float = 60.0):
    """Start a background thread that cleans files in uploads/ older than retention_hours.

    - `retention_hours` reads from the environment variable `UPLOAD_RETENTION_HOURS` when None.
    - defaults: retention 10 hours, check interval 60 minutes.
    """
    try:
        if retention_hours is None:
            retention_hours = float(os.getenv('UPLOAD_RETENTION_HOURS', '10'))
    except Exception:
        retention_hours = 10.0

    try:
        check_interval_minutes = float(os.getenv('UPLOAD_CLEANUP_INTERVAL_MINUTES', str(check_interval_minutes)))
    except Exception:
        check_interval_minutes = check_interval_minutes

    retention_seconds = float(retention_hours) * 3600.0
    check_interval_seconds = float(check_interval_minutes) * 60.0

    uploads_dir = os.path.join(app.root_path, '..', 'uploads')
    try:
        os.makedirs(uploads_dir, exist_ok=True)
    except Exception:
        app.logger.exception('uploads-cleanup: failed to ensure uploads directory exists')

    thread = threading.Thread(target=_cleanup_loop,
                              args=(app, uploads_dir, retention_seconds, check_interval_seconds),
                              daemon=True,
                              name='uploads-cleanup')
    thread.start()
    app.logger.info('uploads-cleanup: background thread started; retention_hours=%s check_interval_minutes=%s',
                    retention_hours, check_interval_minutes)
