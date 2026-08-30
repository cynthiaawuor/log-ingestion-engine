/**
 * Small load-test harness. Start the API first, then run `npm run load-test`.
 * It sends one log per request so LOGS_PER_SECOND maps directly to log volume.
 */
const target = process.env.TARGET_URL ?? "http://localhost:5000/logs";
const logsPerSecond = Number(process.env.LOGS_PER_SECOND ?? 1000);
const durationSeconds = Number(process.env.DURATION_SECONDS ?? 10);

function makeLog(sequence: number) {
  return {
    timestamp: new Date().toISOString(),
    level: sequence % 20 === 0 ? "ERROR" : "INFO",
    service: `load-test-service-${sequence % 5}`,
    message: `Load test log ${sequence}`,
  };
}

async function sendSecond(second: number) {
  const start = second * logsPerSecond;
  const requests = Array.from({ length: logsPerSecond }, async (_, offset) => {
    const response = await fetch(target, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify([makeLog(start + offset)]),
    });
    return response.ok;
  });
  const results = await Promise.allSettled(requests);
  return results.filter((result) => result.status === "fulfilled" && result.value).length;
}

let accepted = 0;
for (let second = 0; second < durationSeconds; second++) {
  const startedAt = Date.now();
  const acceptedThisSecond = await sendSecond(second);
  accepted += acceptedThisSecond;
  console.log(`Second ${second + 1}/${durationSeconds}: ${acceptedThisSecond}/${logsPerSecond} accepted`);
  const remaining = 1000 - (Date.now() - startedAt);
  if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
}

console.log(`Finished: ${accepted}/${logsPerSecond * durationSeconds} logs accepted.`);
