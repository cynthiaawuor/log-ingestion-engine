import type { EnrichedLog } from "../enricher/enricher.js";
import fs from "fs";

type DeadLetterEntry = {
  originalLog: EnrichedLog;
  errorMessage: string;
  timestamp: string;
};

const deadLetterFileName = "logs_failed.json";
const maxFileSizeBytes = 10 * 1024 * 1024; //10mbs
export const writeToDeadLetter = async (
  originalLog: EnrichedLog,
  errorMessage: string,
  filePath = deadLetterFileName,
) => {
  try {
    const entry: DeadLetterEntry = {
      originalLog,
      errorMessage,
      timestamp: new Date().toISOString(),
    };
    const entryText = JSON.stringify(entry) + "\n";

    if (shouldRotate(filePath, Buffer.byteLength(entryText))) {
      const rotatedFile = `logs-failed-${Date.now()}.json`;
      fs.renameSync(filePath, rotatedFile);
      console.log(`[i] Rotated dead letter file to ${rotatedFile}`);
    }

    fs.appendFileSync(filePath, entryText);
  } catch (error) {
    console.error("Failed to write to Dead Letter Queue file:", error);
    throw error;
  }
};

const shouldRotate = (filePath: string, nextEntrySize: number) => {
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      return stats.isFile() && stats.size + nextEntrySize > maxFileSizeBytes;
    }
  } catch (error) {
    return false;
  }
  return false;
};
