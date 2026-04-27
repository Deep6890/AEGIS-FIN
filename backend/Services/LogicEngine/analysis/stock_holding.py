"""
stock_holding.py  v2
--------------------
Analyses institutional / promoter shareholding patterns.

New in v2:
  - Public float %, Promoter %, FII %, DII %
  - Top-10 holder breakdown (for pie chart)
  - 52-week high/low distance
  - Insight text per metric (no nulls in output)
  - raw_breakdown JSONB for frontend pie charts

Input  : holder_data dict from fetcher.py
Output : dict with keys:
    ticker, info, raw, metrics, full_metrics,
    sector_overlay, holding_signal,
    insights (list of insight strings),
    breakdown (dict for pie chart)
"""

import numpy as np
import pandas as pd

from .scoring import parse_pct, pct_status, sector_pressure
from LogicEngine.logger import get_logger
from LogicEngine.schema import validate_holders

log = get_logger(__name__)


# ── Insight generator ─────────────────────────────────────────────────────────

def _insight(name: str, val, status: str, trend: str) -> tuple:
    """
    Returns (insight_text, severity) for a metric.
    severity: positive | negative | neutral | warning
    """
    if val is None:
        return "Insufficient data.", "neutral"

    v = float(val)

    if name == "Institutional Ownership %":
        if v >= 50:  return f"Strong institutional backing at {v:.1f}%. High confidence signal.", "positive"
        if v >= 25:  return f"Moderate institutional interest at {v:.1f}%.", "neutral"
        return f"Low institutional ownership at {v:.1f}%. Limited institutional confidence.", "warning"

    if name == "Insider Ownership %":
        if v >= 50:  return f"Promoter/insider holds {v:.1f}%. High alignment with shareholders.", "positive"
        if v >= 20:  return f"Insider stake at {v:.1f}%. Moderate skin-in-the-game.", "neutral"
        return f"Low insider ownership at {v:.1f}%. Potential misalignment risk.", "warning"

    if name == "Promoter Holding %":
        if v >= 60:  return f"Promoter holds {v:.1f}%. Strong founder control.", "positive"
        if v >= 35:  return f"Promoter stake at {v:.1f}%. Moderate control.", "neutral"
        return f"Low promoter holding at {v:.1f}%. Diluted founder control.", "warning"

    if name == "FII Holding %":
        if v >= 20:  return f"FII holding at {v:.1f}%. Strong foreign institutional interest.", "positive"
        if v >= 5:   return f"FII holding at {v:.1f}%. Moderate foreign interest.", "neutral"
        return f"Minimal FII presence at {v:.1f}%.", "neutral"

    if name == "DII Holding %":
        if v >= 15:  return f"DII holding at {v:.1f}%. Strong domestic institutional support.", "positive"
        if v >= 5:   return f"DII holding at {v:.1f}%. Moderate domestic interest.", "neutral"
        return f"Low DII presence at {v:.1f}%.", "neutral"

    if name == "Public Float %":
        if v >= 50:  return f"High public float at {v:.1f}%. Good liquidity.", "positive"
        if v >= 25:  return f"Moderate float at {v:.1f}%.", "neutral"
        return f"Low float at {v:.1f}%. Potential liquidity risk.", "warning"

    if name == "Holder Concentration (HHI)":
        if v > 0.25: return f"High concentration (HHI={v:.3f}). Few dominant holders — elevated risk.", "negative"
        if v > 0.15: return f"Moderate concentration (HHI={v:.3f}).", "warning"
        return f"Diversified ownership (HHI={v:.3f}). Low concentration risk.", "positive"

    if name == "Top 10 Holders %":
        if v >= 70:  return f"Top 10 holders control {v:.1f}%. Highly concentrated.", "warning"
        if v >= 50:  return f"Top 10 holders control {v:.1f}%. Moderate concentration.", "neutral"
        return f"Top 10 holders control {v:.1f}%. Well distributed.", "positive"

    if "Insider Net Buy" in name:
        if v > 10:   return f"Net insider buying at {v:.1f}%. Strong insider confidence.", "positive"
        if v > 0:    return f"Slight net insider buying at {v:.1f}%.", "positive"
        if v < -10:  return f"Net insider selling at {v:.1f}%. Caution warranted.", "negative"
        return f"Balanced insider activity ({v:.1f}%).", "neutral"

    if "Volatility" in name:
        if v > 50:   return f"High annualised volatility at {v:.1f}%. Elevated price risk.", "negative"
        if v > 25:   return f"Moderate volatility at {v:.1f}%.", "neutral"
        return f"Low volatility at {v:.1f}%. Stable price action.", "positive"

    if "52W High" in name:
        if v < -30:  return f"{abs(v):.1f}% below 52-week high. Significant drawdown.", "negative"
        if v < -10:  return f"{abs(v):.1f}% below 52-week high. Moderate pullback.", "warning"
        return f"Near 52-week high ({abs(v):.1f}% below). Strong momentum.", "positive"

    if "52W Low" in name:
        if v < 10:   return f"Only {v:.1f}% above 52-week low. Near support zone.", "warning"
        if v < 30:   return f"{v:.1f}% above 52-week low. Recovering.", "neutral"
        return f"{v:.1f}% above 52-week low. Well above support.", "positive"

    return f"Value: {v:.2f}.", "neutral"


