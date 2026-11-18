const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory database (resettable for deterministic automated testing)
let attendanceRecords = [
  { id: 1, usn: '1RV23IS001', name: 'Aarav Sharma', subject: 'ISE2501', attended: 28, total: 32, percentage: 87.5, status: 'ELIGIBLE' },
  { id: 2, usn: '1RV23IS002', name: 'Diya Nair', subject: 'ISE2501', attended: 20, total: 32, percentage: 62.5, status: 'SHORTAGE' }
];
let nextId = 3;

// Helper: Calculate status based on 75% university threshold
function calculateMetrics(attended, total) {
  const percentage = Number(((attended / total) * 100).toFixed(2));
  const status = percentage >= 75.0 ? 'ELIGIBLE' : 'SHORTAGE';
  return { percentage, status };
}

// Reset endpoint for Cypress beforeEach() hooks
app.post('/api/reset', (req, res) => {
  attendanceRecords = [
    { id: 1, usn: '1RV23IS001', name: 'Aarav Sharma', subject: 'ISE2501', attended: 28, total: 32, percentage: 87.5, status: 'ELIGIBLE' },
    { id: 2, usn: '1RV23IS002', name: 'Diya Nair', subject: 'ISE2501', attended: 20, total: 32, percentage: 62.5, status: 'SHORTAGE' }
  ];
  nextId = 3;
  res.status(200).json({ message: 'Database reset successful' });
});

// GET all attendance records (supports ?status=SHORTAGE filter)
app.get('/api/attendance', (req, res) => {
  const { status } = req.query;
  if (status) {
    const filtered = attendanceRecords.filter(r => r.status === status.toUpperCase());
    return res.status(200).json(filtered);
  }
  res.status(200).json(attendanceRecords);
});

// POST new attendance record with strict validation rules
app.post('/api/attendance', (req, res) => {
  const { usn, name, subject, attended, total } = req.body;

  // 1. Missing fields check
  if (!usn || !name || !subject || attended === undefined || total === undefined) {
    return res.status(400).json({ error: 'All fields (usn, name, subject, attended, total) are required.' });
  }

  // 2. USN format check (e.g., 1RV23IS001)
  const usnRegex = /^[1-4][A-Z]{2}\d{2}[A-Z]{2}\d{3}$/;
  if (!usnRegex.test(usn)) {
    return res.status(400).json({ error: 'Invalid USN format. Expected format: 1RV23IS001' });
  }

  // 3. Boundary checks on classes
  const attNum = Number(attended);
  const totNum = Number(total);

  if (isNaN(attNum) || isNaN(totNum) || totNum <= 0 || totNum > 100) {
    return res.status(400).json({ error: 'Total classes must be between 1 and 100.' });
  }
  if (attNum < 0 || attNum > totNum) {
    return res.status(400).json({ error: 'Attended classes cannot be negative or exceed total classes.' });
  }

  // 4. Duplicate USN + Subject check
  const duplicate = attendanceRecords.find(r => r.usn === usn && r.subject === subject);
  if (duplicate) {
    return res.status(409).json({ error: `Attendance record already exists for ${usn} in ${subject}.` });
  }

  const { percentage, status } = calculateMetrics(attNum, totNum);
  const newRecord = { id: nextId++, usn, name, subject, attended: attNum, total: totNum, percentage, status };
  attendanceRecords.push(newRecord);

  res.status(201).json(newRecord);
});

// PATCH update attended classes
app.patch('/api/attendance/:id', (req, res) => {
  const id = Number(req.params.id);
  const record = attendanceRecords.find(r => r.id === id);
  if (!record) return res.status(404).json({ error: 'Record not found.' });

  const { attended, total } = req.body;
  const newAttended = attended !== undefined ? Number(attended) : record.attended;
  const newTotal = total !== undefined ? Number(total) : record.total;

  if (newAttended < 0 || newAttended > newTotal) {
    return res.status(400).json({ error: 'Invalid class count update.' });
  }

  const { percentage, status } = calculateMetrics(newAttended, newTotal);
  record.attended = newAttended;
  record.total = newTotal;
  record.percentage = percentage;
  record.status = status;

  res.status(200).json(record);
});

