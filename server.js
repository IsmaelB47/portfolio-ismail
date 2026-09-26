const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const app = express();

/* =========================================================
   SERVER CONFIGURATION
========================================================= */

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

const DATABASE_URL = process.env.DATABASE_URL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET;

/* =========================================================
   REQUIRED ENVIRONMENT VARIABLES
========================================================= */

if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is not configured.");
  console.error("Set DATABASE_URL before starting the server.");
  process.exit(1);
}

if (!ADMIN_PASSWORD) {
  console.error("ERROR: ADMIN_PASSWORD is not configured.");
  console.error("Set ADMIN_PASSWORD before starting the server.");
  process.exit(1);
}

if (!JWT_SECRET) {
  console.error("ERROR: JWT_SECRET is not configured.");
  console.error("Set JWT_SECRET before starting the server.");
  process.exit(1);
}

if (ADMIN_PASSWORD.length < 10) {
  console.error(
    "ERROR: ADMIN_PASSWORD must be at least 10 characters."
  );
  process.exit(1);
}

if (JWT_SECRET.length < 32) {
  console.error(
    "ERROR: JWT_SECRET should be at least 32 characters."
  );
  process.exit(1);
}

/* =========================================================
   POSTGRESQL DATABASE
========================================================= */

const pool = new Pool({
  connectionString: DATABASE_URL,

  ssl:
    NODE_ENV === "production"
      ? {
          rejectUnauthorized: false
        }
      : false,

  max: 10,

  idleTimeoutMillis: 30000,

  connectionTimeoutMillis: 10000
});

/* =========================================================
   DEFAULT PORTFOLIO CONTENT
========================================================= */

const DEFAULT_DATA = {
  profile: {
    name: "Jordan Ellis",

    role: "IT Support · QA · Web Development",

    tagline:
      "I keep systems running, catch what breaks before users do, and build the tools in between.",

    bio:
      "Seven years split between help desk support, QA, and full-stack development. I like the kind of work most people never see: the ticket that gets resolved before it becomes an outage, the test case that catches the bug a week early, the internal tool that saves everyone twenty minutes a day.",

    email: "jordan@example.com",

    location: "Fort Wayne, IN",

    available: true,

    respondsIn: "~1 day",

    contactSub:
      "Usually respond within a day. Best reached by email.",

    photo: "",

    links: [
      {
        label: "Email",
        url: "mailto:jordan@example.com"
      },
      {
        label: "GitHub",
        url: "https://github.com"
      },
      {
        label: "LinkedIn",
        url: "https://linkedin.com"
      }
    ]
  },

  skills: [
    {
      id: 1,

      category: "Support & Systems",

      items: [
        "Windows & macOS administration",
        "Active Directory",
        "Ticketing (Zendesk, Jira)",
        "Network troubleshooting",
        "Remote support tools"
      ]
    },

    {
      id: 2,

      category: "QA & Testing",

      items: [
        "Manual & regression testing",
        "Test case design",
        "Selenium",
        "Bug tracking & triage",
        "API testing (Postman)"
      ]
    },

    {
      id: 3,

      category: "Web Development",

      items: [
        "JavaScript / TypeScript",
        "React",
        "Node.js",
        "REST APIs",
        "SQL"
      ]
    }
  ],

  projects: [
    {
      id: 1,

      code: "a3f9c1",

      status: "Live",

      title: "Internal ticket triage dashboard",

      description:
        "Built a dashboard that auto-tags and routes incoming tickets by urgency, cutting average first-response time by a third.",

      tags: [
        "React",
        "Node",
        "Postgres"
      ],

      link: "#"
    },

    {
      id: 2,

      code: "7bd221",

      status: "In Progress",

      title:
        "Regression test suite for billing flow",

      description:
        "Selenium suite covering the checkout and billing paths, running nightly against staging to catch regressions before release.",

      tags: [
        "Selenium",
        "Python",
        "CI"
      ],

      link: "#"
    },

    {
      id: 3,

      code: "e10a4f",

      status: "Archived",

      title:
        "Asset inventory tracker",

      description:
        "Lightweight internal tool for tracking hardware assignments across the office, replacing a shared spreadsheet.",

      tags: [
        "Node",
        "SQLite"
      ],

      link: "#"
    },

    {
      id: 4,

      code: "9c2eab",

      status: "Live",

      title:
        "Status page for internal services",

      description:
        "A small uptime and incident status page so the team stops asking 'is it just me' in the group chat.",

      tags: [
        "React",
        "Cron"
      ],

      link: "#"
    }
  ],

  experience: [
    {
      id: 1,

      role: "QA & Support Engineer",

      org: "Northgate Software",

      period: "2023 — Present",

      description:
        "Own regression testing for the core product and act as the escalation point for tickets support can't resolve."
    },

    {
      id: 2,

      role: "Help Desk Technician II",

      org: "Summit Health Systems",

      period: "2021 — 2023",

      description:
        "Handled tier-2 support for a 400-person org, and built internal tooling to speed up common ticket types."
    },

    {
      id: 3,

      role: "Help Desk Technician I",

      org: "Summit Health Systems",

      period: "2019 — 2021",

      description:
        "Frontline support for hardware, software, and account issues across clinical and administrative staff."
    }
  ]
};