# ── Metrics engine ────────────────────────────────────────────────────────────

def compute_holding_metrics(holder_data: dict, lookback_days: int = 90) -> tuple:
    """
    Returns (metrics_df, breakdown_dict, insights_dict)
    breakdown_dict: { "ownership_pie": [...], "top_holders": [...] }
    insights_dict: comprehensive insights for the new insights table
    """
    inst  = holder_data.get("institutional", pd.DataFrame())
    ins_t = holder_data.get("insider_trans",  pd.DataFrame())
    info  = holder_data.get("info",           {})
    ph    = holder_data.get("price_history",  pd.DataFrame())
    rows  = []
    breakdown = {"ownership_pie": [], "top_holders": []}
    insights = {"key_insights": [], "risk_factors": [], "sector_comparison": {}}

    def add(name, val, status="gray", trend="neutral", desc="", cat="Ownership"):
        insight_text, severity = _insight(name, val, status, trend)
        rows.append({
            "Metric":           name,
            "Value":            round(float(val), 4) if (val is not None and not pd.isna(val)) else None,
            "Status":           status,
            "Trend":            trend,
            "Description":      desc,
            "Category":         cat,
            "Insight":          insight_text,
            "InsightSeverity":  severity,
        })

    # ── Enhanced Ownership Analysis ───────────────────────────────────────────
    ip = parse_pct(info.get("heldPercentInstitutions", np.nan))
    iip = parse_pct(info.get("heldPercentInsiders", np.nan))
    
    # Institutional Ownership
    if not pd.isna(ip):
        st = "gray"
        if not inst.empty and "% Out" in inst.columns:
            hp = inst["% Out"].apply(parse_pct).dropna()
            st = "green" if ip > hp.sum() * 0.5 else "amber"
        add("Institutional Ownership %", ip, st, "neutral", "% held by institutions")
        if ip >= 50:
            insights["key_insights"].append(f"Strong institutional backing at {ip:.1f}%")
        elif ip < 25:
            insights["risk_factors"].append(f"Low institutional confidence at {ip:.1f}%")

    # Insider/Promoter Ownership
    if not pd.isna(iip):
        add("Insider Ownership %", iip, "gray", "neutral", "% held by insiders/promoters")
        # Also add as Promoter Holding % for clarity
        add("Promoter Holding %", iip, "green" if iip >= 35 else "amber" if iip >= 20 else "red", 
            "neutral", "% held by promoters")
        if iip >= 60:
            insights["key_insights"].append(f"Strong promoter control at {iip:.1f}%")
        elif iip < 20:
            insights["risk_factors"].append(f"Low promoter stake may indicate diluted control")

    # Public Float
    float_pct = None
    if not pd.isna(ip) and not pd.isna(iip):
        float_pct = max(0.0, 100.0 - ip - iip)
        st = "green" if float_pct >= 50 else "amber" if float_pct >= 25 else "red"
        add("Public Float %", float_pct, st, "neutral", "% shares available for public trading")
        if float_pct < 25:
            insights["risk_factors"].append(f"Low public float ({float_pct:.1f}%) may impact liquidity")

    # Enhanced FII/DII Analysis
    major = holder_data.get("major", pd.DataFrame())
    fii_pct = None
    dii_pct = None
    if not major.empty:
        mc = major.copy()
        mc.columns = mc.columns.str.lower()
        if "value" in mc.columns and "% out" in mc.columns:
            mc["pct"] = mc["% out"].apply(parse_pct)
            if "holder" in mc.columns:
                # Enhanced FII/DII detection
                dii_patterns = [
                    "mutual", "fund", "insurance", "lic", "sbi", "hdfc", "icici", "axis", 
                    "kotak", "nippon", "uti", "birla", "aditya", "reliance", "tata"
                ]
                dii_mask = mc["holder"].str.lower().str.contains(
                    "|".join(dii_patterns), na=False, regex=True
                )
                dii_pct = float(mc.loc[dii_mask, "pct"].sum()) if dii_mask.any() else None
                fii_pct = float(mc.loc[~dii_mask, "pct"].sum()) if (~dii_mask).any() else None

    if fii_pct is not None and not pd.isna(fii_pct) and fii_pct > 0:
        st = "green" if fii_pct >= 20 else "amber" if fii_pct >= 5 else "gray"
        add("FII Holding %", fii_pct, st, "neutral", "% held by Foreign Institutional Investors")
        if fii_pct >= 20:
            insights["key_insights"].append(f"Strong FII confidence with {fii_pct:.1f}% holding")

    if dii_pct is not None and not pd.isna(dii_pct) and dii_pct > 0:
        st = "green" if dii_pct >= 15 else "amber" if dii_pct >= 5 else "gray"
        add("DII Holding %", dii_pct, st, "neutral", "% held by Domestic Institutional Investors")
        if dii_pct >= 15:
            insights["key_insights"].append(f"Strong domestic institutional support at {dii_pct:.1f}%")

    # Enhanced Concentration Analysis
    if not inst.empty and "% Out" in inst.columns:
        w = inst["% Out"].apply(parse_pct).dropna() / 100
        hhi = float((w ** 2).sum()) if not w.empty else np.nan
        if not pd.isna(hhi):
            st = "red" if hhi > 0.25 else "amber" if hhi > 0.15 else "green"
            add("Holder Concentration (HHI)", hhi, st, "neutral",
                "HHI of top holders (0=diversified, 1=single holder)", "Concentration")
            if hhi > 0.25:
                insights["risk_factors"].append(f"High ownership concentration (HHI={hhi:.3f})")

        # Top 10 holders analysis
        top10_pct = float(w.nlargest(10).sum() * 100) if len(w) >= 3 else np.nan
        if not pd.isna(top10_pct):
            st = "red" if top10_pct >= 70 else "amber" if top10_pct >= 50 else "green"
            add("Top 10 Holders %", top10_pct, st, "neutral",
                "% held by top 10 institutional holders", "Concentration")

        # Enhanced top holders breakdown for pie chart
        if "Holder" in inst.columns or "holder" in inst.columns.str.lower().tolist():
            holder_col = "Holder" if "Holder" in inst.columns else "holder"
            pct_col    = "% Out"
            top_holders = inst[[holder_col, pct_col]].copy()
            top_holders.columns = ["name", "pct"]
            top_holders["pct"] = top_holders["pct"].apply(parse_pct)
            top_holders = top_holders.dropna().nlargest(10, "pct")
            breakdown["top_holders"] = [
                {"name": str(r["name"]), "value": round(float(r["pct"]), 2)}
                for _, r in top_holders.iterrows()
            ]

    # Enhanced Insider Activity Analysis
    if not ins_t.empty:
        td = ins_t.copy()
        td.columns = td.columns.str.lower()
        if "start date" in td.columns:
            td["start date"] = pd.to_datetime(td["start date"], errors="coerce")
            td = td[td["start date"] >= pd.Timestamp.now() - pd.Timedelta(days=lookback_days)]
        if "transaction" in td.columns and not td.empty:
            tl = td["transaction"].str.lower()
            buys  = tl.str.contains("buy",  na=False).sum()
            sells = tl.str.contains("sell", na=False).sum()
            total = buys + sells
            if total > 0:
                nb = (buys - sells) / total * 100
                st = "green" if nb > 10 else "red" if nb < -10 else "amber"
                add(f"Insider Net Buy % ({lookback_days}d)", nb, st,
                    "up" if nb > 0 else "down",
                    f"Net insider buy/sell last {lookback_days}d", "Activity")
                if nb > 10:
                    insights["key_insights"].append(f"Strong insider buying activity ({nb:.1f}%)")
                elif nb < -10:
                    insights["risk_factors"].append(f"Significant insider selling ({nb:.1f}%)")

    # Enhanced Price Risk Analysis
    if not ph.empty and "Close" in ph.columns:
        p = ph.copy()
        if "Date" in p.columns:
            p["Date"] = pd.to_datetime(p["Date"])
            p = p.sort_values("Date")
        
        # Volatility analysis
        rv = p["Close"].pct_change().dropna().rolling(30).std() * np.sqrt(252) * 100
        rv = rv.dropna()
        cv = float(rv.iloc[-1]) if not rv.empty else np.nan
        inv = {"green": "red", "red": "green", "amber": "amber", "gray": "gray"}
        add("Annualised Volatility %", cv,
            inv.get(pct_status(cv, rv), "gray"),
            "neutral", "30d realised vol annualised vs own history", "Risk")
        
        if not pd.isna(cv) and cv > 50:
            insights["risk_factors"].append(f"High volatility at {cv:.1f}% indicates elevated price risk")

        # 52-week high/low analysis
        if len(p) >= 50:
            recent = p["Close"].tail(252)
            high52 = float(recent.max())
            low52  = float(recent.min())
            cur    = float(p["Close"].iloc[-1])
            
            if high52 > 0:
                dist_high = (cur - high52) / high52 * 100
                st = "green" if dist_high > -10 else "amber" if dist_high > -30 else "red"
                add("52W High Distance %", dist_high, st, "neutral",
                    "% distance from 52-week high", "Price")
                if dist_high < -30:
                    insights["risk_factors"].append(f"Significant drawdown from 52W high ({abs(dist_high):.1f}%)")
                    
            if low52 > 0:
                dist_low = (cur - low52) / low52 * 100
                st = "green" if dist_low > 30 else "amber" if dist_low > 10 else "red"
                add("52W Low Distance %", dist_low, st, "neutral",
                    "% above 52-week low", "Price")

    # Market Cap and Size Analysis
    mc = info.get("marketCap", np.nan)
    if mc and not pd.isna(mc):
        mc_cr = mc / 1e7
        add("Market Cap (Cr)", mc_cr, "gray", "neutral", "Market cap INR crores", "Size")
        if mc_cr < 1000:
            insights["risk_factors"].append(f"Small cap stock (₹{mc_cr:.0f} Cr) may have higher volatility")
        elif mc_cr > 50000:
            insights["key_insights"].append(f"Large cap stock (₹{mc_cr:.0f} Cr) provides stability")

    shares = info.get("sharesOutstanding", np.nan)
    if shares and not pd.isna(shares):
        shares_cr = shares / 1e7
        add("Shares Outstanding (Cr)", shares_cr, "gray", "neutral",
            "Total shares outstanding in crores", "Size")

    # Enhanced ownership pie chart data
    pie = []
    if not pd.isna(ip):    pie.append({"name": "Institutional", "value": round(ip, 2)})
    if not pd.isna(iip):   pie.append({"name": "Insider/Promoter", "value": round(iip, 2)})
    if float_pct is not None: pie.append({"name": "Public Float", "value": round(float_pct, 2)})
    if fii_pct is not None and fii_pct > 0: pie.append({"name": "FII", "value": round(fii_pct, 2)})
    if dii_pct is not None and dii_pct > 0: pie.append({"name": "DII", "value": round(dii_pct, 2)})
    
    if pie:
        total_pie = sum(p["value"] for p in pie)
        if total_pie < 99:
            pie.append({"name": "Other", "value": round(100 - total_pie, 2)})
    breakdown["ownership_pie"] = pie

    return pd.DataFrame(rows), breakdown, insights


