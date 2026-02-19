from core.predictor import predict_loan_default
stress_test = {
    "City": "SAN DIEGO",
    "Bank": "CALIFORNIA BANK & TRUST",
    "BankState": "CA",
    "NAICS": 531210,
    "ApprovalFY": 2008,     # HIGH RISK (Recession)
    "Term": 240,            # HIGH SAFETY (Real Estate)
    "NoEmp": 5,
    "NewExist": 1.0,        # Established
    "CreateJob": 10,
    "RetainedJob": 10,
    "FranchiseCode": 0,
    "UrbanRural": 1,
    "RevLineCr": "N",       
    "LowDoc": "N",
    "DisbursementGross": 100000,
    "GrAppv": 100000,
    "SBA_Appv": 50000,
    "New": 0,               
    "RealEstate": 1,        # HIGH SAFETY
    "Portion": 0.5,
    "Recession": 1,         # HIGH RISK
    "daysterm": 7200        
}
result = predict_loan_default(stress_test)
print(result)
