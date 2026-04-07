# Vessel Tuner

You run services across the Cocapn fleet. Vessel Tuner scans your live endpoints from the outside, scoring each on health, latency, security headers, and specification compliance. It runs inside your own Cloudflare account.

**Live Example:** [vessel-tuner.casey-digennaro.workers.dev](https://vessel-tuner.casey-digennaro.workers.dev)

## Quick Start

1.  **Fork** this repository.
2.  **Deploy** it to Cloudflare Workers. It has zero dependencies.
3.  Edit the `VESSELS` array in the source with your own subdomains or GitHub paths.
4.  Your tuner starts scanning immediately on the first request.

## How It Works

The tool performs a parallel fetch to each vessel’s public endpoint and its source repository. It then computes a weighted score based on:
-   HTTP health and round-trip latency
-   Presence of key security headers (CSP, HSTS, etc.)
-   Validity of the `vessel.json` specification

Results are stored in Cloudflare KV, retaining the last 100 scans for basic trend viewing. The frontend shows a dashboard with pass/fail breakdowns and recurring issues.

## Features

-   **Parallel Scanning:** Checks all defined vessels concurrently. A scan of 60 endpoints typically completes within 10 seconds under ideal network conditions.
-   **Weighted Scoring:** Applies consistent scoring across health, latency, security, and spec compliance.
-   **Issue Aggregation:** Highlights the most common failures across your fleet.
-   **Scan History:** KV storage retains the last 100 scan results for simple trend observation.
-   **Fork-first Design:** You control the code, the list of vessels, and all data.
-   **Minimal Codebase:** Core logic is under 150 lines of TypeScript.

## Limitations

-   **Single-Region Latency:** Latency is measured from the single Cloudflare region where your Worker runs, not from a global network. This gives a consistent baseline but does not represent worldwide user experience.
-   **Concurrency Limits:** Scanning a very large number of vessels (e.g., 200+) in one request may hit subrequest or timing limits.
-   **GitHub Rate Limits:** Frequent scans of many GitHub repositories may encounter API rate limiting without a configured token.

## Architecture

A single Cloudflare Worker script handles:
1.  Fetching each vessel endpoint and its GitHub source concurrently with timeouts.
2.  Computing scores and aggregating common issues.
3.  Storing results in KV.
4.  Serving a static HTML dashboard that visualizes the data.

<div style="text-align:center;padding:16px;color:#64748b;font-size:.8rem"><a href="https://the-fleet.casey-digennaro.workers.dev" style="color:#64748b">The Fleet</a> &middot; <a href="https://cocapn.ai" style="color:#64748b">Cocapn</a></div>