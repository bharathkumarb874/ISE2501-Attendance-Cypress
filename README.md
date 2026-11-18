# Student Attendance Management System — Automated Testing with Cypress (ISE2501)

## Project Overview
This repository contains a standalone **Student Attendance Management System** (REST API + Web Portal) built with **Node.js & Express**, paired with an automated unit, API, and end-to-end UI test suite implemented in **Cypress**. Developed for the **ISE2501: Software Testing & Quality Assurance** course assignment.

---

## Team Members & Accountability Split
* **Bharath Kumar (`20241ise0109`) — Lead Tool Architect & Framework Specialist (50%)**
  * Configured the Node.js and Cypress testing environment (`cypress.config.js`).
  * Implemented deterministic state-reset hooks (`beforeEach` calling `POST /api/reset`).
  * Authored REST API lifecycle tests (`TC-01`, `TC-07`, `TC-08`) and End-to-End UI tests (`TC-09`, `TC-10`).
* **Yagna Shiva Sai (`20241ise0175`) — Lead Test Designer & SUT Engineer (50%)**
  * Engineered the Express REST API & Web Portal (`server.js`) with regex validation, boundary rules, and conflict detection.
  * Designed the 10-case formal test matrix and JSON fixture datasets (`cypress/fixtures/students.json`).
  * Authored Boundary Value Analysis and Negative Validation API tests (`TC-02` through `TC-06`).

---

## System Under Test (SUT) Architecture
* **Tech Stack:** Node.js, Express.js, HTML5, Vanilla JavaScript.
* **Core Business Rules:**
  * **USN Validation:** Enforces university USN syntax via regex (`^[1-4][A-Z]{2}\d{2}[A-Z]{2}\d{3}$`).
  * **Attendance Classification:** Calculates attendance percentage and classifies students as `ELIGIBLE` ($\ge 75.0\%$) or `SHORTAGE` ($< 75.0\%$).
  * **Boundary & Conflict Guards:** Rejects invalid counts (`attended > total` or negative numbers) with HTTP `400 Bad Request` and duplicate `(USN + Subject)` entries with HTTP `409 Conflict`.

### REST API Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/attendance` | Retrieve all student records (supports `?status=ELIGIBLE\|SHORTAGE`) |
| `POST` | `/api/attendance` | Add a new attendance record with input & boundary validation |
| `PATCH` | `/api/attendance/:id` | Update attended/total classes and recalculate status |
| `DELETE` | `/api/attendance/:id` | Delete an attendance record by ID |
| `POST` | `/api/reset` | Reset in-memory database to default seeded state for test isolation |

---

## Project Structure
```text
├── server.js                      # System Under Test (Express REST API + Web Portal)
├── cypress.config.js              # Cypress configuration (baseUrl, supportFile: false)
├── package.json                   # Project dependencies and scripts
└── cypress/
    ├── fixtures/
    │   └── students.json          # Parameterized boundary test fixtures
    └── e2e/
        ├── attendance-api.cy.js   # API unit, boundary, and negative tests (TC-01 to TC-08)
        └── attendance-ui.cy.js    # Portal form submission and filter UI tests (TC-09 to TC-10)
