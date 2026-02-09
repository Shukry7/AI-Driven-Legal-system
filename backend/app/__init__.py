from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import traceback


def create_app():
    app = Flask(__name__)
    # Allow requests from the frontend dev server on localhost:8080
    CORS(app, resources={r"/*": {"origins": [
        "http://localhost:8080",
        "http://127.0.0.1:8080"
    ]}}, supports_credentials=True)

    # Configure logging to terminal
    handler = logging.StreamHandler()
    handler.setLevel(logging.INFO)
    fmt = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler.setFormatter(fmt)

    # Attach handler to the app logger and root logger if not already attached
    if not any(isinstance(h, logging.StreamHandler) for h in app.logger.handlers):
        app.logger.addHandler(handler)
    root_logger = logging.getLogger()
    if not any(isinstance(h, logging.StreamHandler) for h in root_logger.handlers):
        root_logger.addHandler(handler)
    app.logger.setLevel(logging.INFO)

    @app.before_request
    def log_request():
        origin = request.headers.get("Origin")
        app.logger.info(
            "Incoming request: %s %s from %s (Origin=%s)",
            request.method,
            request.path,
            request.remote_addr,
            origin,
        )

    @app.errorhandler(Exception)
    def handle_exception(err):
        tb = traceback.format_exc()
        app.logger.error("Unhandled Exception: %s\n%s", err, tb)
        response = {
            "error": "internal_server_error",
            "message": str(err)
        }
        return jsonify(response), 500

    from .api import main
    app.register_blueprint(main)

    return app