// DELETE record
app.delete('/api/attendance/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = attendanceRecords.findIndex(r => r.id === id);
  if (index === -1) return res.status(404).json({ error: 'Record not found.' });

  attendanceRecords.splice(index, 1);
  res.status(200).json({ message: 'Record deleted successfully' });
});

// Frontend Web Portal (for Cypress UI Testing)
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>ISE2501 Attendance Management Portal</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; background: #f4f7fb; color: #1e293b; }
    h1 { color: #0f172a; }
    .card { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.08); margin-bottom: 20px; }
    input, select, button { padding: 8px 12px; margin: 5px; border: 1px solid #cbd5e1; border-radius: 4px; }
    button { background: #2563eb; color: white; border: none; cursor: pointer; }
    button:hover { background: #1d4ed8; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
    th { background: #f1f5f9; }
    .SHORTAGE { color: #dc2626; font-weight: bold; }
    .ELIGIBLE { color: #16a34a; font-weight: bold; }
    #feedback { margin-top: 10px; font-weight: bold; }
  </style>
</head>
<body>
  <h1>Student Attendance Management System (ISE2501)</h1>
  <div class="card">
    <h3>Add Attendance Record</h3>
    <form id="attendance-form">
      <input type="text" id="usn" placeholder="USN (e.g. 1RV23IS005)" required />
      <input type="text" id="name" placeholder="Student Name" required />
      <input type="text" id="subject" value="ISE2501" required />
      <input type="number" id="attended" placeholder="Attended" required />
      <input type="number" id="total" placeholder="Total Classes" required />
      <button type="submit" id="submit-btn">Add Record</button>
    </form>
    <div id="feedback"></div>
  </div>

  <div class="card">
    <h3>Attendance Register</h3>
    <label>Filter Status: </label>
    <select id="status-filter">
      <option value="">All Students</option>
      <option value="ELIGIBLE">Eligible (>=75%)</option>
      <option value="SHORTAGE">Shortage (<75%)</option>
    </select>
    <table>
      <thead>
        <tr><th>USN</th><th>Name</th><th>Subject</th><th>Attended</th><th>Total</th><th>%</th><th>Status</th></tr>
      </thead>
      <tbody id="records-body"></tbody>
    </table>
  </div>

  <script>
    async function loadRecords(status = '') {
      const url = status ? '/api/attendance?status=' + status : '/api/attendance';
      const res = await fetch(url);
      const data = await res.json();
      const tbody = document.getElementById('records-body');
      tbody.innerHTML = data.map(r => \`
        <tr>
          <td>\${r.usn}</td>
          <td>\${r.name}</td>
          <td>\${r.subject}</td>
          <td>\${r.attended}</td>
          <td>\${r.total}</td>
          <td>\${r.percentage}%</td>
          <td class="\${r.status}">\${r.status}</td>
        </tr>
      \`).join('');
    }

    document.getElementById('attendance-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        usn: document.getElementById('usn').value,
        name: document.getElementById('name').value,
        subject: document.getElementById('subject').value,
        attended: Number(document.getElementById('attended').value),
        total: Number(document.getElementById('total').value)
      };
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      const fb = document.getElementById('feedback');
      if (res.ok) {
        fb.style.color = '#16a34a';
        fb.textContent = 'Record added: ' + data.usn + ' (' + data.status + ')';
        loadRecords(document.getElementById('status-filter').value);
      } else {
        fb.style.color = '#dc2626';
        fb.textContent = 'Error: ' + data.error;
      }
    });

    document.getElementById('status-filter').addEventListener('change', (e) => {
      loadRecords(e.target.value);
    });

    loadRecords();
  </script>
</body>
</html>
  `);
});

app.listen(PORT, () => console.log(`Attendance SUT running on http://localhost:${PORT}`));