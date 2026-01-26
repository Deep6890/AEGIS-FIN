# AEGIS-FIN
# 🏦 Unified Business Health Prediction System (UBHPS)

[![Language](https://img.shields.io/badge/Python-3.8%2B-blue?style=for-the-badge&logo=python)](https://www.python.org/)
[![Framework](https://img.shields.io/badge/TensorFlow-2.0-orange?style=for-the-badge&logo=tensorflow)](https://www.tensorflow.org/)
[![Status](https://img.shields.io/badge/Status-Prototype-green?style=for-the-badge)](https://github.com/)
[![License](https://img.shields.io/badge/License-MIT-purple?style=for-the-badge)](LICENSE)

> **"Don't predict the Revenue. Predict the Behavior."**

---

## 🖼️ Project Preview

<p align="center">
  <img src="assets/dashboard_preview.png" alt="UBHPS Dashboard" width="100%">
  <br>
  <em>Fig 1: The Risk Analysis Dashboard showing Entropy Vectors and Recovery Index</em>
</p>

---

## 📖 Overview

The **Unified Business Health Prediction System (UBHPS)** is a next-generation Fintech solution designed to bridge the MSME credit gap.

Traditional banks rely on audited balance sheets, which small businesses often lack. UBHPS solves this by analyzing **Transactional Behavior, Cash Flow Entropy, and Macro-Economic Trends**.

By fusing internal transaction logs (UPI/Bank Data) with external market signals (Stock Market/Sector Indices), the system generates a dynamic **Risk Vector**, providing lenders with a "Supportive Recovery Index" rather than a simple rejection.

---

## ⚡ Key Problem Statement

| The Problem 🔴 | The Flaw 📉 | The Solution 🟢 |
| :--- | :--- | :--- |
| **Data Scarcity** | Banks reject MSMEs due to lack of formal P&L paperwork. | **Behavioral Analysis** of raw transaction logs. |
| **Static Analysis** | Traditional ratios (Debt/Equity) don't capture daily volatility. | **Entropy & Volatility** measurement (The Chaos Engine). |
| **Isolation** | Credit models ignore external sector crashes (e.g., Auto sector dip). | **Sector Linking** to correlate stock trends with risk. |

---

## 🏗️ System Architecture

The project utilizes an **Ensemble Neural Network** where "Maths" acts as the feature extractor and "Deep Learning" acts as the predictor.

```mermaid
graph TD
    A[Raw Data Sources] -->|Transactions| B(The Chaos Engine);
    A -->|Stock API| C(Sector Proxy Link);
    
    subgraph Feature Engineering
    B --> D[Entropy & Volatility Vector];
    C --> E[Market Trend Vector];
    end
    
    subgraph AI Core
    D --> F[LSTM Sequence Model];
    E --> F;
    F --> G{Gating Mechanism};
    G -->|Minor Business| H[Behavioral Weightage];
    G -->|Major Business| I[Market Weightage];
    end
    
    H --> J[Final Risk Dashboard];
    I --> J;