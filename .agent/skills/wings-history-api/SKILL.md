---
name: Wings AI Client History API Specification
description: Detailed specification for the Wings AI Client History API (POST /3/client/history), including request/response schemas, business logic, and database mapping.
---

# Wings AI Client History API Specification

**API Endpoint**: `POST /3/client/history` (Proposed)
**Sample URL (Wings)**: `https://api.wingslashes.com/3/client/history`
**Sample URL (Orb)**: `http://api.orb/3/client/history`

**Auth**: Requires `session_token` in body for validation.

## 🎯 Objective

Create a single, unified API endpoint that aggregates client service history across multiple store locations. This API will replace the current extension-side logic of manually fetching and parsing multiple CSV files.

## 🛠️ Technical Details

### 1. Request Body

```json
{
  "user_id": 7888,
  "phone": "0907583616",
  "limit": 5,
  "session_token": "YOUR_VALID_ACCESS_TOKEN_HERE"
}
```

> [!NOTE]
> Either `user_id` or `phone` must be provided. If both are provided, `user_id` takes precedence.

### 2. Business Logic (Backend Tasks)

1.  **Authorization**: Validate `session_token`.
2.  **Input Parsing**: Extract `user_id`, `phone` and `limit` from the JSON body.
3.  **Identity Resolution**:
    - If `user_id` is present, search primarily by `user_id`.
    - If only `phone` is present, normalize it and match using the last 9 digits.
4.  **Multisite Fetching**: Query the `order` table across Store IDs 2, 6, and 16.
5.  **Status Scope**: Include Completed, Canceled, Not Coming, and Future appointments.
6.  **Sorting**: Sort by booking date descending, fallback to creation date.
7.  **Limit**: Return top N results (default 5, max 50).

### 3. Core Tables Reference

- `user_profile` (Alias: `Client`) - To match phone number and get client name.
- `order` (Alias: `Ord`) - Main booking record.
- `order_service` (Alias: `OrderService`) - Individual service details.
- `report_order` (Alias: `ReportOrder`) - For date/time filtering.
- `client_store_language` (Alias: `Store`) - To map store names.

### 4. Join & Filter Logic (Reference)

- **Phone Matching**: `RIGHT(user_profile.phone, 9) = RIGHT(:phone, 9)`
- **Store Filtering**: `Ord.client_store_id IN (2, 6, 16)`
- **Sorting**: `ORDER BY ReportOrder.actual_booking_date_start DESC` (Note: `actual_booking_date_start` is a timestamp containing both date and time).

### 5. Success Response (JSON)

```json
{
  "status": "success",
  "user_id": 123,
  "client_name": "String",
  "diamond": 90.5,
  "diamond_referral": 900,
  "total_completed": 10,
  "total_cancelled": 2,
  "total_not_coming": 1,
  "total_spending": 2500000,
  "first_visit_date": "2024-01-01 10:00:00",
  "referral_list": [
    {
      "id": 123,
      "name": "String",
      "phone": "String",
      "last_service": "String",
      "design": "String",
      "color": "String",
      "last_visited": "YYYY-MM-DD HH:mm:ss"
    }
  ],
  "profile_notes": [
    {
      "note": "String",
      "type": "String (normal, warning, danger)",
      "is_pinned": "Boolean",
      "staff_name": "String",
      "date_created": "YYYY-MM-DD HH:mm:ss"
    }
  ],
  "active_combos": [
    {
      "combo_name": "String",
      "price": 3500000,
      "count_new": 3,
      "count_refill": 2,
      "total_new": 5,
      "total_refill": 5,
      "sessions_remaining": 5,
      "sessions_total": 10,
      "expire": "YYYY-MM-DD",
      "is_frozen": false
    }
  ],
  "history_list": [
    {
      "client_name": "String",
      "service_name": "String",
      "design": "String",
      "color": "String",
      "service_date": "YYYY-MM-DD HH:mm:ss",
      "status": "String (Completed, Canceled, Confirmed)",
      "technician_id": "Number",
      "technician_name": "String",
      "CC_Checkin": "String",
      "CC_Checkout": "String",
      "CS_Name": "String",
      "store_name": "String",
      "notes": "String",
      "consultant_note": "String"
    }
  ]
}
```

