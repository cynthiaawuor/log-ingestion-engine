#!/usr/bin/env node

import "dotenv/config";

import amqp, { type Channel } from "amqplib";

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
    console.log({ error });
    return null;
  }
}

const channel: Channel | null = await connectRabbitMQ();

const queue = "hello";
const msg = "Hello world!";

if (!channel) {
  console.error("No RabbitMQ channel available, exiting");
  process.exit(1);
}
await channel.assertQueue(queue, {
  durable: true,
  arguments: {
    "x-queue-type": "quorum",
  },
});

channel.sendToQueue(queue, Buffer.from(msg));
console.log(" [x] Sent %s", msg);

setTimeout(function () {
  channel.close();
  process.exit(0);
}, 500);
