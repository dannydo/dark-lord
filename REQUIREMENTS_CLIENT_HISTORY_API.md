# Backend Specification: Wings AI Client History API

## 🎯 Objective
Create a single, unified API endpoint that aggregates client service history across multiple store locations. This API will replace the current extension-side logic of manually fetching and parsing multiple CSV files.

## 🛠️ Technical Details

### 1. Endpoint Definition
*   **Verb**: `POST`
*   **Path**: `???`
*   **Auth**: Requires `X-Wings-Token` in headers for validation.
*   **Content-Type**: `application/json`

### 2. Request Body
```json
{
  "phone": "0907583616"
}
```

### 3. Business Logic (Backend Tasks)
The backend must perform the following steps:
1.  **Normalization**: Clean the input phone number (remove spaces, symbols).
2.  **Multisite Fetching**: Query the internal booking data for Store IDs: `2`, `6`, and `16`.
3.  **Time Window**: Look back at least **60 days** from the current date.
4.  **Aggregation & Filtering**:
    *   Match clients by the **last 9 digits** of their phone number (handling `+84`, `0`, and `'` prefixes).
    *   Sort all matching bookings by `DATE BOOKED` + `TIME BOOKED` in **descending order**.
5.  **Field Mapping**: Extract the most recent booking details into the schema below.

### 4. Success Response (JSON)
```json
{
  "status": "success",
  "user_id": 7888,
  "client_name": "Ngọc Trân",
  "diamond": 90,
  "diamond_referral": 300,
  "total_completed": 234,
  "total_cancelled": 8,
  "total_not_coming": 6,
  "total_spending": 57795100,
  "active_combos": "Classic (5 sessions left), Under Eyelash (3 sessions left)",
  "active_combos_raw": [
    {
      "combo_name": "Classic",
      "count_new": 2,
      "count_refill": 3
    },
    {
      "combo_name": "Under Eyelash Extensions",
      "count_new": 1,
      "count_refill": 2
    }
  ],
  "first_visit_date": "2018-01-11 19:06:25",
  "referral_list": [
    {
      "id": "17662",
      "name": "Mai",
      "phone": "...",
      "last_service": "Classic 390",
      "design": "Natural",
      "color": "Black",
      "last_visited": "2018-11-17 14:00:00"
    }
  ],
  "profile_notes": [
    {
      "note": "CHỊ VIÊM MI MẮT DƯỚI...",
      "date_created": "2023-07-05 17:15:24",
      "is_pinned": "1",
      "staff_name": "Hoàng Kim",
      "type": "danger"
    }
  ],
  "history_list": [
    {
      "client_name": "Ngọc Trân",
      "service_name": "New Classic 440 Refill",
      "design": "Wing",
      "color": "Black",
      "service_date": "2026-01-29 14:56:11",
      "status": "Completed",
      "technician_name": "Mi Na",
      "store_name": "De Tham",
      "notes": "..."
    }
  ]
}
```

### 5. Error Handling
*   `400 Bad Request`: If `phone` is missing or invalid.
*   `404 Not Found`: If no history is found for that phone number.
*   `500 Internal Server Error`: For database/aggregation failures.

---

## 🖼️ Reference Data Mapping
The data is currently sourced from existing CSV endpoints at `api.wingslashes.com/2/sheet/...`. The new API should encapsulate this logic so the client (extension) receives a clean object.

*   `technician_name` ➔ Maps from `CV` column.
*   `consultant_name` ➔ Maps from `BOOKED BY` column.
*   `store_name` ➔ Store 2: 'Phan Xích Long', Store 6: 'Đề Thám', Store 16: 'Estella Place'.
