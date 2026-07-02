# API Flow & Scraping Reference - RTMNU Smart Result Portal

This document provides a technical guide to the cascading endpoints queried on the official RTMNU Result portal backend.

---

## 1. API Endpoints Reference

All cascading endpoints are accessed relative to the base domain:
`https://rtmnuresults.uonex.in`

### 1.1. Get Sessions (by Department)
Loads sessions (e.g. `WINTER-2025`, `SUMMER-2025`) for autonomous or university departments.
- **Endpoint:** `/Auth/GetDegreesBySession`
- **Method:** `GET`
- **Query Params:**
  - `department`: `U` (University) or `A` (Autonomous)
- **Response Format (JSON):**
  ```json
  [
    {
      "sessionYear": "WINTER-2025",
      "examType": "REGULAR",
      ...
    }
  ]
  ```

### 1.2. Get Faculty List
Retrieves faculty domains (e.g., Science & Technology, Humanities).
- **Endpoint:** `/Auth/GetFacultyName`
- **Method:** `GET`
- **Query Params:**
  - `department`: `U` or `A`
  - `session`: `WINTER-2025`
- **Response Format (JSON):**
  ```json
  [
    {
      "id": "1",
      "name": "FACULTY OF SCIENCE & TECHNOLOGY"
    }
  ]
  ```

### 1.3. Get Degree List (by Faculty)
Loads degree classes based on selected Faculty.
- **Endpoint:** `/Auth/GetDegreesByFaculty`
- **Method:** `GET`
- **Query Params:**
  - `faculty`: ID of the faculty (e.g. `1`)
  - `session`: Selected session name
  - `department`: `U` or `A`
- **Response Format (JSON):**
  ```json
  [
    {
      "degree": "B.E. (COMPUTER TECHNOLOGY)"
    }
  ]
  ```

### 1.4. Get Course List (by Degree & Faculty)
Gets course streams for the selected degree.
- **Endpoint:** `/Auth/GetCoursesByFacultyDegree`
- **Method:** `GET`
- **Query Params:**
  - `faculty`: ID of the faculty
  - `coursecode`: Selected degree name
  - `session`: Selected session name
  - `department`: `U` or `A`
- **Response Format (JSON):**
  ```json
  [
    {
      "courseCode": "1203",
      "courseName": "B.E. COMPUTER TECHNOLOGY SEMESTER-VIII (CBS)"
    }
  ]
  ```

### 1.5. Get Roll Numbers (by Course Code)
Retrieves all registered student roll numbers for a selected course.
- **Endpoint:** `/Auth/GetRollNumbers`
- **Method:** `GET`
- **Query Params:**
  - `coursecode`: ID code of the course (e.g. `1203`)
  - `department`: `U` or `A`
- **Response Format (JSON):**
  ```json
  [
    {
      "crollno": "481516"
    }
  ]
  ```

### 1.6. View Gazette Report
Opens the PDF/HTML gazette listing for the course.
- **Endpoint:** `/GetGazetteReport_Report`
- **Method:** `GET`
- **Query Params:**
  - `faculty`: Faculty ID
  - `degree`: Degree name
  - `courseCode`: Course code ID
  - `department`: `U` or `A`

### 1.7. Get Student Marksheet
Streams the original PDF marksheet report for a specific roll number.
- **Endpoint:** `/GetMarkSheet_report`
- **Method:** `GET`
- **Query Params:**
  - `rollno`: Student roll number
  - `session`: Session name
  - `courseCode`: Course code ID
  - `faculty`: Faculty ID
  - `degree`: Degree name
  - `department`: `U` or `A`
  - `_t`: Cache-busting timestamp
  - `rand`: Cache-busting random string
