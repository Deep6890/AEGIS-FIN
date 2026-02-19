import pandas as pd

def preprocess_input(input_data, maps, feature_order):
    df = pd.DataFrame([input_data])

    # Feature engineering
    df['Loan_Per_Employee'] = df['DisbursementGross'] / (df['NoEmp'] + 1)
    df['SBA_Ratio'] = df['SBA_Appv'] / (df['GrAppv'] + 1)
    df['Loan_to_Term'] = df['DisbursementGross'] / (df['Term'] + 1)
    df['Job_Efficiency'] = (df['CreateJob'] + df['RetainedJob']) / (df['NoEmp'] + 1)

    # Frequency encoding
    df['city_freq'] = df['City'].map(maps['city']).fillna(1)
    df['Bank_freq'] = df['Bank'].map(maps['bank']).fillna(1)
    df['BankState_freq'] = df['BankState'].map(maps['bank_state']).fillna(1)

    # Binary encoding
    df['RevLineCr'] = df['RevLineCr'].replace({'Y':1,'T':1,'N':0,'0':0}).astype(int)
    df['LowDoc'] = df['LowDoc'].replace({'Y':1,'N':0,'S':0,'A':0,'0':0}).astype(int)

    # Domain features
    df['NAICS_2'] = df['NAICS'] // 10000
    df['Years_Since_1987_Approval'] = df['ApprovalFY'] - 1987

    return df[feature_order]
