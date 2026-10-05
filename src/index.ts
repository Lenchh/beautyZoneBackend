import express from "express";

const app = express();
const PORT = 3000;

app.get("/", (req, res) => {
  res.send("Привет! Мой сервер Beauty Zone работает!");
});

app.listen(PORT, () => {
  console.log(`Сервер успешно запущен: http://localhost:${PORT}`);
});