/* =========================================================
   DATABASE INITIALIZATION
========================================================= */

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS content (
      id INTEGER PRIMARY KEY,
      data JSONB NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL
    );
  `);

  const contentResult = await pool.query(
    "SELECT id FROM content WHERE id = 1"
  );

  if (contentResult.rows.length === 0) {
    await pool.query(
      `
      INSERT INTO content (id, data)
      VALUES ($1, $2::jsonb)
      `,
      [
        1,
        JSON.stringify(DEFAULT_DATA)
      ]
    );

    console.log(
      "Default portfolio content created."
    );
  }

  const adminResult = await pool.query(
    `
    SELECT id, username, password_hash
    FROM admin
    WHERE id = 1
    `
  );

  if (adminResult.rows.length === 0) {
    const passwordHash =
      await bcrypt.hash(
        ADMIN_PASSWORD,
        12
      );

    await pool.query(
      `
      INSERT INTO admin
        (id, username, password_hash)
      VALUES
        ($1, $2, $3)
      `,
      [
        1,
        "admin",
        passwordHash
      ]
    );

    console.log(
      "Admin account created."
    );
  }
}

/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(
  express.json({
    limit: "2mb"
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "2mb"
  })
);

app.use(
  express.static(__dirname, {
    extensions: ["html"]
  })
);

/* =========================================================
   AUTHENTICATION MIDDLEWARE
========================================================= */

function requireAdmin(req, res, next) {
  const header =
    req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Unauthorized"
    });
  }

  const token =
    header.slice(7);

  try {
    const decoded =
      jwt.verify(
        token,
        JWT_SECRET
      );

    if (
      !decoded ||
      decoded.role !== "admin"
    ) {
      throw new Error(
        "Invalid role"
      );
    }

    req.admin = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      error:
        "Invalid or expired token"
    });
  }
}

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get(
  "/api/health",
  async (req, res) => {
    try {
      await pool.query(
        "SELECT 1"
      );

      res.json({
        success: true,
        status: "ok",
        database: "connected",
        environment: NODE_ENV
      });
    } catch (error) {
      console.error(
        "HEALTH CHECK ERROR:",
        error
      );

      res.status(503).json({
        success: false,
        status: "error",
        database: "unavailable"
      });
    }
  }
);

/* =========================================================
   GET PUBLIC CONTENT
========================================================= */

app.get(
  "/api/content",
  async (req, res) => {
    try {
      const result =
        await pool.query(
          `
          SELECT data
          FROM content
          WHERE id = 1
          `
        );

      const data =
        result.rows.length > 0
          ? result.rows[0].data
          : DEFAULT_DATA;

      res.json({
        data
      });
    } catch (error) {
      console.error(
        "GET CONTENT ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Could not load content"
      });
    }
  }
);

/* =========================================================
   UPDATE PORTFOLIO CONTENT
========================================================= */

app.put(
  "/api/content",
  requireAdmin,
  async (req, res) => {
    try {
      const data = req.body;

      if (
        !data ||
        typeof data !== "object" ||
        Array.isArray(data)
      ) {
        return res.status(400).json({
          error:
            "Invalid content"
        });
      }

      await pool.query(
        `
        INSERT INTO content
          (id, data)
        VALUES
          ($1, $2::jsonb)

        ON CONFLICT (id)

        DO UPDATE SET
          data = EXCLUDED.data
        `,
        [
          1,
          JSON.stringify(data)
        ]
      );

      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error(
        "SAVE CONTENT ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Could not save content"
      });
    }
  }
);

/* =========================================================
   ADMIN LOGIN
========================================================= */

app.post(
  "/api/auth/login",
  async (req, res) => {
    try {
      const {
        password
      } = req.body;

      if (!password) {
        return res.status(400).json({
          error:
            "Password is required"
        });
      }

      const result =
        await pool.query(
          `
          SELECT
            id,
            username,
            password_hash
          FROM admin
          WHERE id = 1
          `
        );

      if (
        result.rows.length === 0
      ) {
        return res.status(500).json({
          error:
            "Admin account not found"
        });
      }

      const admin =
        result.rows[0];

      const valid =
        await bcrypt.compare(
          password,
          admin.password_hash
        );

      if (!valid) {
        return res.status(401).json({
          error:
            "Invalid password"
        });
      }

      const token =
        jwt.sign(
          {
            id: admin.id,
            username:
              admin.username,
            role: "admin"
          },
          JWT_SECRET,
          {
            expiresIn: "8h"
          }
        );

      res.json({
        success: true,
        token,
        username:
          admin.username
      });
    } catch (error) {
      console.error(
        "LOGIN ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Login failed"
      });
    }
  }
);

/* =========================================================
   CHANGE ADMIN PASSWORD
========================================================= */

app.post(
  "/api/auth/password",
  requireAdmin,
  async (req, res) => {
    try {
      const {
        currentPassword,
        newPassword
      } = req.body;

      if (
        !currentPassword ||
        !newPassword
      ) {
        return res.status(400).json({
          error:
            "Both passwords are required"
        });
      }

      if (
        newPassword.length < 10
      ) {
        return res.status(400).json({
          error:
            "New password must be at least 10 characters"
        });
      }

      const result =
        await pool.query(
          `
          SELECT password_hash
          FROM admin
          WHERE id = 1
          `
        );

      if (
        result.rows.length === 0
      ) {
        return res.status(500).json({
          error:
            "Admin account not found"
        });
      }

      const admin =
        result.rows[0];

      const valid =
        await bcrypt.compare(
          currentPassword,
          admin.password_hash
        );

      if (!valid) {
        return res.status(401).json({
          error:
            "Current password is incorrect"
        });
      }

      const newHash =
        await bcrypt.hash(
          newPassword,
          12
        );

      await pool.query(
        `
        UPDATE admin
        SET password_hash = $1
        WHERE id = 1
        `,
        [newHash]
      );

      res.json({
        success: true
      });
    } catch (error) {
      console.error(
        "PASSWORD ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Could not change password"
      });
    }
  }
);

/* =========================================================
   EXPORT BACKUP
========================================================= */

app.get(
  "/api/admin/export",
  requireAdmin,
  async (req, res) => {
    try {
      const result =
        await pool.query(
          `
          SELECT data
          FROM content
          WHERE id = 1
          `
        );

      const data =
        result.rows.length > 0
          ? result.rows[0].data
          : DEFAULT_DATA;

      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error(
        "EXPORT ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Could not export backup"
      });
    }
  }
);

/* =========================================================
   RESET CONTENT
========================================================= */

app.post(
  "/api/admin/reset",
  requireAdmin,
  async (req, res) => {
    try {
      const data =
        JSON.parse(
          JSON.stringify(
            DEFAULT_DATA
          )
        );

      await pool.query(
        `
        UPDATE content
        SET data = $1::jsonb
        WHERE id = 1
        `,
        [
          JSON.stringify(data)
        ]
      );

      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error(
        "RESET ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Could not reset content"
      });
    }
  }
);

/* =========================================================
   404 API HANDLER
========================================================= */

app.use(
  (req, res, next) => {
    if (
      req.path.startsWith("/api/")
    ) {
      return res.status(404).json({
        error:
          "API endpoint not found"
      });
    }

    next();
  }
);

/* =========================================================
   FRONTEND FALLBACK
========================================================= */

app.use(
  (req, res, next) => {
    if (
      req.method === "GET" &&
      !req.path.startsWith("/api/")
    ) {
      return res.sendFile(
        path.join(
          __dirname,
          "index.html"
        )
      );
    }

    next();
  }
);

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(
  (error, req, res, next) => {
    console.error(
      "UNHANDLED ERROR:",
      error
    );

    if (res.headersSent) {
      return next(error);
    }

    res.status(500).json({
      error:
        "Internal server error"
    });
  }
);

/* =========================================================
   START SERVER
========================================================= */

async function startServer() {
  try {
    await initializeDatabase();

    app.listen(
      PORT,
      "0.0.0.0",
      () => {
        console.log(
          `Portfolio server running on port ${PORT}`
        );

        console.log(
          `Environment: ${NODE_ENV}`
        );

        console.log(
          "Database: PostgreSQL"
        );

        console.log(
          "Admin username: admin"
        );

        console.log(
          `Health check: /api/health`
        );
      }
    );
  } catch (error) {
    console.error(
      "SERVER STARTUP ERROR:",
      error
    );

    process.exit(1);
  }
}

/* =========================================================
   POSTGRESQL ERROR HANDLER
========================================================= */

pool.on(
  "error",
  (error) => {
    console.error(
      "Unexpected PostgreSQL error:",
      error
    );
  }
);

/* =========================================================
   GRACEFUL SHUTDOWN
========================================================= */

async function shutdown(signal) {
  console.log(
    `${signal} received. Shutting down...`
  );

  try {
    await pool.end();

    console.log(
      "Database connection closed."
    );

    process.exit(0);
  } catch (error) {
    console.error(
      "Shutdown error:",
      error
    );

    process.exit(1);
  }
}

process.on(
  "SIGTERM",
  () => shutdown("SIGTERM")
);

process.on(
  "SIGINT",
  () => shutdown("SIGINT")
);

/* =========================================================
   START
========================================================= */

startServer();