## 🖼️ Reference Data Mapping

| Field                  | Source Table            | Source Column       | Mapping / Logic                                                             |
| :--------------------- | :---------------------- | :------------------ | :-------------------------------------------------------------------------- |
| `client_name`          | `user_profile`          | `full_name`         | Matched via phone number.                                                   |
| `service_name`         | `service_language`      | `service_name`      | Service Name.                                                               |
| `service_date`         | `report_order`          | `actual_booking...` | Timestamp of the booking.                                                   |
| `status`               | `order`                 | `order_state`       | Status of the order.                                                        |
| `technician_id`        | `order_service`         | `assigned_staff_id` | ID of the technician.                                                       |
| `technician_name`      | `user_profile`          | `full_name`         | Via `order_service.assigned_staff_id`.                                      |
| `CC_Checkin`           | `user_profile`          | `full_name`         | Check-in Staff via `order_service.check_in_staff_id`.                                |
| `CC_Checkout`          | `user_profile`          | `full_name`         | Check-out Staff via `order_service.check_out_staff_id`.                              |
| `CS_Name`              | `user_profile`          | `full_name`         | Booked By via `order.created_staff_id`.                                     |
| `user_id`              | `order`                 | `user_id`           | Unique ID of the client.                                                    |
| `diamond`              | `user_balance`          | `SUM(amount)`       | Total current credit balance.                                               |
| `diamond_referral`     | `user_balance_trans...` | `SUM(amount)`       | Diamonds earned from referral programs.                                     |
| `total_completed`      | `order`                 | `COUNT(*)`          | Count of orders with state 'Completed'.                                     |
| `total_cancelled`      | `order`                 | `COUNT(*)`          | Count of orders with state 'Cancelled'.                                     |
| `total_not_coming`     | `order`                 | `COUNT(*)`          | Count of orders with state 'New' or 'Confirmed' and scheduled time < NOW(). |
| `total_spending`       | `order`                 | `SUM(total_price)`  | Sum of price for 'Completed' orders.                                        |
| `first_visit_date`     | `order`                 | `MIN(date)`         | Timestamp of the very first booking.                                        |
| `store_name`           | `client_store_language` | `client_store_name` | 2: 'Phan Xích Long', 6: 'Đề Thám', 16: 'Estella Place'.                     |
| `notes`                | `order`                 | `booking_note`      | Merged with Client Type if applicable.                                      |
| `active_combos`        | `user_service_balance`  | -                   | List of active packages. See attributes below:                              |
| - `combo_name`         | `service_language`      | `service_name`      | Localized name of the combo package.                                        |
| - `price`              | `service_price`         | `service_price`     | Original purchase price of the package.                                     |
| - `count_new`          | `user_service_balance`  | `normal_count`      | Remaining sessions for **New Sets** (Làm mới).                              |
| - `count_refill`       | `user_service_balance`  | `retain_count`      | Remaining sessions for **Refills** (Dặm).                                   |
| - `total_new`          | `service_price`         | `normal_count`      | Original total **New Sets** in the package.                                 |
| - `total_refill`       | `service_price`         | `retain_count`      | Original total **Refills** in the package.                                  |
| - `sessions_remaining` | `user_service_balance`  | `normal + retain`   | Sum of all remaining sessions (`count_new` + `count_refill`).               |
| - `sessions_total`     | `service_price`         | `normal + retain`   | Sum of original total sessions (`total_new` + `total_refill`).              |
| - `expire`             | `user_service_balance`  | `date_expired`      | Expiration date. Frozen if null.                                            |

## ⚠️ Error Handling

- `401 Unauthorized`: If `session_token` is missing or invalid.
- `400 Bad Request`: If required input fields are missing or invalid.
- `404 Not Found`: If no history is found for that phone number.
- `500 Internal Server Error`: For database/aggregation failures.
