# Financial Forensics Engine
## RIFT 2026 Hackathon - Graph Theory / Financial Crime Detection Track

Graph-Based Financial Crime Detection Engine for the Money Muling Detection Challenge.

## Live Demo URL
- `https://your-live-app-url.example.com`

## Project Title
- Financial Forensics Engine

## Problem Overview
Money muling uses networks of accounts to move and layer illicit funds across multiple hops. This project detects suspicious rings from transaction graphs and exposes them through API output and an interactive web UI.

## Input Specification
Upload CSV with these exact columns:
- `transaction_id` (String)
- `sender_id` (String)
- `receiver_id` (String)
- `amount` (Float)
- `timestamp` (DateTime: `YYYY-MM-DD HH:MM:SS` or ISO 8601)

## Required Outputs
1. Interactive graph visualization
- Account nodes from sender/receiver IDs
- Directed edges for money flow (`sender -> receiver`)
- Suspicious/ring nodes visually distinct
- Hover/click details for account insights

2. Downloadable JSON output
- Exact schema keys:
- `suspicious_accounts`
- `fraud_rings`
- `summary`

3. Fraud ring summary table
- Ring ID
- Pattern Type
- Member Count
- Risk Score
- Member Account IDs (comma-separated)

## JSON Response Format
```json
{
  "suspicious_accounts": [
    {
      "account_id": "ACC_00123",
      "suspicion_score": 87.5,
      "detected_patterns": ["cycle_length_3", "high_velocity"],
      "ring_id": "RING_001"
    }
  ],
  "fraud_rings": [
    {
      "ring_id": "RING_001",
      "member_accounts": ["ACC_00123"],
      "pattern_type": "cycle",
      "risk_score": 95.3
    }
  ],
  "summary": {
    "total_accounts_analyzed": 500,
    "suspicious_accounts_flagged": 15,
    "fraud_rings_detected": 4,
    "processing_time_seconds": 2.3
  }
}
```

## Tech Stack
- Next.js 14 (App Router)
- TypeScript
- React 18
- Tailwind CSS
- Jest + ts-jest

## System Architecture
```text
CSV Upload -> /api/analyze -> parseCSV -> buildGraph
          -> detectCycles + detectSmurfing + detectShellNetworks
          -> buildDetectionResult -> JSON + UI tables + graph
```

## Algorithm Approach (with Complexity)
1. Circular Fund Routing (Cycles)
- Detect directed cycles of length 3 to 5 using DFS
- Overlapping cycles merged into groups
- Complexity: approximately `O(V * E * MAX_LEN)` where `MAX_LEN = 5`

2. Smurfing (Fan-in / Fan-out)
- Detect fan-in (`10+ senders -> 1 receiver`) and fan-out (`1 sender -> 10+ receivers`)
- Uses temporal windows (72 hours)
- Complexity: approximately `O(T log T)` due to time sorting

3. Layered Shell Networks
- Detect 3+ hop chains through low-activity intermediate accounts
- Complexity: approximately `O(V * MAX_DEPTH)` with bounded depth

## Suspicion Score Methodology
Base additive scoring (capped at 100):
- `cycle_length_*`: +40
- `fan_out`: +25
- `fan_in`: +25
- `shell_chain`: +20
- `high_velocity`: +10
- transaction volume bonus: +5 / +10
- legitimate-pattern penalty: -40

Additional risk calibration:
- Ring-level risk contributes a bounded boost to suspicious account scoring
- Rings are canonicalized and deduplicated to avoid duplicate/subset ring inflation

## False Positive Control
Legitimacy filters reduce false positives for known normal patterns:
- Payroll-like behavior
- Merchant-like inbound-heavy behavior
- Utility-like repetitive amount behavior

## Performance Targets
- Upload to result: <= 30 seconds for datasets up to 10K transactions
- Precision target: >= 70%
- Recall target: >= 60%

## Installation and Setup
```bash
npm install
npm run dev
```

## Usage Instructions
1. Open the homepage.
2. Upload a CSV file with required columns.
3. Review graph, suspicious accounts, and fraud ring table.
4. Download JSON report from the dashboard.

## API Endpoints
- `POST /api/analyze`
- `POST /api/rings/:ringId`
- `GET /api/health`

## Deployment
Deployable on Vercel, Netlify, Railway, Render, Heroku, AWS, Azure, or GCP.

Recommended:
```bash
npm run build
npm start
```

## Known Limitations
1. Dense transaction graphs can increase cycle detection cost.
2. Shell thresholds are heuristic and dataset-dependent.
3. No persistent datastore in the default setup.
4. Very large visual graphs are node-limited for UI performance.

## Team Members
- [Name] - Full-stack / Graph Algorithms
- [Name] - Frontend / Visualization

## Submission Checklist
- Live deployed web app URL
- Public GitHub repository URL
- Public LinkedIn demo video link (2-3 minutes, with required hashtags)
- README with all mandatory sections
