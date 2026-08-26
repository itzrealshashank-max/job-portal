const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pool = require("./db");

const app = express();
const PORT = 5000;

// ==============================
// MIDDLEWARE
// ==============================

app.use(cors());
app.use(express.json());

// Serve uploaded resumes
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

// ==============================
// RESUME UPLOAD SETUP
// ==============================

const uploadDir = path.join(
  __dirname,
  "uploads",
  "resumes"
);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true,
  });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: storage,

  limits: {
    // Maximum 50 MB
    fileSize: 50 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF resumes are allowed."));
    }
  },
});

// ==============================
// HOME
// ==============================

app.get("/", (req, res) => {
  res.json({
    message: "JobPortal backend is running!",
  });
});

// ==============================
// TEST MYSQL
// ==============================

app.get("/api/test-db", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT 1 AS connected"
    );

    res.json({
      message: "MySQL connected successfully!",
      result: rows,
    });
  } catch (error) {
    console.error(
      "MySQL connection error:",
      error.message
    );

    res.status(500).json({
      message: "MySQL connection failed",
    });
  }
});

// ==============================
// REGISTER
// ==============================

app.post("/api/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
    } = req.body;

    if (
      !name ||
      !email ||
      !password ||
      !role
    ) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    if (
      role !== "jobseeker" &&
      role !== "recruiter"
    ) {
      return res.status(400).json({
        message: "Invalid role.",
      });
    }

    const [existingUser] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({
        message:
          "An account with this email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(
      password,
      10
    );

    await pool.query(
      `INSERT INTO users
       (name, email, password_hash, role)
       VALUES (?, ?, ?, ?)`,
      [
        name,
        email,
        passwordHash,
        role,
      ]
    );

    res.status(201).json({
      message:
        "Account created successfully!",
    });
  } catch (error) {
    console.error(
      "Registration error:",
      error.message
    );

    res.status(500).json({
      message:
        "Something went wrong while creating the account",
    });
  }
});

// ==============================
// LOGIN
// ==============================

app.post("/api/login", async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message:
          "Email and password are required",
      });
    }

    const [users] = await pool.query(
      `SELECT
        id,
        name,
        email,
        password_hash,
        role
       FROM users
       WHERE email = ?`,
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        message:
          "Invalid email or password",
      });
    }

    const user = users[0];

    const passwordMatch =
      await bcrypt.compare(
        password,
        user.password_hash
      );

    if (!passwordMatch) {
      return res.status(401).json({
        message:
          "Invalid email or password",
      });
    }

    res.json({
      message: "Login successful!",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(
      "Login error:",
      error.message
    );

    res.status(500).json({
      message:
        "Something went wrong while logging in",
    });
  }
});

// ==============================
// CREATE JOB
// ==============================

