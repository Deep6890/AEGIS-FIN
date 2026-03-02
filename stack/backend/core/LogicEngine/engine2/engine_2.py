import numpy as np
import pandas as pd
import yfinance as yf

def load_company_data(ticker):
    data = yf.download(ticker, period="max", auto_adjust=True, progress=False)
    if isinstance(data.columns, pd.MultiIndex):
        data.columns = [col[0] if col[0] in ['Open','High','Low','Close','Volume'] else col[1] for col in data.columns]
    data = data.reset_index()
    return data


def engine_2(df: pd.DataFrame, company: str):

    df = df.copy()
    df['Date'] = pd.to_datetime(df['Date'])
    df = df.sort_values('Date').set_index('Date')

    # Closers changing 
    df['ret'] = df['Close'].pct_change()
    df['vol_20'] = df['ret'].rolling(20).std()
    df['atr_14'] = (df['High'] - df['Low']).rolling(14).mean()

    # stability scores (FIXED → recent vs recent)
    vol_norm = df['vol_20'].iloc[-1] / df['vol_20'].rolling(200).mean().iloc[-1]
    stability_score = np.clip((1 - vol_norm) * 4, -4, 4)

    # Trend direction
    df['ma20'] = df['Close'].rolling(20).mean()
    df['ma50'] = df['Close'].rolling(50).mean()
    df['ma100'] = df['Close'].rolling(100).mean()

    if df['ma20'].iloc[-1] > df['ma50'].iloc[-1] > df['ma100'].iloc[-1]:
        trend_dir_score = 4
    elif df['ma20'].iloc[-1] < df['ma50'].iloc[-1] < df['ma100'].iloc[-1]:
        trend_dir_score = -4
    else:
        trend_dir_score = 0

    # Trend character (FIXED → log scale)
    log_price = np.log(df['Close'].iloc[-50:])
    slope = np.polyfit(range(50), log_price, 1)[0]
    noise = np.std(np.diff(log_price))
    trend_character_score = np.clip((slope / noise) * 2, -4, 4)

    # Trend duration score 
    trend_days = (df['Close'] > df['ma50']).astype(int).rolling(100).sum().iloc[-1]
    duration_score = np.clip((trend_days / 100) * 4, -4, 4)

    # Trend Potential 
    extension = (df['Close'].iloc[-1] - df['ma100'].iloc[-1]) / df['ma100'].iloc[-1]
    potential_score = np.clip((1 - abs(extension)) * 4, -4, 4)

    # Spike frequency score (FIXED → recent only)
    recent = df['ret'].iloc[-250:]
    spike_days = (abs(recent) > 2 * recent.std()).sum()
    spike_score = np.clip(-spike_days / 250 * 40, -4, 4)

    # Drawdown (FIXED → rolling peak instead of ATH)
    rolling_peak = df['Close'].rolling(252).max()
    df['dd'] = (df['Close'] - rolling_peak) / rolling_peak
    max_dd = df['dd'].iloc[-252:].min()
    drawdown_score = np.clip(max_dd * 10, -4, 4)

    # Volume intelligence (FIXED → recent vs recent)
    vol_confirm = df['Volume'].iloc[-20:].mean() / df['Volume'].rolling(200).mean().iloc[-1]
    volume_score = np.clip((vol_confirm - 1) * 4, -4, 4)

    # Recovery scores
    recovery_speed = abs(df['dd'].iloc[-1]) / df['dd'].rolling(30).min().iloc[-1]
    recovery_score = np.clip(recovery_speed * 2, -4, 4)

    # Trend spread
    spread = (df['ma20'].iloc[-1] - df['ma100'].iloc[-1]) / df['ma100'].iloc[-1]
    spread_score = np.clip(spread * 10, -4, 4)

    # overall score 
    final_score = np.clip(
        stability_score +
        trend_dir_score +
        trend_character_score +
        duration_score +
        potential_score +
        spike_score +
        drawdown_score +
        volume_score +
        recovery_score +
        spread_score,
        -4, 4
    )

    return pd.DataFrame({
        "Company": [company],
        "Stability": [round(stability_score, 2)],
        "Trend_Direction": [trend_dir_score],
        "Trend_Character": [round(trend_character_score, 2)],
        "Trend_Duration": [round(duration_score, 2)],
        "Trend_Potential": [round(potential_score, 2)],
        "Spike_Frequency": [round(spike_score, 2)],
        "Drawdown": [round(drawdown_score, 2)],
        "Volume_Power": [round(volume_score, 2)],
        "Recovery": [round(recovery_score, 2)],
        "Trend_Spread": [round(spread_score, 2)],
        "Final_Market_Score": [round(final_score, 2)]
    })
