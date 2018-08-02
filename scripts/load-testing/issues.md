# Load Testing With Read queries

# Issue

It seems that we are currently hitting 100% CPU when running the following query:
```
{ Systems(first:600, serviceTier:Bronze) {code name description primaryURL systemType serviceTier serviceType hostPlatform containsPersonalData containsSensitiveData lifecycleStage SF_ID}}

```
 at a rate of 10 RPS.

When increasing the script to 25 RPS, we got the following metrics:
- Status codes:
  - 200: 1017
  - 503: 1983
- Request Latency:
  - min: 428.6
  - max: 34072.1
  - median: 30075.9
  - p95: 30259.8
  - p99: 30784.7
- RPS sent: 19.92

# Troubleshooting

## App
- Generated a Flamegraph in order to profile the CPU usage.

## Neo4j Driver
- Changed the versions of the Neo4j driver to see whether this would have an impact on the perf tests.
- Increased the pool size to 300 and decreased retry timeout to 10 seconds but it was never hitting capacity.
- Checked that the Neo4j driver sessions were being closed correctly.

## Neo4j tuning
- Checked that attributes were being parameterised correctly.
- Ran ```PROFILE``` on the query to see how the query performs and the number of db hits.
- Created an index on serviceTier to remove nodeLabelScan to significantly reduce the number of db hits
- Removed long string attributes such as: monitoring, ArchitecturalDiagrams, troubleshooting, descriptions as some attribute values have string characters > 500 to see whether this would have an impact on the performance of the query.

## Database
- Used Neo4j hardware sizing calculator - recommended 8GB RAM size
- Increased Dyno size from Standard 2 to Performance 1 (this had the same number of cores on the server)
- Increased RAM size to 8GB

# Discovery- 25/07/2018
- We have now narrowed down the issue. It is either to do with the number of cores on the server that causes the CPU to be hitting 100% or, it is a network I/O bound issue so when the DB results are queued for processing by the CPU, if i/o is limited this queue will back up, eventually causing [what looks like] a struggling CPU.

# Discovery- 31/08/2018
- This performance issue has now disappeared both in staging and production.
- GrapheneDB support also ran the same performance test and could not replicate the performance issue.
- We are now able to make 25 RPS and the median latency has significantly decreased from 30000ms to 999ms.