app.post("/api/jobs", async (req, res) => {
  try {
    const {
      recruiter_id,
      title,
      company,
      location,
      description,
      salary,
    } = req.body;

    if (
      !recruiter_id ||
      !title ||
      !company ||
      !location ||
      !description
    ) {
      return res.status(400).json({
        message:
          "Please fill in all required job fields.",
      });
    }

    const [recruiters] =
      await pool.query(
        `SELECT id
         FROM users
         WHERE id = ?
         AND role = 'recruiter'`,
        [recruiter_id]
      );

    if (recruiters.length === 0) {
      return res.status(403).json({
        message:
          "Only recruiters can post jobs.",
      });
    }

    await pool.query(
      `INSERT INTO jobs
       (
         recruiter_id,
         title,
         company,
         location,
         description,
         salary
       )
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        recruiter_id,
        title,
        company,
        location,
        description,
        salary || null,
      ]
    );

    res.status(201).json({
      message:
        "Job posted successfully!",
    });
  } catch (error) {
    console.error(
      "Create job error:",
      error.message
    );

    res.status(500).json({
      message:
        "Something went wrong while posting the job.",
    });
  }
});

// ==============================
// GET ALL JOBS
// ==============================

app.get("/api/jobs", async (req, res) => {
  try {
    const [jobs] = await pool.query(`
      SELECT
        jobs.id,
        jobs.recruiter_id,
        jobs.title,
        jobs.company,
        jobs.location,
        jobs.description,
        jobs.salary,
        jobs.created_at,
        users.name AS recruiter_name
      FROM jobs
      JOIN users
        ON jobs.recruiter_id = users.id
      ORDER BY jobs.created_at DESC
    `);

    res.json(jobs);
  } catch (error) {
    console.error(
      "Get jobs error:",
      error.message
    );

    res.status(500).json({
      message:
        "Something went wrong while loading jobs.",
    });
  }
});

// ==============================
// APPLY FOR JOB WITH RESUME
// ==============================

app.post(
  "/api/applications",
  upload.single("resume"),
  async (req, res) => {
    try {
      const {
        job_id,
        applicant_id,
      } = req.body;

      if (!job_id || !applicant_id) {
        return res.status(400).json({
          message:
            "Job ID and applicant ID are required.",
        });
      }

      // Resume required
      if (!req.file) {
        return res.status(400).json({
          message:
            "Please upload your resume in PDF format.",
        });
      }

      // Minimum 5 MB
      if (req.file.size < 5 * 1024 * 1024) {
        // Delete uploaded file
        fs.unlinkSync(req.file.path);

        return res.status(400).json({
          message:
            "Resume must be at least 5 MB.",
        });
      }

      // Check applicant
      const [applicants] =
        await pool.query(
          `SELECT id
           FROM users
           WHERE id = ?
           AND role = 'jobseeker'`,
          [applicant_id]
        );

      if (applicants.length === 0) {
        fs.unlinkSync(req.file.path);

        return res.status(403).json({
          message:
            "Only job seekers can apply for jobs.",
        });
      }

      // Check job
      const [jobs] =
        await pool.query(
          "SELECT id FROM jobs WHERE id = ?",
          [job_id]
        );

      if (jobs.length === 0) {
        fs.unlinkSync(req.file.path);

        return res.status(404).json({
          message: "Job not found.",
        });
      }

      // Check duplicate application
      const [
        existingApplication,
      ] = await pool.query(
        `SELECT id
         FROM applications
         WHERE job_id = ?
         AND applicant_id = ?`,
        [
          job_id,
          applicant_id,
        ]
      );

      if (
        existingApplication.length > 0
      ) {
        fs.unlinkSync(req.file.path);

        return res.status(409).json({
          message:
            "You have already applied for this job.",
        });
      }

      // Save filename in database
      const resumePath =
        req.file.filename;

      await pool.query(
        `INSERT INTO applications
         (
           job_id,
           applicant_id,
           resume_path
         )
         VALUES (?, ?, ?)`,
        [
          job_id,
          applicant_id,
          resumePath,
        ]
      );

      res.status(201).json({
        message:
          "Application submitted successfully! 🎉",
        resume: resumePath,
      });
    } catch (error) {
      console.error(
        "Application error:",
        error.message
      );

      // Delete file if something went wrong
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (deleteError) {
          console.error(
            "Could not delete file:",
            deleteError.message
          );
        }
      }

      res.status(500).json({
        message:
          "Something went wrong while applying.",
      });
    }
  }
);

// ==============================
// GET APPLICATIONS FOR A JOB
// ==============================

app.get(
  "/api/applications/job/:jobId",
  async (req, res) => {
    try {
      const {
        jobId,
      } = req.params;

      const [applications] =
        await pool.query(
          `SELECT
            applications.id,
            applications.job_id,
            applications.applicant_id,
            applications.status,
            applications.applied_at,
            applications.resume_path,
            users.name AS applicant_name,
            users.email AS applicant_email,
            jobs.title AS job_title
           FROM applications
           JOIN users
             ON applications.applicant_id = users.id
           JOIN jobs
             ON applications.job_id = jobs.id
           WHERE applications.job_id = ?
           ORDER BY applications.applied_at DESC`,
          [jobId]
        );

      res.json(applications);
    } catch (error) {
      console.error(
        "Get applications error:",
        error.message
      );

      res.status(500).json({
        message:
          "Something went wrong while loading applications.",
      });
    }
  }
);

// ==============================
// UPDATE APPLICATION STATUS
// ==============================

app.put(
  "/api/applications/:applicationId/status",
  async (req, res) => {
    try {
      const {
        applicationId,
      } = req.params;

      const {
        status,
      } = req.body;

      const allowedStatuses = [
        "applied",
        "shortlisted",
        "rejected",
        "hired",
      ];

      if (
        !status ||
        !allowedStatuses.includes(status)
      ) {
        return res.status(400).json({
          message:
            "Invalid application status.",
        });
      }

      const [result] =
        await pool.query(
          `UPDATE applications
           SET status = ?
           WHERE id = ?`,
          [
            status,
            applicationId,
          ]
        );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message:
            "Application not found.",
        });
      }

      res.json({
        message:
          `Application marked as ${status}.`,
      });
    } catch (error) {
      console.error(
        "Update application status error:",
        error.message
      );

      res.status(500).json({
        message:
          "Something went wrong while updating the application.",
      });
    }
  }
);

// ==============================
// MULTER ERROR HANDLER
// ==============================

app.use(
  (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
      if (
        error.code ===
        "LIMIT_FILE_SIZE"
      ) {
        return res.status(400).json({
          message:
            "Resume cannot be larger than 50 MB.",
        });
      }

      return res.status(400).json({
        message:
          "Resume upload failed.",
      });
    }

    if (
      error &&
      error.message ===
        "Only PDF resumes are allowed."
    ) {
      return res.status(400).json({
        message:
          "Only PDF resumes are allowed.",
      });
    }

    next(error);
  }
);

// ==============================
// START SERVER
// ==============================

app.listen(PORT, () => {
  console.log(
    `Backend running at http://localhost:${PORT}`
  );
});