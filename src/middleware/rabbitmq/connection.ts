#!/usr/bin/env node

import "dotenv/config";

import amqp, { type Channel } from "amqplib";
import { destinations, ROUTING_KEY } from "./config.js";

const host = process.env.RABBITMQ_HOST ?? "localhost";
const port = Number(process.env.RABBITMQ_PORT) || 5672;
const user = process.env.RABBITMQ_USER ?? "guest";
const password = process.env.RABBITMQ_PASS ?? "guest";

export async function connectRabbitMQ() {
  try {
    // Format: amqp://username:password@hostname:port/virtual_host
    const connectionString = `amqp://${user}:${password}@${host}:${port}/myvhost`;
    const connection = await amqp.connect(connectionString);
    const channel = await connection.createChannel();

    console.log("Connected and authenticated successfully!");

    return channel;
  } catch (error) {
    console.warn("RabbitMQ is not avalaible. Using in-memory fallback", error);
    return null;
  }
}
export const channel: Channel | null = await connectRabbitMQ();

export const bindExchangeToQueue = async (channel: Channel) => {
  for (const destination of destinations) {
    const exchange = destination.exchange;
    const queue = destination.queue;

    await channel.assertExchange(exchange, "direct", {
      durable: true,
    });

    await channel.assertQueue(queue, {
      durable: true,
      arguments: {
        "x-queue-type": "quorum",
      },
    });

    await channel.bindQueue(queue, exchange, ROUTING_KEY);
  }
};
