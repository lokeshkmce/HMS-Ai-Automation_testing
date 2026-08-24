# End-to-End Multi-Role Appointment Booking & Check-In Test Cases

## Document Metadata
- **Project**: Omnivva Health Management Systems (HMS)
- **Feature**: Multi-Role Multi-Tenant Appointment Booking, Receptionist Check-In & Doctor Consultation Queue Reflection
- **Environment**: DEV (`https://dev-hms.srivyn.in`)
- **Author**: Antigravity Quality Engineering Team

---

## 1. Test Suite Summary

| Test ID | Test Scenario | Role(s) Involved | Priority | Type |
| :--- | :--- | :--- | :--- | :--- |
| **TC_E2E_APPT_01** | Complete End-to-End Appointment Booking, Receptionist Check-In, and Doctor Queue Reflection | Patient $\to$ Receptionist $\to$ Doctor | Critical (P0) | E2E Positive |
| **TC_SEC_TENANT_01** | Multi-Tenant Security Boundary Isolation (Cross-Hospital Access Prevention) | Receptionist (Tenant A vs Tenant B) | High (P1) | Security / Boundary |
| **TC_PATIENT_BOOK_01** | Patient Slot Selection & Booking Confirmation Validation | Patient | High (P1) | Functional |
| **TC_RECEPT_CHECKIN_01**| Receptionist OPD Queue Filtering & Patient Status Update | Receptionist | High (P1) | Functional |
| **TC_DOCTOR_QUEUE_01** | Real-Time Consultation Queue Reflection for Checked-In Patient | Doctor | High (P1) | Integration / UI |

---

## 2. Detailed Test Cases

### **TC_E2E_APPT_01: Complete Multi-Role Workflow (Patient $\to$ Receptionist $\to$ Doctor)**
* **Description**: Verify the end-to-end lifecycle of an appointment from patient creation, receptionist check-in at SRM Hospital, through to the doctor's active consultation queue.
* **Pre-conditions**:
  - Patient registered (`patient.test@gmail.com`).
  - Staff user (`qa@omnivva.com`) with access to switch between Receptionist and Doctor roles.
* **Execution Steps**:
  1. **[Flow 1 - Patient Portal]**:
     - Navigate to HMS Landing Page $\to$ Click "Patient Login".
     - Authenticate using email `patient.test@gmail.com` and OTP `0000`.
     - Navigate to "Book Doctor" / Appointment Booking section.
     - Select Hospital: **"SRM Hospital"**.
     - Select an available Doctor, select appointment date & time slot.
     - Confirm booking and capture the generated `Appointment ID` and `Patient Name`.
     - Take screenshot: `patient_booking_confirmation.png`.
  2. **[Flow 2 - Receptionist Portal]**:
     - Open browser context / switch to **Receptionist** role for SRM Hospital branch.
     - Navigate to **Appointments List / Check-In Screen / OPD Queue**.
     - Filter/Search by the captured `Appointment ID` or `Patient Name`.
     - Validate appointment status is initially "Scheduled" / "Confirmed".
     - Click **"Check-In" / "Mark as Arrived"**.
     - Verify status transitions to **"Checked In" / "Arrived"**.
     - Take screenshot: `receptionist_checked_in.png`.
  3. **[Flow 3 - Doctor Portal]**:
     - Open browser context / switch to **Doctor** role (SRM Hospital Doctor console).
     - Navigate to **Doctor Console / OPD Queue / Patient Queue**.
     - Search or locate the patient's record.
     - Verify real-time status reflects as **"Checked In" / "Waiting for Consultation"**.
     - Take screenshot: `doctor_queue_reflection.png`.
* **Expected Result**: The appointment is booked, checked in, and reflected across all three roles seamlessly with consistent metadata and status indicators.

---

### **TC_SEC_TENANT_01: Multi-Tenant Boundary Isolation**
* **Description**: Verify that an appointment booked under **SRM Hospital** is strictly isolated and **never accessible, searchable, or actionable** by a receptionist belonging to an alternate hospital/branch tenant.
* **Execution Steps**:
  1. Book an appointment under **SRM Hospital** (Branch A) and obtain `Appointment ID`.
  2. Switch Receptionist context to an alternate hospital branch (Branch B / Organization B).
  3. Query the appointments list / OPD queue for the SRM `Appointment ID`.
* **Expected Result**: The query returns 0 results / "No appointments found" or access denied; the receptionist cannot check-in or view patient records across hospital boundaries.

---

### **TC_PATIENT_BOOK_01: Patient Slot Selection & Validation**
* **Description**: Verify patient can view available calendar dates, dynamic slot availability, doctor profile details, and receive validation on required inputs.
* **Expected Result**: Only open slots can be selected; past slots and blocked intervals are disabled.

---

### **TC_RECEPT_CHECKIN_01: Receptionist OPD Queue Filtering**
* **Description**: Verify receptionist can filter appointments by date, doctor, and status (All, Scheduled, Checked-In, Completed).
* **Expected Result**: Grid filters update accurately and status actions are enabled only for valid states.

---

### **TC_DOCTOR_QUEUE_01: Doctor Queue Real-Time Synchronization**
* **Description**: Verify doctor's patient queue list updates without requiring manual hard page refresh when patient is checked in at reception desk.
* **Expected Result**: Patient entry displays in the "Waiting" section with token number, appointment time, and arrival timestamp.

---

## 3. Requirement Traceability Matrix (RTM)

| Requirement | Test Case ID | Test Type | Automation Status |
| :--- | :--- | :--- | :--- |
| Patient Booking with SRM Hospital & Doctor Selection | TC_E2E_APPT_01, TC_PATIENT_BOOK_01 | Functional / E2E | Automated |
| Appointment ID & Patient Metadata Generation | TC_E2E_APPT_01 | Data Integrity | Automated |
| Multi-Tenant Branch Check-In Validation | TC_E2E_APPT_01, TC_RECEPT_CHECKIN_01 | Functional | Automated |
| Cross-Tenant Data Isolation Security Rule | TC_SEC_TENANT_01 | Security | Automated |
| Doctor Consultation Queue Real-Time Update | TC_E2E_APPT_01, TC_DOCTOR_QUEUE_01 | Integration | Automated |
