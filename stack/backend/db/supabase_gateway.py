"""
supabase_gateway.py  v3.1
--------------------------
- Upserts all pipeline layers (no duplicates via conflict keys)
- Enforces 6-month data retention (auto-deletes rows older than 6 months)
- Sector data pushed correctly (sector_id resolved from name)
- Null-safe for all float fields
"""

import os, math
from datetime import datetime, timezone, timedelta
from typing import Optional
import pandas as pd
from supabase import create_client, Client

# Retention policy: keep only last 6 months of data
RETENTION_CUTOFF = (datetime.now(timezone.utc) - timedelta(days=180)).strftime("%Y-%m-%d")


def _get_client() -> Client:
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])


def _clean(val):
    if val is None:
        return None
    try:
        if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
            return None
    except TypeError:
        pass
    return val


def _date(row, col="Date", fallback="") -> str:
    v = row.get(col, fallback)
    if v is None:
        return fallback
    return str(v)[:10]


class AegisGateway:
    def __init__(self, client: Optional[Client] = None):
        self.db: Client = client or _get_client()
        self._company_cache: dict = {}
        self._sector_cache:  dict = {}
        # Pre-load sector cache
        self._load_sectors()

    def _load_sectors(self):
        try:
            res = self.db.table("sectors").select("id,name").execute()
            for row in (res.data or []):
                self._sector_cache[row["name"]] = row["id"]
        except Exception:
            pass

    # ── Lookup ────────────────────────────────────────────────────────────────

    def _company_id(self, name: str, ticker: str = None) -> int:
        if name in self._company_cache:
            return self._company_cache[name]
        payload = {"name": name}
        if ticker:
            payload["ticker"] = ticker
        res = self.db.table("companies").upsert(payload, on_conflict="name").execute()
        cid = res.data[0]["id"]
        self._company_cache[name] = cid
        return cid

    def _sector_id(self, name: str) -> Optional[int]:
        if name in self._sector_cache:
            return self._sector_cache[name]
        try:
            res = self.db.table("sectors").select("id").eq("name", name).single().execute()
            sid = res.data["id"]
            self._sector_cache[name] = sid
            return sid
        except Exception:
            return None

    # ── Upsert + dedup ────────────────────────────────────────────────────────

    def _upsert(self, table: str, records: list, conflict: str):
        if not records:
            return
        keys = [k.strip() for k in conflict.split(",")]
        seen, deduped = set(), []
        for rec in records:
            sig = tuple(rec.get(k) for k in keys)
            if sig not in seen:
                seen.add(sig)
                deduped.append(rec)
        for i in range(0, len(deduped), 500):
            self.db.table(table).upsert(deduped[i:i+500], on_conflict=conflict).execute()

    # ── 6-month retention ─────────────────────────────────────────────────────

    def _prune(self, table: str, date_col: str = "date"):
        """Delete rows older than 6 months to stay within free tier limits."""
        try:
            self.db.table(table).delete().lt(date_col, RETENTION_CUTOFF).execute()
        except Exception as e:
            print(f"  [prune] {table}: {e}")

    # ── Layer 1: sector_metrics ───────────────────────────────────────────────

    def _push_sector_metrics(self, run_at: str, sector_metrics: dict):
        records = []
        for sector_name, df in sector_metrics.items():
            if df is None or (hasattr(df, "empty") and df.empty):
                continue
            sid = self._sector_id(sector_name)
            if sid is None:
                continue
            tmp = df.reset_index() if "Date" not in df.columns else df.copy()
            for _, row in tmp.iterrows():
                d = _date(row)
                if not d or d < RETENTION_CUTOFF:
                    continue
                records.append({
                    "run_at": run_at, "sector_id": sid, "date": d,
                    "close":                 _clean(row.get("Close")),
                    "sector_return_1d":      _clean(row.get("sector_return_1d")),
                    "sector_return_5d":      _clean(row.get("sector_return_5d")),
                    "sector_return_20d":     _clean(row.get("sector_return_20d")),
                    "sector_volatility_20d": _clean(row.get("sector_volatility_20d")),
                    "sector_atr":            _clean(row.get("sector_atr")),
                    "sector_drawdown_20d":   _clean(row.get("sector_drawdown_20d")),
                    "sector_volume_ratio":   _clean(row.get("sector_volume_ratio")),
                    "sector_momentum":       _clean(row.get("sector_momentum")),
                    "sector_trend":          row.get("sector_trend") or row.get("Sector_trend"),
                })
        self._upsert("sector_metrics", records, "sector_id,date")
        self._prune("sector_metrics")

    # ── Layer 2: sector_health ────────────────────────────────────────────────

    def _push_sector_health(self, run_at: str, health_dfs: dict):
        records = []
        for sector_name, df in health_dfs.items():
            if df is None or (hasattr(df, "empty") and df.empty):
                continue
            sid = self._sector_id(sector_name)
            if sid is None:
                continue
            tmp = df.reset_index() if "Date" not in df.columns else df.copy()
            for _, row in tmp.iterrows():
                d = _date(row)
                if not d or d < RETENTION_CUTOFF:
                    continue
                records.append({
                    "run_at": run_at, "sector_id": sid, "date": d,
                    "close":        _clean(row.get("Close")),
                    "daily_return": _clean(row.get("daily_return")),
                    "ema_short":    _clean(row.get("ema_short")),
                    "ema_long":     _clean(row.get("ema_long")),
                    "trend":        str(row.get("trend", "")) or None,
                    "spike_up":     bool(row.get("spike_up", False)),
                    "spike_down":   bool(row.get("spike_down", False)),
                    "ret_z":        _clean(row.get("ret_z")),
                    "vol_z":        _clean(row.get("vol_z")),
                    "momentum_z":   _clean(row.get("momentum_z")),
                    "slope_z":      _clean(row.get("slope_z")),
                    "composite":    _clean(row.get("composite")),
                    "health_score": _clean(row.get("health_score")),
                    "signal":       str(row.get("signal", "INSUFFICIENT_DATA")) or "INSUFFICIENT_DATA",
                    "regime":       str(row.get("regime", "NEUTRAL")) or "NEUTRAL",
                    "market_phase": str(row.get("market_phase", "")) or None,
                })
        self._upsert("sector_health", records, "sector_id,date")
        self._prune("sector_health")

    # ── Macro overlay ─────────────────────────────────────────────────────────

    def _push_macro_overlay(self, run_at: str, df: pd.DataFrame):
        if df is None or (hasattr(df, "empty") and df.empty):
            return
        records = []
        for _, row in df.iterrows():
            d = _date(row)
            if not d or d < RETENTION_CUTOFF:
                continue
            records.append({
                "run_at": run_at, "date": d,
                "macro_regime":    row.get("macro_regime", "NEUTRAL"),
                "macro_score":     _clean(row.get("macro_score")),
                "vix_z":           _clean(row.get("India VIX")),
                "usd_z":           _clean(row.get("USD-INR")),
                "gold_z":          _clean(row.get("Gold")),
                "crude_z":         _clean(row.get("Crude Oil")),
                "macro_narrative": row.get("macro_narrative"),
            })
        self._upsert("macro_overlay", records, "date")
        self._prune("macro_overlay")

    # ── Layer 3: company_metrics ──────────────────────────────────────────────

    def _push_company_metrics(self, run_at: str, company_id: int, df: pd.DataFrame):
        if df is None or (hasattr(df, "empty") and df.empty):
            return
        records = []
        for _, row in df.iterrows():
            d = _date(row)
            if not d or d < RETENTION_CUTOFF:
                continue
            records.append({
                "run_at": run_at, "company_id": company_id, "date": d,
                "close":                  _clean(row.get("Close")),
                "company_return_1d":      _clean(row.get("company_return_1d")),
                "company_return_5d":      _clean(row.get("company_return_5d")),
                "company_return_20d":     _clean(row.get("company_return_20d")),
                "company_volatility_20d": _clean(row.get("company_volatility_20d")),
                "company_atr":            _clean(row.get("company_atr")),
                "company_drawdown_20d":   _clean(row.get("company_drawdown_20d")),
                "company_volume_ratio":   _clean(row.get("company_volume_ratio")),
                "company_momentum":       _clean(row.get("company_momentum")),
                "company_trend":          str(row.get("company_trend", "")) or None,
            })
        self._upsert("company_metrics", records, "company_id,date")
        self._prune("company_metrics")

    # ── Layer 4a: static_corr ─────────────────────────────────────────────────

    def _push_static_corr(self, run_at: str, company_id: int, df: pd.DataFrame):
        if df is None or (hasattr(df, "empty") and df.empty):
            return
        records = []
        for _, row in df.iterrows():
            sector_name = row.get("Sector") or row.get("index") or row.get("sector")
            if not sector_name:
                continue
            sid = self._sector_id(str(sector_name))
            if sid is None:
                continue
            d = _date(row)
            if not d:
                continue
            records.append({
                "run_at": run_at, "company_id": company_id, "sector_id": sid, "date": d,
                "return_1d":      _clean(row.get("return_1d")),
                "return_5d":      _clean(row.get("return_5d")),
                "return_20d":     _clean(row.get("return_20d")),
                "volatility_20d": _clean(row.get("volatility_20d")),
                "atr":            _clean(row.get("atr")),
                "drawdown_20d":   _clean(row.get("drawdown_20d")),
                "volume_ratio":   _clean(row.get("volume_ratio")),
                "momentum":       _clean(row.get("momentum")),
            })
        self._upsert("static_corr", records, "company_id,sector_id,date")

    # ── Layer 4b: rolling_corr ────────────────────────────────────────────────

    def _push_rolling_corr(self, run_at: str, company_id: int, df: pd.DataFrame):
        if df is None or (hasattr(df, "empty") and df.empty):
            return
        records = []
        for _, row in df.iterrows():
            sector_name = row.get("Sector")
            if not sector_name:
                continue
            sid = self._sector_id(str(sector_name))
            if sid is None:
                continue
            d = _date(row)
            if not d or d < RETENTION_CUTOFF:
                continue
            records.append({
                "run_at": run_at, "company_id": company_id, "sector_id": sid,
                "date": d, "window_days": int(row.get("Window", 0)),
                "return_1d":      _clean(row.get("return_1d")),
                "return_5d":      _clean(row.get("return_5d")),
                "return_20d":     _clean(row.get("return_20d")),
                "volatility_20d": _clean(row.get("volatility_20d")),
                "atr":            _clean(row.get("atr")),
                "drawdown_20d":   _clean(row.get("drawdown_20d")),
                "volume_ratio":   _clean(row.get("volume_ratio")),
                "momentum":       _clean(row.get("momentum")),
            })
        self._upsert("rolling_corr", records, "company_id,sector_id,date,window_days")
        self._prune("rolling_corr")

    # ── Layer 5: top_sectors ──────────────────────────────────────────────────

    def _push_top_sectors(self, run_at: str, company_id: int, df: pd.DataFrame):
        if df is None or (hasattr(df, "empty") and df.empty):
            return
        date_val = str(df["Date"].iloc[0])[:10] if "Date" in df.columns else run_at[:10]
        records = []
        for _, row in df.iterrows():
            sector_name = row.get("sector")
            if not sector_name:
                continue
            sid = self._sector_id(str(sector_name))
            if sid is None:
                continue
            records.append({
                "run_at": run_at, "company_id": company_id,
                "sector_id": sid, "date": date_val,
                "rank": int(row.get("rank", 0)),
            })
        self._upsert("top_sectors", records, "company_id,date,rank")

    # ── Layer 6: balance_sheet ────────────────────────────────────────────────

    def _push_balance_sheet(self, run_at: str, company_id: int, df: pd.DataFrame):
        if df is None or (hasattr(df, "empty") and df.empty):
            return
        date_val = str(df["Date"].iloc[0])[:10] if "Date" in df.columns else run_at[:10]
        records = []
        for _, row in df.iterrows():
            ratio = row.get("Ratio")
            if not ratio:
                continue
            # Skip rows where both value and value_str are null
            val     = _clean(row.get("Value"))
            val_str = row.get("ValueStr")
            if val is None and not val_str:
                continue
            records.append({
                "run_at": run_at, "company_id": company_id, "date": date_val,
                "ratio":               ratio,
                "value":               val,
                "value_str":           val_str,
                "yoy_pct":             _clean(row.get("YoY_pct")),
                "hist_pct_rank":       _clean(row.get("HistPctRank")),
                "status":              row.get("Status") or "gray",
                "trend":               row.get("Trend"),
                "description":         row.get("Description"),
                "category":            row.get("Category"),
                "sector_pressure":     _clean(row.get("SectorPressure")),
                "sector_pressure_pct": _clean(row.get("SectorPressurePct")),
                "adjusted_status":     row.get("AdjustedStatus") or row.get("Status") or "gray",
                "sector_narrative":    row.get("SectorNarrative"),
            })
        self._upsert("balance_sheet", records, "company_id,date,ratio")

    # ── Layer 6b: balance_sheet_history ──────────────────────────────────────

    def _push_balance_sheet_history(self, run_at: str, company_id: int, df: pd.DataFrame):
        if df is None or (hasattr(df, "empty") and df.empty):
            return
        records = []
        for _, row in df.iterrows():
            d = _date(row)
            if not d or d < RETENTION_CUTOFF:
                continue
            val = _clean(row.get("Value"))
            if val is None:
                continue
            records.append({
                "run_at": run_at, "company_id": company_id,
                "date": d, "ratio": row.get("Ratio"), "value": val,
            })
        self._upsert("balance_sheet_history", records, "company_id,date,ratio")
        self._prune("balance_sheet_history")

    # ── Layer 7: holding_metrics ──────────────────────────────────────────────

    def _push_holding_metrics(self, run_at: str, company_id: int, df: pd.DataFrame):
        if df is None or (hasattr(df, "empty") and df.empty):
            return
        date_val = str(df["Date"].iloc[0])[:10] if "Date" in df.columns else run_at[:10]
        records = []
        for _, row in df.iterrows():
            metric = row.get("Metric")
            if not metric:
                continue
            records.append({
                "run_at": run_at, "company_id": company_id, "date": date_val,
                "metric":              metric,
                "value":               _clean(row.get("Value")),
                "status":              row.get("Status") or "gray",
                "trend":               row.get("Trend"),
                "description":         row.get("Description"),
                "category":            row.get("Category"),
                "sector_pressure":     _clean(row.get("SectorPressure")),
                "sector_pressure_pct": _clean(row.get("SectorPressurePct")),
                "sector_signal":       row.get("SectorSignal"),
                "adjusted_status":     row.get("AdjustedStatus") or row.get("Status") or "gray",
            })
        self._upsert("holding_metrics", records, "company_id,date,metric")

    # ── Layer 8: ml_predictions ───────────────────────────────────────────────

    def _push_ml_predictions(self, run_at: str, company_id: int, df: pd.DataFrame):
        if df is None or (hasattr(df, "empty") and df.empty):
            return
        records = []
        for _, row in df.iterrows():
            d = _date(row)
            if not d:
                continue
            records.append({
                "run_at": run_at, "company_id": company_id, "date": d,
                "model_version":        row.get("model_version", "v1.0"),
                "survival_score":       _clean(row.get("SurvivalScore")),
                "distress_probability": _clean(row.get("DistressProbability")),
                "explanation_json":     row.get("ExplanationJSON"),
            })
        # One row per company per date per model — no duplicates
        self._upsert("ml_predictions", records, "company_id,date,model_version")

    # ── Layer 9: feature_store ────────────────────────────────────────────────

    def _push_feature_store(self, run_at: str, company_id: int, df: pd.DataFrame):
        if df is None or (hasattr(df, "empty") and df.empty):
            return
        records = []
        for _, row in df.iterrows():
            d = _date(row)
            if not d:
                continue
            records.append({
                "run_at": run_at, "company_id": company_id, "date": d,
                "debt_to_equity":         _clean(row.get("DebtToEquity")),
                "current_ratio":          _clean(row.get("CurrentRatio")),
                "revenue_growth":         _clean(row.get("RevenueGrowth")),
                "sector_correlation_60d": _clean(row.get("SectorCorrelation60d")),
                "sector_health_score":    _clean(row.get("SectorHealthScore")),
                "hhi_concentration":      _clean(row.get("HHIConcentration")),
                "institutional_holding":  _clean(row.get("InstitutionalHolding")),
            })
        self._upsert("feature_store", records, "company_id,date")
        self._prune("feature_store")

    # ── Master push ───────────────────────────────────────────────────────────

    def push(self, result: dict) -> dict:
        run_at       = result["run_at"]
        display_name = result["company"]
        ticker       = result.get("ticker", "")
        status       = {}

        company_id = self._company_id(display_name, ticker)

        layers = [
            ("layer1_sector_metrics",     lambda: self._push_sector_metrics(run_at, result["layer1_sector_metrics"])),
            ("layer2_macro_overlay",      lambda: self._push_macro_overlay(run_at, result["layer2_macro_overlay"])),
            ("layer2_sector_health",      lambda: self._push_sector_health(run_at, result["layer2_health_dfs"])),
            ("layer3_company_metrics",    lambda: self._push_company_metrics(run_at, company_id, result["layer3_company"])),
            ("layer4_static_corr",        lambda: self._push_static_corr(run_at, company_id, result["layer4_static_corr"])),
            ("layer4_rolling_corr",       lambda: self._push_rolling_corr(run_at, company_id, result["layer4_rolling_corr"])),
            ("layer5_top_sectors",        lambda: self._push_top_sectors(run_at, company_id, result["layer5_top_sectors"])),
            ("layer6_balance_sheet",      lambda: self._push_balance_sheet(run_at, company_id, result["layer6_balance_sheet"])),
            ("layer6b_bs_history",        lambda: self._push_balance_sheet_history(run_at, company_id, result["layer6b_historical_ratios"])),
            ("layer7_holding_metrics",    lambda: self._push_holding_metrics(run_at, company_id, result["layer7_holding"])),
            ("layer8_ml_predictions",     lambda: self._push_ml_predictions(run_at, company_id, result["layer8_ml_predictions"])),
            ("layer9_feature_store",      lambda: self._push_feature_store(run_at, company_id, result["layer9_feature_store"])),
        ]

        for key, fn in layers:
            data = result.get(key.replace("layer2_sector_health", "layer2_health_dfs")
                               .replace("layer3_company_metrics", "layer3_company")
                               .replace("layer4_static_corr", "layer4_static_corr")
                               .replace("layer6b_bs_history", "layer6b_historical_ratios")
                               .replace("layer7_holding_metrics", "layer7_holding")
                               .replace("layer8_ml_predictions", "layer8_ml_predictions")
                               .replace("layer9_feature_store", "layer9_feature_store"))
            # Map display key to result key
            result_key_map = {
                "layer1_sector_metrics":  "layer1_sector_metrics",
                "layer2_macro_overlay":   "layer2_macro_overlay",
                "layer2_sector_health":   "layer2_health_dfs",
                "layer3_company_metrics": "layer3_company",
                "layer4_static_corr":     "layer4_static_corr",
                "layer4_rolling_corr":    "layer4_rolling_corr",
                "layer5_top_sectors":     "layer5_top_sectors",
                "layer6_balance_sheet":   "layer6_balance_sheet",
                "layer6b_bs_history":     "layer6b_historical_ratios",
                "layer7_holding_metrics": "layer7_holding",
                "layer8_ml_predictions":  "layer8_ml_predictions",
                "layer9_feature_store":   "layer9_feature_store",
            }
            rk   = result_key_map[key]
            data = result.get(rk)
            is_empty = (data is None or
                        (isinstance(data, dict) and not data) or
                        (hasattr(data, "empty") and data.empty))
            if is_empty:
                status[key] = "skipped"
                continue
            try:
                fn()
                status[key] = "ok"
            except Exception as e:
                status[key] = f"error: {e}"
                print(f"  [gateway] {key}: {e}")

        ok      = sum(1 for v in status.values() if v == "ok")
        skipped = sum(1 for v in status.values() if v == "skipped")
        errors  = [(k, v) for k, v in status.items() if v.startswith("error")]
        print(f"  [gateway] {display_name}: ok={ok} skipped={skipped} errors={len(errors)}")
        for k, v in errors:
            print(f"    ✘ {k}: {v}")
        return status
