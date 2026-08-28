export type Destination = {
  exchange: string;
  queue: string;
};

export const destinations: Destination[] = [
  {
    exchange: "exchange_service1",
    queue: "queue_service1",
  },
  {
    exchange: "exchange_service2",
    queue: "queue_service2",
  },
  {
    exchange: "exchange_service3",
    queue: "queue_service3",
  },
];

export const ROUTING_KEY = "log.write";

export const PUBLISH_TIMEOUT_MS = 5000;
