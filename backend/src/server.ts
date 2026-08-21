// dotenv/config має лишатися ПЕРШИМ імпортом: config/env.ts читає process.env
// на етапі завантаження модуля.
import "dotenv/config";
import mongoose from "mongoose";
import app from "./app";
import { MONGODB_URI } from "./config/env";

const PORT = process.env.PORT || 5000;

// Штатний shutdown теж дає подію "disconnected" — без цього прапорця кожен
// нормальний рестарт писав би в лог помилку і смикав би майбутній Sentry.
let shuttingDown = false;

const start = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");
  } catch (error) {
    // Без БД сервіс не вміє нічого корисного: краще впасти одразу, ніж
    // приймати запити, кожен з яких висітиме до buffering-таймаута.
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  mongoose.connection.on("disconnected", () => {
    if (shuttingDown) return;
    console.error("MongoDB disconnected");
  });
  mongoose.connection.on("reconnected", () => console.log("MongoDB reconnected"));
  mongoose.connection.on("error", (err) => console.error("MongoDB error:", err));

  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received, shutting down`);
    server.close(() => {
      mongoose.disconnect().then(() => process.exit(0));
    });
    // Якщо якийсь запит завис — не тримаємо процес вічно. unref, щоб сам
    // таймер не заважав нормальному виходу раніше за 10 с.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  process.on("uncaughtException", (err) => {
    console.error("uncaughtException:", err);
    process.exit(1);
  });
  process.on("unhandledRejection", (reason) => {
    console.error("unhandledRejection:", reason);
    process.exit(1);
  });
};

start();
