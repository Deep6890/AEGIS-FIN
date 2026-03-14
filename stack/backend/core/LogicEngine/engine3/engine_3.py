import yfinance as yf
import pandas as pd
import numpy as np

# fatches the data
def dataFatcher(ticker):
    ticker = yf.Ticker(ticker)
    balance_sheet = ticker.balance_sheet
    quarterly_balance_sheet = ticker.quarterly_balance_sheet
    return balance_sheet, quarterly_balance_sheet

# cleans and restructures the data
def dataOrganise(df):
    df = df.copy()
    # transpose so years become rows
    df = df.T
    # rename balance sheet fields
    rename_map = {
        "Total Assets": "total_assets",
        "Total Debt": "total_debt",
        "Net Debt": "net_debt",
        "Long Term Debt And Capital Lease Obligation": "long_term_debt",
        "Stockholders Equity": "stockholders_equity",
        "Retained Earnings": "retained_earnings",
        "Cash And Cash Equivalents": "cash",
        "Receivables": "receivables",
        "Accounts Payable": "accounts_payable",
        "Net PPE": "net_ppe",
        "Goodwill": "goodwill",
        "Other Intangible Assets": "intangible_assets",
        "Invested Capital": "invested_capital",
        "Share Issued": "shares_issued",
        "Minority Interest": "minority_interest"
    }
    df = df.rename(columns=rename_map)
    columns_need = [
        "total_assets","total_debt","net_debt","long_term_debt",
        "stockholders_equity","retained_earnings","cash",
        "receivables","accounts_payable","net_ppe","goodwill",
        "intangible_assets","invested_capital","shares_issued",
        "minority_interest"
    ]
    df = df.reindex(columns=columns_need)
    df["year"] = df.index
    df = df.reset_index(drop=True)
    return df

# Metadata adding
def addMatadata(df,ticker,type,name):
    df = df.copy()
    df['ticker'] = ticker
    df['type'] = type
    df['name'] = name
    return df

# final cleaning
def cleaning(df):
    df = df.dropna(how="all")
    threshold = len(df) * 0.6
    df = df.dropna(axis=1, thresh=threshold)
    df = df.fillna(df.median(numeric_only=True))
    return df

# Creating the feature 
def createRiskFeatures(df):
    df = df.copy()

    # leverage ratio
    df["debt_to_equity"] = df["total_debt"] / df["stockholders_equity"]
    
    # assets vise dencity 
    df["debt_to_assets"] = df["total_debt"] / df["total_assets"]
    df["net_debt_ratio"] = df["net_debt"] / df["total_assets"]
    df["equity_ratio"] = df["stockholders_equity"] / df["total_assets"]
    df["cash_ratio"] = df["cash"] / df["total_debt"]
    df["intangibles_ratio"] = df["intangible_assets"] / df["total_assets"]
    df["goodwill_ratio"] = df["goodwill"] / df["total_assets"]
    df["receivable_ratio"] = df["receivables"] / df["total_assets"]

    return df

def createGrowthFeatures(df):
    df = df.copy()
    df["asset_growth"] = df["total_assets"].pct_change()
    df["debt_growth"] = df["total_debt"].pct_change()
    df["equity_growth"] = df["stockholders_equity"].pct_change()
    return df


df = pd.read_csv(r"C:\Users\Deep\OneDrive\Desktop\AEGIS-FIN-main\stack\backend\core\sme_companies_loan_analysis.csv")
finalDf = pd.DataFrame()

# scanning all the list
for i in df['NSE/BSE Ticker']:
    mainBalanceSheet,_ = dataFatcher(i+".BO")
    mainBalanceSheet = dataOrganise(mainBalanceSheet)
    mainBalanceSheet = addMatadata(mainBalanceSheet,i,"",i)
    mainBalanceSheet = createRiskFeatures(mainBalanceSheet)
    mainBalanceSheet = createGrowthFeatures(mainBalanceSheet)
    finalDf = pd.concat([finalDf, mainBalanceSheet], axis=0, ignore_index=True)

finalDf = cleaning(finalDf)
print(finalDf)

