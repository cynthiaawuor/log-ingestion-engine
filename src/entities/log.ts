import {
  IsEmail,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsString,
  Length,
  Max,
} from "class-validator";

export enum LogLevel {
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
  DEBUG = "DEBUG",
}
export class Log {
  @IsISO8601()
  @IsNotEmpty()
  timestamp: string;

  @IsEnum(LogLevel)
  @IsNotEmpty()
  level: LogLevel;

  @IsString()
  @IsNotEmpty()
  @Length(10, 100)
  service: string;

  @IsString()
  @IsNotEmpty()
  @Length(0, 10000)
  message: string;

  constructor(
    timestamp: string,
    level: LogLevel,
    service: string,
    message: string,
  ) {
    this.timestamp = timestamp;
    this.service = service;
    this.message = message;
    this.level = level;
  }
}
