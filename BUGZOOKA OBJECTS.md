UPDATED:

Here’s a clean, developer-friendly version you can drop into Slack, Notion, or a PR description for your backend/frontend team:

---

## **🔄 Complete Object Lifecycle: URL → Audit → Tests → Bugs**

This document describes the full data flow and relationships in **BugZooka** — from when a user initiates a site audit to when bug findings are generated and reviewed.

---

### **1\. 🧱 Initial Audit Creation (User Input)**

When a user starts a new audit:

// User input (via form)  
{  
  targetUrl: "https://example.com",  
  testCases: \[  
    { id: "test-1", test: "SQL Injection Test", expectedOutput: "Should detect SQL vulnerabilities" },  
    { id: "test-2", test: "XSS Vulnerability Scan", expectedOutput: "Should identify XSS attacks" }  
  \]  
}

// Creates new AgentRun  
const newRun: AgentRun \= {  
  id: "run-1234567890",  
  teamId: "team-1",  
  targetUrl: "https://example.com",  
  createdBy: "user-1",            // ← WHO CREATED THE AUDIT  
  status: "running",              // ← INITIALLY RUNNING  
  createdAt: new Date(),  
  completedAt: undefined,  
  bugFindings: \[\],  
  settings: {  
    includeSubdomains: false,  
    customHeaders: {}  
  }  
}

---

### **2\. ⚙️ Running Audit State (During Execution)**

During execution, each test case runs with progress updates:

{  
  id: "run-1234567890",  
  targetUrl: "https://example.com",  
  createdBy: "user-1",            // ← John Doe  
  status: "running",  
  testCases: \[  
    {  
      id: "test-1",  
      name: "SQL Injection Test",  
      expectedOutput: "Should detect SQL vulnerabilities",  
      status: "running",  
      progress: 45  
    },  
    {  
      id: "test-2",  
      name: "XSS Vulnerability Scan",  
      expectedOutput: "Should identify XSS attacks",  
      status: "queued",  
      progress: 0  
    }  
  \],  
  bugFindings: \[\]  
}

---

### **3\. ✅ Completed Audit (After Execution)**

When complete, the system attaches generated bug findings:

{  
  id: "run-1234567890",  
  targetUrl: "https://example.com",  
  createdBy: "user-1",  
  status: "completed",  
  createdAt: new Date("2024-03-01T09:00:00Z"),  
  completedAt: new Date("2024-03-01T10:45:00Z"),  
  bugFindings: \[  
    {  
      id: "bug-1",  
      title: "SQL Injection Vulnerability",  
      description: "The login form is vulnerable to SQL injection attacks.",  
      stepsToReproduce: \[  
        "Navigate to the login page",  
        "Enter \\"admin' OR '1'='1\\" in the username field",  
        "Enter any password",  
        "Click login"  
      \],  
      severity: "critical",  
      roastMessage: "Your security is about as strong as a wet paper bag\! 🔥",  
      screenshotUrls: \["https://via.placeholder.com/400x300/ff0000/ffffff?text=SQL+Injection"\],  
      createdAt: new Date("2024-03-01T10:30:00Z"),  
      status: "pending",          // ← Awaiting review  
      confirmedBy: undefined,  
      rejectedBy: undefined,  
      confirmedAt: undefined,  
      rejectedAt: undefined  
    },  
    {  
      id: "bug-2",  
      title: "XSS in Search Function",  
      description: "The search functionality is vulnerable to cross-site scripting attacks.",  
      stepsToReproduce: \[  
        "Navigate to the search page",  
        "Enter \\"\<script\>alert('XSS')\</script\>\\" in the search field",  
        "Click search",  
        "Observe the alert popup"  
      \],  
      severity: "high",  
      roastMessage: "Your XSS protection is missing faster than my motivation on Monday\! 😂",  
      screenshotUrls: \["https://via.placeholder.com/400x300/ff8800/ffffff?text=XSS+Alert"\],  
      createdAt: new Date("2024-03-01T11:15:00Z"),  
      status: "pending"  
    }  
  \]  
}

---

### **4\. 🖥️ UI Display Flow**

#### **Running Audits Section**

┌─────────────────────────────────────────┐  
│ 🔵 https://example.com                  │  
│ Started 3/1/2024, 9:00:00 AM           │  
│ Created by: John Doe                   │ ← WHO CREATED AUDIT  
│                                         │  
│ ▼ Test Cases Progress                  │  
│ ┌─────────────────────────────────────┐ │  
│ │ 🕐 SQL Injection Test               │ │  
│ │ Expected: Should detect SQL vulns   │ │  
│ │ \[████████░░\] 45% complete           │ │  
│ └─────────────────────────────────────┘ │  
│ ┌─────────────────────────────────────┐ │  
│ │ ⏸️ XSS Vulnerability Scan           │ │  
│ │ Expected: Should identify XSS       │ │  
│ │ Waiting to start...                 │ │  
│ └─────────────────────────────────────┘ │	  
└─────────────────────────────────────────┘

#### **Past Audits Section**

┌─────────────────────────────────────────┐  
│ https://example.com                     │  
│ 3/1/2024                                │  
│ Created by: John Doe                    │  
│ \[2 bugs\] \[Completed\] \[Details ▼\]        │  
└─────────────────────────────────────────┘

#### **Bug Findings (Expanded)**

┌─────────────────────────────────────────┐  
│ SQL Injection Vulnerability             │  
│ The login form is vulnerable...         │  
│ Audit created by: \[👤\] John Doe         │  
│                             \[Critical\]  │  
│ Steps to Reproduce:                     │  
│ 1\. Navigate to the login page           │  
│ 2\. Enter "admin' OR '1'='1"...          │  
│                                         │  
│ 🔥 Roast Message:                       │  
│ "Your security is about as strong as    │  
│  a wet paper bag\! 🔥"                   │  
│                                         │  
│ \[Confirm\] \[Reject\] \[Reset\]              │  
└─────────────────────────────────────────┘

---

### **5\. 🔗 Key Relationships**

User (John Doe)  
  ↓ creates  
AgentRun (Audit)  
  ↓ contains  
TestCases (User-defined tests)  
  ↓ generates  
BugFindings (System-detected bugs)  
  ↓ reviewed as  
Confirmed / Rejected findings

---

### **6\. 🧩 Data Flow Summary**

1. **User creates audit** → `AgentRun` with `createdBy: "user-1"`

2. **Audit runs test cases** → Displays progress for each

3. **System detects issues** → Generates `BugFinding[]`

4. **Users review findings** → Confirm / reject individual bugs

5. **All linked to creator** → Each bug shows “Audit created by: John Doe”

---

Would you like me to make a **clean visual diagram (Mermaid / architecture view)** of this flow for your dev wiki or README? It would show arrows between `User → AgentRun → TestCases → BugFindings` visually.

