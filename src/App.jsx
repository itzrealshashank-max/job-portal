import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000";

function App() {
  const [isLogin, setIsLogin] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
  });

  const [jobForm, setJobForm] = useState({
    title: "",
    company: "",
    location: "",
    description: "",
    salary: "",
  });

  const [message, setMessage] = useState("");
  const [loggedInUser, setLoggedInUser] = useState(null);

  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const [appliedJobs, setAppliedJobs] = useState([]);

  const [selectedJob, setSelectedJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loadingApplications, setLoadingApplications] =
    useState(false);

  const [updatingApplication, setUpdatingApplication] =
    useState(null);

  const [selectedResumes, setSelectedResumes] = useState({});

  // ============================
  // FORM HANDLERS
  // ============================

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setMessage("");
  }

  function handleJobChange(event) {
    const { name, value } = event.target;

    setJobForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setMessage("");
  }

  // ============================
  // REGISTER
  // ============================

  async function handleRegister(event) {
    event.preventDefault();

    if (
      !formData.name ||
      !formData.email ||
      !formData.password ||
      !formData.role
    ) {
      setMessage("Please fill in all fields.");
      return;
    }

    setMessage("Creating your account...");

    try {
      const response = await fetch(
        `${API_URL}/api/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "Unable to create account."
        );
        return;
      }

      setMessage(
        "Account created successfully! 🎉"
      );

      setFormData({
        name: "",
        email: "",
        password: "",
        role: "",
      });
    } catch (error) {
      console.error(error);
      setMessage("Cannot connect to the server.");
    }
  }

  // ============================
  // LOGIN
  // ============================

  async function handleLogin(event) {
    event.preventDefault();

    if (!formData.email || !formData.password) {
      setMessage(
        "Please enter your email and password."
      );
      return;
    }

    setMessage("Logging in...");

    try {
      const response = await fetch(
        `${API_URL}/api/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "Login failed."
        );
        return;
      }

      setLoggedInUser(data.user);
      setMessage("");

      setFormData({
        name: "",
        email: "",
        password: "",
        role: "",
      });
    } catch (error) {
      console.error(error);
      setMessage("Cannot connect to the server.");
    }
  }

  // ============================
  // LOAD JOBS
  // ============================

  async function loadJobs() {
    setLoadingJobs(true);

    try {
      const response = await fetch(
        `${API_URL}/api/jobs`
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "Unable to load jobs."
        );
        return;
      }

      setJobs(data);
    } catch (error) {
      console.error(error);
      setMessage("Cannot load jobs.");
    } finally {
      setLoadingJobs(false);
    }
  }

  useEffect(() => {
    if (loggedInUser) {
      loadJobs();
    }
  }, [loggedInUser]);

  // ============================
  // POST JOB
  // ============================

  async function handlePostJob(event) {
    event.preventDefault();

    if (
      !jobForm.title ||
      !jobForm.company ||
      !jobForm.location ||
      !jobForm.description
    ) {
      setMessage(
        "Please fill in all required job fields."
      );
      return;
    }

    setMessage("Posting job...");

    try {
      const response = await fetch(
        `${API_URL}/api/jobs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recruiter_id: loggedInUser.id,
            title: jobForm.title,
            company: jobForm.company,
            location: jobForm.location,
            description: jobForm.description,
            salary: jobForm.salary,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "Unable to post job."
        );
        return;
      }

      setMessage(
        "Job posted successfully! 🎉"
      );

      setJobForm({
        title: "",
        company: "",
        location: "",
        description: "",
        salary: "",
      });

      await loadJobs();
    } catch (error) {
      console.error(error);
      setMessage("Cannot connect to the server.");
    }
  }

  // ============================
  // SELECT RESUME
  // ============================

  function handleResumeSelect(jobId, event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setMessage(
        "Only PDF resumes are allowed."
      );

      event.target.value = "";
      return;
    }

    const fileSizeMB =
      file.size / (1024 * 1024);

    if (fileSizeMB > 50) {
      setMessage(
        "Resume cannot be larger than 50 MB."
      );

      event.target.value = "";
      return;
    }

    setSelectedResumes((prev) => ({
      ...prev,
      [jobId]: file,
    }));

    setMessage(
      `Resume selected: ${file.name}`
    );
  }

  // ============================
  // APPLY WITH RESUME
  // ============================

  async function handleApply(jobId) {
    if (!loggedInUser) {
      setMessage(
        "Please login to apply for a job."
      );
      return;
    }

    if (loggedInUser.role !== "jobseeker") {
      setMessage(
        "Only Job Seekers can apply for jobs."
      );
      return;
    }

    const resume = selectedResumes[jobId];

    if (!resume) {
      setMessage(
        "Please select your resume PDF first."
      );
      return;
    }

    if (
      resume.type !== "application/pdf" &&
      !resume.name.toLowerCase().endsWith(".pdf")
    ) {
      setMessage(
        "Only PDF resumes are allowed."
      );
      return;
    }

    // Maximum 50 MB
    if (resume.size > 50 * 1024 * 1024) {
      setMessage(
        "Resume cannot be larger than 50 MB."
      );
      return;
    }

    setMessage(
      "Uploading resume and submitting application..."
    );

    try {
      const formData = new FormData();

      formData.append(
        "job_id",
        String(jobId)
      );

      formData.append(
        "applicant_id",
        String(loggedInUser.id)
      );

      formData.append(
        "resume",
        resume
      );

      const response = await fetch(
        `${API_URL}/api/applications`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message ||
            "Unable to submit application."
        );
        return;
      }

      setAppliedJobs((prev) => [
        ...prev,
        jobId,
      ]);

      setSelectedResumes((prev) => {
        const updated = { ...prev };
        delete updated[jobId];
        return updated;
      });

      setMessage(
        "Application submitted successfully! 🎉"
      );
    } catch (error) {
      console.error(
        "Application error:",
        error
      );

      setMessage(
        "Cannot connect to the server."
      );
    }
  }

  // ============================
  // VIEW APPLICATIONS
  // ============================

  async function handleViewApplications(job) {
    setSelectedJob(job);
    setApplications([]);
    setLoadingApplications(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/applications/job/${job.id}`
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message ||
            "Unable to load applications."
        );
        return;
      }

      setApplications(data);
    } catch (error) {
      console.error(error);
      setMessage(
        "Cannot load applications."
      );
    } finally {
      setLoadingApplications(false);
    }
  }

  // ============================
  // UPDATE STATUS
  // ============================

  async function updateApplicationStatus(
    applicationId,
    status
  ) {
    setUpdatingApplication(applicationId);

    try {
      const response = await fetch(
        `${API_URL}/api/applications/${applicationId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message ||
            "Unable to update application."
        );
        return;
      }

      setApplications((prev) =>
        prev.map((application) =>
          application.id === applicationId
            ? {
                ...application,
                status,
              }
            : application
        )
      );

      setMessage(
        `Application marked as ${status}!`
      );
    } catch (error) {
      console.error(error);
      setMessage(
        "Cannot connect to the server."
      );
    } finally {
      setUpdatingApplication(null);
    }
  }

  // ============================
  // LOGOUT
  // ============================

  function handleLogout() {
    setLoggedInUser(null);
    setJobs([]);
    setAppliedJobs([]);
    setSelectedJob(null);
    setApplications([]);
    setSelectedResumes({});
    setMessage("");

    setFormData({
      name: "",
      email: "",
      password: "",
      role: "",
    });
  }

  // ============================
  // LOGIN / REGISTER PAGE
  // ============================

  if (!loggedInUser) {
    return (
      <div className="app">

        <nav className="navbar">
          <div className="logo">
            JobPortal
          </div>

          <div className="nav-links">
            <a href="/">
              Home
            </a>

            <button
              className="login-btn"
              onClick={() => {
                setIsLogin(true);
                setMessage("");
              }}
            >
              Login
            </button>
          </div>
        </nav>

        <main className="signup-page">

          <div className="signup-card">

            <div className="signup-header">
              <h1>
                {isLogin
                  ? "Welcome Back"
                  : "Create Your Account"}
              </h1>

              <p>
                {isLogin
                  ? "Login to continue to JobPortal."
                  : "Find jobs or hire great talent."}
              </p>
            </div>

            <form
              className="signup-form"
              onSubmit={
                isLogin
                  ? handleLogin
                  : handleRegister
              }
            >

              {!isLogin && (
                <label>
                  Full Name

                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                  />
                </label>
              )}

              <label>
                Email Address

                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                />
              </label>

              <label>
                Password

                <input
                  type="password"
                  name="password"
                  value={
                    formData.password
                  }
                  onChange={handleChange}
                  placeholder="Enter your password"
                />
              </label>

              {!isLogin && (
                <label>
                  I am a

                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                  >
                    <option value="">
                      Select your role
                    </option>

                    <option value="jobseeker">
                      Job Seeker
                    </option>

                    <option value="recruiter">
                      Recruiter
                    </option>
                  </select>
                </label>
              )}

              <button
                type="submit"
                className="create-account-btn"
              >
                {isLogin
                  ? "Login"
                  : "Create Account"}
              </button>

            </form>

            {message && (
              <div className="dashboard-message">
                {message}
              </div>
            )}

            <p className="login-text">

              {isLogin
                ? "Don't have an account? "
                : "Already have an account? "}

              <span
                style={{
                  cursor: "pointer",
                  fontWeight: "700",
                }}
                onClick={() => {
                  setIsLogin(!isLogin);
                  setMessage("");
                }}
              >
                {isLogin
                  ? "Create Account"
                  : "Login"}
              </span>

            </p>

          </div>

        </main>

      </div>
    );
  }

  // ============================
  // DASHBOARD
  // ============================

  return (
    <div className="app">

      <nav className="navbar">

        <div className="logo">
          JobPortal
        </div>

        <div className="nav-links">

          <a href="#jobs">
            Find Jobs
          </a>

          <span>
            {loggedInUser.name}
          </span>

          <button
            className="login-btn"
            onClick={handleLogout}
          >
            Logout
          </button>

        </div>

      </nav>

      <main className="dashboard-page">

        <div className="dashboard-header">

          <h1>
            Welcome, {loggedInUser.name}! 👋
          </h1>

          <p>
            You are logged in as{" "}
            <strong>
              {loggedInUser.role ===
              "jobseeker"
                ? "Job Seeker"
                : "Recruiter"}
            </strong>
          </p>

        </div>

        {message && (
          <div className="dashboard-message">
            {message}
          </div>
        )}

        {/* ==================================
            RECRUITER
        ================================== */}

        {loggedInUser.role ===
        "recruiter" ? (

          selectedJob ? (

            <section className="jobs-section">

              <button
                className="login-btn"
                onClick={() => {
                  setSelectedJob(null);
                  setApplications([]);
                }}
              >
                ← Back to Jobs
              </button>

              <div className="dashboard-header">
                <h2>
                  Applications for{" "}
                  {selectedJob.title}
                </h2>

                <p>
                  {selectedJob.company} •{" "}
                  {selectedJob.location}
                </p>
              </div>

              {loadingApplications ? (
                <p>
                  Loading applications...
                </p>
              ) : applications.length ===
                0 ? (

                <div className="dashboard-card">
                  <h3>
                    No applications yet.
                  </h3>

                  <p>
                    Applicants will appear
                    here after applying.
                  </p>
                </div>

              ) : (

                <div className="jobs-grid">

                  {applications.map(
                    (application) => (

                      <div
                        className="job-card"
                        key={
                          application.id
                        }
                      >

                        <h3>
                          {
                            application.applicant_name
                          }
                        </h3>

                        <p>
                          📧{" "}
                          {
                            application.applicant_email
                          }
                        </p>

                        <p>
                          <strong>
                            Status:
                          </strong>{" "}
                          <span
                            style={{
                              fontWeight:
                                "700",
                              textTransform:
                                "capitalize",
                            }}
                          >
                            {
                              application.status
                            }
                          </span>
                        </p>

                        <p>
                          Applied:{" "}
                          {new Date(
                            application.applied_at
                          ).toLocaleString()}
                        </p>

                        {application.resume_path && (
                          <a
                            href={`${API_URL}/uploads/resumes/${application.resume_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="resume-button"
                          >
                            📄 View Resume
                          </a>
                        )}

                        <div
                          style={{
                            display:
                              "flex",
                            gap: "8px",
                            flexWrap:
                              "wrap",
                            marginTop:
                              "15px",
                          }}
                        >

                          <button
                            className="create-account-btn"
                            disabled={
                              updatingApplication ===
                              application.id
                            }
                            onClick={() =>
                              updateApplicationStatus(
                                application.id,
                                "shortlisted"
                              )
                            }
                          >
                            Shortlist
                          </button>

                          <button
                            disabled={
                              updatingApplication ===
                              application.id
                            }
                            onClick={() =>
                              updateApplicationStatus(
                                application.id,
                                "rejected"
                              )
                            }
                            style={{
                              background:
                                "#dc2626",
                              color:
                                "white",
                              border:
                                "none",
                              padding:
                                "10px 16px",
                              borderRadius:
                                "8px",
                              cursor:
                                "pointer",
                            }}
                          >
                            Reject
                          </button>

                          <button
                            disabled={
                              updatingApplication ===
                              application.id
                            }
                            onClick={() =>
                              updateApplicationStatus(
                                application.id,
                                "hired"
                              )
                            }
                            style={{
                              background:
                                "#7c3aed",
                              color:
                                "white",
                              border:
                                "none",
                              padding:
                                "10px 16px",
                              borderRadius:
                                "8px",
                              cursor:
                                "pointer",
                            }}
                          >
                            Hire ⭐
                          </button>

                        </div>

                      </div>
                    )
                  )}

                </div>
              )}

            </section>

          ) : (

            <>

              {/* POST JOB */}

              <section className="dashboard-card">

                <h2>
                  Post a New Job
                </h2>

                <form
                  className="job-form"
                  onSubmit={handlePostJob}
                >

                  <label>
                    Job Title

                    <input
                      type="text"
                      name="title"
                      value={jobForm.title}
                      onChange={
                        handleJobChange
                      }
                      placeholder="e.g. Data Analyst"
                    />
                  </label>

                  <label>
                    Company

                    <input
                      type="text"
                      name="company"
                      value={
                        jobForm.company
                      }
                      onChange={
                        handleJobChange
                      }
                      placeholder="Company name"
                    />
                  </label>

                  <label>
                    Location

                    <input
                      type="text"
                      name="location"
                      value={
                        jobForm.location
                      }
                      onChange={
                        handleJobChange
                      }
                      placeholder="Delhi / Remote"
                    />
                  </label>

                  <label>
                    Salary

                    <input
                      type="text"
                      name="salary"
                      value={
                        jobForm.salary
                      }
                      onChange={
                        handleJobChange
                      }
                      placeholder="₹5 - 10 LPA"
                    />
                  </label>

                  <label>
                    Job Description

                    <textarea
                      name="description"
                      value={
                        jobForm.description
                      }
                      onChange={
                        handleJobChange
                      }
                      placeholder="Describe the job..."
                      rows="6"
                    />
                  </label>

                  <button
                    type="submit"
                    className="create-account-btn"
                  >
                    Post Job
                  </button>

                </form>

              </section>

              {/* RECRUITER JOBS */}

              <section
                className="jobs-section"
                id="jobs"
              >

                <h2>
                  Your Job Listings
                </h2>

                {loadingJobs ? (
                  <p>
                    Loading jobs...
                  </p>
                ) : jobs.filter(
                    (job) =>
                      job.recruiter_id ===
                      loggedInUser.id
                  ).length === 0 ? (

                  <div className="dashboard-card">
                    <p>
                      You haven't posted
                      any jobs yet.
                    </p>
                  </div>

                ) : (

                  <div className="jobs-grid">

                    {jobs
                      .filter(
                        (job) =>
                          job.recruiter_id ===
                          loggedInUser.id
                      )
                      .map((job) => (

                        <div
                          className="job-card"
                          key={job.id}
                        >

                          <h3>
                            {job.title}
                          </h3>

                          <p>
                            <strong>
                              {job.company}
                            </strong>
                          </p>

                          <p>
                            📍{" "}
                            {job.location}
                          </p>

                          {job.salary && (
                            <p>
                              💰{" "}
                              {job.salary}
                            </p>
                          )}

                          <p>
                            {
                              job.description
                            }
                          </p>

                          <button
                            className="create-account-btn"
                            onClick={() =>
                              handleViewApplications(
                                job
                              )
                            }
                          >
                            View Applications
                          </button>

                        </div>

                      ))}

                  </div>
                )}

              </section>

            </>

          )

        ) : (

          /* ==================================
             JOB SEEKER
          ================================== */

          <section
            className="jobs-section"
            id="jobs"
          >

            <div className="section-header">

              <h2>
                Available Jobs
              </h2>

              <button
                className="login-btn"
                onClick={loadJobs}
              >
                Refresh Jobs
              </button>

            </div>

            {loadingJobs ? (

              <p>
                Loading jobs...
              </p>

            ) : jobs.length === 0 ? (

              <div className="dashboard-card">
                <h3>
                  No jobs available.
                </h3>

                <p>
                  Check again later.
                </p>
              </div>

            ) : (

              <div className="jobs-grid">

                {jobs.map((job) => {

                  const applied =
                    appliedJobs.includes(
                      job.id
                    );

                  const selectedResume =
                    selectedResumes[job.id];

                  return (

                    <div
                      className="job-card"
                      key={job.id}
                    >

                      <h3>
                        {job.title}
                      </h3>

                      <p>
                        <strong>
                          {job.company}
                        </strong>
                      </p>

                      <p>
                        📍{" "}
                        {job.location}
                      </p>

                      {job.salary && (
                        <p>
                          💰{" "}
                          {job.salary}
                        </p>
                      )}

                      <p>
                        {job.description}
                      </p>

                      {applied ? (

                        <button
                          className="create-account-btn"
                          disabled
                        >
                          Applied ✓
                        </button>

                      ) : (

                        <>

                          {/* ======================
                              RESUME PICKER
                          ====================== */}

                          <div
                            className="resume-upload"
                          >

                            <label
                              htmlFor={`resume-${job.id}`}
                            >
                              📄 Select Resume PDF
                            </label>

                            <input
                              type="file"
                              id={`resume-${job.id}`}
                              accept=".pdf,application/pdf"
                              onChange={(event) =>
                                handleResumeSelect(
                                  job.id,
                                  event
                                )
                              }
                            />

                            {selectedResume && (
                              <div
                                className="selected-resume"
                              >
                                ✅{" "}
                                {
                                  selectedResume.name
                                }
                              </div>
                            )}

                          </div>

                          {/* ======================
                              APPLY
                          ====================== */}

                          <button
                            className="create-account-btn"
                            onClick={() =>
                              handleApply(
                                job.id
                              )
                            }
                            style={{
                              marginTop:
                                "12px",
                            }}
                          >
                            Apply Now
                          </button>

                          <p
                            style={{
                              fontSize:
                                "13px",
                              color:
                                "#6b7280",
                              marginTop:
                                "8px",
                            }}
                          >
                            PDF only •
                            Maximum 50 MB
                          </p>

                        </>

                      )}

                    </div>

                  );
                })}

              </div>

            )}

          </section>

        )}

      </main>

    </div>
  );
}

export default App;