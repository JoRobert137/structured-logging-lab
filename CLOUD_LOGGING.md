# Cloud Logging Integration & Mapping Guide

This document explains how the structured JSON logs produced by `orders-api` map to cloud log management platforms and observability tools (such as Google Cloud Logging, AWS CloudWatch Logs, and Grafana Loki).

---

## 1. Overview of Structured Logging in Cloud Environments

When `orders-api` emits single-line JSON records to `stdout` and `stderr`, container log agents (such as Fluentd, Vector, Promtail, or Google Cloud Logging Agent) automatically ingest and parse each line as structured data without needing custom regular expressions or parsing rules.

### Local JSON Log Format Example
```json
{
  "ts": "2026-09-08T14:02:01.123Z",
  "level": "error",
  "service": "orders-api",
  "reqId": "c8f1a23e-4b9d-4e8a-b9c1-2d3e4f5a6b7c",
  "orderId": 8841,
  "component": "payment-gateway",
  "waitMs": 8100,
  "error": "Simulated database connection failure during payment processing",
  "msg": "payment.failed"
}
```

---

## 2. Platform Mapping & Queries

### A. Google Cloud Logging (GCP)
Google Cloud Logging automatically ingests standard output from Kubernetes (GKE) or Cloud Run and maps JSON keys into the `jsonPayload` object.

* **Field Mapping:**
  * `ts` -> Mapped to GCP entry timestamp (`timestamp`).
  * `level` -> Mapped to GCP log severity (`severity`: `INFO`, `WARNING`, `ERROR`, `DEBUG`).
  * `service` -> Resource label / `jsonPayload.service`.
  * `reqId` -> `jsonPayload.reqId` (can also be mapped to `logging.googleapis.com/trace`).

* **Example Cloud Logging Queries:**
  ```sql
  -- Filter to all error logs for orders-api
  resource.type="k8s_container"
  jsonPayload.service="orders-api"
  severity=ERROR

  -- Follow the complete story of a failing request via Correlation ID
  jsonPayload.reqId="c8f1a23e-4b9d-4e8a-b9c1-2d3e4f5a6b7c"
  ```

---

### B. Grafana Loki (LogQL)
Grafana Loki ingests JSON log streams from Promtail or Grafana Agent. The `| json` parser extracts JSON fields into queryable labels/fields in real time.

* **Example LogQL Queries:**
  ```logql
  -- Filter to error level logs
  {app="orders-api"} | json | level="error"

  -- Trace a specific request ID across all log entries
  {app="orders-api"} | json | reqId="c8f1a23e-4b9d-4e8a-b9c1-2d3e4f5a6b7c"

  -- Extract and inspect payment failures with timing data
  {app="orders-api"} | json | msg="payment.failed" | line_format "{{.ts}} [{{.level}}] reqId={{.reqId}} order={{.orderId}} error={{.error}}"
  ```

---

### C. AWS CloudWatch Logs Insights
AWS Container Insights and FluentBit parse JSON logs into indexed fields automatically.

* **Example CloudWatch Logs Insights Queries:**
  ```sql
  # Find all errors
  fields @timestamp, reqId, msg, error
  | filter level = 'error'
  | sort @timestamp desc

  # Follow single request journey
  fields @timestamp, level, msg, durationMs, error
  | filter reqId = 'c8f1a23e-4b9d-4e8a-b9c1-2d3e4f5a6b7c'
  | sort @timestamp asc
  ```

---

## 3. Benefits of Structured Logs in Production

1. **Zero Indexing Latency & Instant Searching**: No expensive regex log parsing required; log collectors extract indexed fields automatically.
2. **Correlation Across Microservices**: Passing `reqId` (or `X-Request-ID`) in HTTP headers across services connects logs end-to-end into a single distributed trace.
3. **Alerting & Metrics**: Cloud platforms can generate automated alerts (e.g. alert when `jsonPayload.level = "error"` count exceeds threshold) without custom log metrics configuration.
4. **Security & Compliance**: Secrets (passwords, tokens, credentials) are sanitized before logging to protect user data.
