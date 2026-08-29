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
) => {
  try {
    const fileExists = checkJsonFileSize(deadLetterFileName);
    if (fileExists) {
      const entry: DeadLetterEntry = {
        originalLog,
        errorMessage,
        timestamp: new Date().toISOString(),
      };

      fs.appendFileSync(deadLetterFileName, JSON.stringify(entry) + "\n");
    }
    const rotatedFile = `logs-failed-${Date.now()}.json`;
    fs.renameSync(deadLetterFileName, rotatedFile);
    console.log(`[i] Rotated dead letter file to ${rotatedFile}`);
  } catch (error) {
    console.error("Failed to write to Dead Letter Queue file:", error);
    throw error;
  }
};

const checkJsonFileSize = (filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);

      if (stats.isFile() && stats.size <= maxFileSizeBytes) {
        return true;
      }
    }
  } catch (error) {
    return false;
  }
};
