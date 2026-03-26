# sector package
# Modules:
#   sector_engine   - raw AEGIS metrics for all sector indices
#   sector_health   - full daily health matrices (trend/spike/regime/score)
#   sector_monitor  - TrendCaster-powered macro + sector ranking monitor

from .sector_engine import sector_engine, run_all_sectors, SECTOR_INDICES, SECTOR_METRIC_COLS
from .sector_health import (
    compute_sector_health,
    run_all_sector_health,
    sector_health_on_date,
    rolling_health_matrix,
)

__all__ = [
    # engine
    "SECTOR_INDICES",
    "SECTOR_METRIC_COLS",
    "sector_engine",
    "run_all_sectors",
    # health
    "compute_sector_health",
    "run_all_sector_health",
    "sector_health_on_date",
    "rolling_health_matrix",
]
