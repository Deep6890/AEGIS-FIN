"""
logger.py — Structured logging for AEGIS-FIN
---------------------------------------------
Single place to configure logging for the entire system.
Every module imports get_logger(__name__) — no print() calls in production code.

Usage
-----
    from LogicEngine.logger import get_logger
    log = get_logger(__name__)

    log.info("fetch.start", ticker="TCS.NS")
    log.warning("fetch.retry", ticker="TCS.NS", attempt=2, error="timeout")
    log.error("fetch.failed", ticker="TCS.NS", attempts=3, error="ConnectionError")
    log.debug("health.computed", name="IT Sector", health_score=72.1)

Log levels
----------
    DEBUG   — internal computation details (disabled in production)
    INFO    — normal operation events (fetch start/end, module run)
    WARNING — recoverable issues (retry, missing optional data)
    ERROR   — failures that affect output (fetch failed, schema invalid)

Output format
-------------
    Development : human-readable coloured text to stdout
    Production  : JSON lines to stdout (set AEGIS_LOG_FORMAT=json)

Environment variables
---------------------
    AEGIS_LOG_LEVEL   : DEBUG | INFO | WARNING | ERROR  (default INFO)
    AEGIS_LOG_FORMAT  : text | json                     (default text)
"""

import json
import logging
import os
import sys
from datetime import datetime, timezone
from typing import Any


# ── Config from environment ───────────────────────────────────────────────────

_LEVEL  = os.environ.get("AEGIS_LOG_LEVEL",  "INFO").upper()
_FORMAT = os.environ.get("AEGIS_LOG_FORMAT", "text").lower()


# ── JSON formatter ────────────────────────────────────────────────────────────

class _JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts":      datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z",
            "level":   record.levelname,
            "logger":  record.name,
            "event":   record.getMessage(),
        }
        # Attach any extra kwargs passed via log.info("event", key=val)
        for k, v in record.__dict__.items():
            if k not in ("name", "msg", "args", "levelname", "levelno", "pathname",
                         "filename", "module", "exc_info", "exc_text", "stack_info",
                         "lineno", "funcName", "created", "msecs", "relativeCreated",
                         "thread", "threadName", "processName", "process", "message"):
                payload[k] = v
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)


# ── Text formatter ────────────────────────────────────────────────────────────

class _TextFormatter(logging.Formatter):
    _COLOURS = {
        "DEBUG":   "\033[36m",   # cyan
        "INFO":    "\033[32m",   # green
        "WARNING": "\033[33m",   # yellow
        "ERROR":   "\033[31m",   # red
        "RESET":   "\033[0m",
    }

    def format(self, record: logging.LogRecord) -> str:
        c     = self._COLOURS.get(record.levelname, "")
        reset = self._COLOURS["RESET"]
        ts    = datetime.now(timezone.utc).strftime("%H:%M:%S")
        base  = f"{c}[{record.levelname[0]}]{reset} {ts} {record.name} — {record.getMessage()}"

        extras = {k: v for k, v in record.__dict__.items()
                  if k not in ("name", "msg", "args", "levelname", "levelno", "pathname",
                               "filename", "module", "exc_info", "exc_text", "stack_info",
                               "lineno", "funcName", "created", "msecs", "relativeCreated",
                               "thread", "threadName", "processName", "process", "message",
                               "taskName")}
        if extras:
            kv = "  ".join(f"{k}={v}" for k, v in extras.items())
            base += f"  {kv}"
        if record.exc_info:
            base += "\n" + self.formatException(record.exc_info)
        return base


# ── Logger factory ────────────────────────────────────────────────────────────

class _KwargsLogger(logging.LoggerAdapter):
    """Wraps a standard Logger so extra kwargs are attached to the LogRecord."""

    def process(self, msg, kwargs):
        extra = kwargs.pop("extra", {})
        # Move all remaining kwargs into extra so the formatter can see them
        extra.update(kwargs)
        return msg, {"extra": extra}

    # Convenience: allow log.info("event", key=val) syntax
    def info(self, msg, *args, **kwargs):    super().info(msg, *args, **kwargs)
    def debug(self, msg, *args, **kwargs):   super().debug(msg, *args, **kwargs)
    def warning(self, msg, *args, **kwargs): super().warning(msg, *args, **kwargs)
    def error(self, msg, *args, **kwargs):   super().error(msg, *args, **kwargs)


_configured = False

def _configure_root():
    global _configured
    if _configured:
        return
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(_JsonFormatter() if _FORMAT == "json" else _TextFormatter())
    root = logging.getLogger("aegis")
    root.setLevel(getattr(logging, _LEVEL, logging.INFO))
    if not root.handlers:
        root.addHandler(handler)
    root.propagate = False
    _configured = True


def get_logger(name: str) -> _KwargsLogger:
    """
    Return a structured logger for the given module name.

    Parameters
    ----------
    name : str  Typically __name__ of the calling module.

    Returns
    -------
    _KwargsLogger  — supports log.info("event", key=val, ...) syntax
    """
    _configure_root()
    # Prefix all loggers under "aegis" namespace
    logger_name = f"aegis.{name}" if not name.startswith("aegis") else name
    return _KwargsLogger(logging.getLogger(logger_name), extra={})