# ── Sector overlay ────────────────────────────────────────────────────────────

def apply_sector_overlay(metrics_df, sector_health_results, top_sectors, window=20):
    p, pct, q75, q25, _ = sector_pressure(sector_health_results, top_sectors, window)
    out = metrics_df.copy()
    if pd.isna(p):
        out["AdjustedStatus"] = out["Status"]
        return out, {"signal": "STABLE", "pressure": np.nan,
                     "pct_rank": np.nan, "narrative": "Insufficient sector data."}

    sig  = "ACCUMULATION" if p >= q75 else "DISTRIBUTION" if p <= q25 else "STABLE"
    narr = f"Sector pressure={p:.1f} (pct={pct:.0f}%). Signal: {sig}."
    out["AdjustedStatus"] = out["Status"].apply(
        lambda s: "green" if sig == "ACCUMULATION" and s == "amber"
             else ("red" if sig == "DISTRIBUTION" and s == "amber" else s))
    return out, {"signal": sig, "pressure": round(p, 2),
                 "pct_rank": round(pct, 1), "narrative": narr}


# ── Full pipeline ─────────────────────────────────────────────────────────────

def run_stock_holding(holder_data, sector_health_results=None,
                      top_sectors=None, sector_window=20, lookback_days=90):
    vr = validate_holders(holder_data, holder_data.get("ticker", ""))
    if not vr.ok:
        log.error("stock_holding.invalid_input", ticker=holder_data.get("ticker"),
                  errors=vr.errors)
        empty = pd.DataFrame()
        return {
            "ticker": holder_data.get("ticker", ""), "info": {},
            "raw": {"institutional": empty, "major": empty, "insider_trans": empty},
            "metrics": empty, "full_metrics": empty,
            "sector_overlay": {"signal": "STABLE", "pressure": float("nan"),
                               "pct_rank": float("nan"), "narrative": "Invalid input data."},
            "holding_signal": "STABLE",
            "breakdown": {"ownership_pie": [], "top_holders": []},
            "insights": [],
            "enhanced_insights": {},
        }
    for w in vr.warnings:
        log.warning("stock_holding.input_warning",
                    ticker=holder_data.get("ticker"), warning=w)

    metrics, breakdown, enhanced_insights = compute_holding_metrics(holder_data, lookback_days)
    log.info("stock_holding.metrics_computed",
             ticker=holder_data.get("ticker"), metric_count=len(metrics))

    overlay_info = {"signal": "STABLE", "pressure": float("nan"),
                    "pct_rank": float("nan"), "narrative": "No sector data provided."}
    full_metrics = metrics.copy()
    full_metrics["AdjustedStatus"] = metrics["Status"]

    if sector_health_results and top_sectors:
        full_metrics, overlay_info = apply_sector_overlay(
            metrics, sector_health_results, top_sectors, sector_window)

    # Collect insights (non-null only)
    insights = [
        {"metric": r["Metric"], "text": r["Insight"], "severity": r["InsightSeverity"]}
        for _, r in full_metrics.iterrows()
        if r.get("Insight") and r["Insight"] != "Insufficient data."
    ]

    # Calculate IT sector correlation if available
    it_correlation = {}
    if sector_health_results and "IT Sector" in sector_health_results:
        it_sector_data = sector_health_results["IT Sector"]
        it_correlation = {
            "correlation_score": it_sector_data.get("health_score", 0),
            "signal_alignment": overlay_info.get("signal", "STABLE"),
            "comparative_strength": "Strong" if it_sector_data.get("health_score", 0) > 70 else "Moderate"
        }

    return {
        "ticker":         holder_data.get("ticker", ""),
        "info":           holder_data.get("info", {}),
        "raw": {
            "institutional": holder_data.get("institutional", pd.DataFrame()),
            "major":         holder_data.get("major",         pd.DataFrame()),
            "insider_trans": holder_data.get("insider_trans", pd.DataFrame()),
        },
        "metrics":        metrics,
        "full_metrics":   full_metrics,
        "sector_overlay": overlay_info,
        "holding_signal": overlay_info.get("signal", "STABLE"),
        "breakdown":      breakdown,
        "insights":       insights,
        "enhanced_insights": enhanced_insights,
        "it_sector_correlation": it_correlation,
    }
