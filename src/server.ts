import "dotenv/config";
import express from "express";
import logRouter from "./routes/logs.js";
import { requireJsonContentType } from "./middleware/contentType.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
app.use(requireJsonContentType);
app.use(express.json({ limit: "1mb" }));

const PORT = Number(process.env.PORT) || 5000;

app.use("/logs", logRouter);

app.use(errorHandler);
app.listen(PORT, (err) => {
  if (err) {
    console.log(err);
  }
  console.log(`Server listening on localhost:${PORT}`);
});
