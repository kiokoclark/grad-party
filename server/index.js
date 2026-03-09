require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());

app.use("/api/admin", require("./routes/admin"));
app.use("/api/guests", require("./routes/guests"));
app.use("/api/rsvp", require("./routes/rsvp"));
app.use("/api/settings", require("./routes/settings"));

app.get("/health", (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
