import type { Channel } from "amqplib";
import { destinations, PUBLISH_TIMEOUT_MS, ROUTING_KEY } from "./config.js";
import type { EnrichedLog } from "../../enricher/enricher.js";
import { addToFallbackQueue } from "./fallbackQueue.js";

export async function publishLog(
  channel: Channel | null,
  log: EnrichedLog,
  exchangeName: string,
) {
  if (!channel) {
    console.warn("No RabbitMQ channel available, using in-memory storage");
    addToFallbackQueue(log);
    return;
  }
  const destination = destinations.find(
    (destination) => destination.exchange === exchangeName,
  );

  if (!destination) {
    console.error(`Unknown destination: ${exchangeName}`);
    return;
  }

  const timer = setTimeout(() => {
    console.error("RabbitMQ publishing timed out after 5 seconds");
  }, PUBLISH_TIMEOUT_MS);

  try {
    channel.publish(
      destination.exchange,
      ROUTING_KEY,
      Buffer.from(JSON.stringify(log)),
      { persistent: true },
    );
    clearTimeout(timer);
    console.log(`Log published to ${destination.exchange}`);
  } catch (error) {
    clearTimeout(timer);

    console.error("RabbitMQ publishing failed:", error);

    addToFallbackQueue(log);
  }
}
