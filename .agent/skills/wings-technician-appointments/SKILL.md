---
name: Wings AI Technician Appointments Display
description: Specification for displaying technician appointment indicators on booking timeslots with hover details
---

# Wings AI Technician Appointments Display

## Overview

When a technician is selected on the Booking Screen, the interface displays visual indicators on timeslots that have existing appointments. Hovering over these indicators reveals detailed appointment information, enabling consultants to make informed booking decisions and avoid conflicts.

## API Integration

### Endpoint: GET /3/technician/active

Lists active technicians with working shifts and weekly days off.

**Query Parameters**:
- `session_token` (required): Valid session token
- `storeId` (optional): Store ID or name (PXL, DT, EP). If omitted, returns all active technicians.

**Response**:
```json
{
  "status": "success",
  "data": [
    {
      "id": 51756,
      "name": "Jane Tech",
      "store": "Phú Xuân Land",
      "working_shift": {
        "start": "09:00:00",
        "end": "17:00:00"
      },
      "weekly_day_off": "Monday"
    }
  ]
}
```

### Endpoint: GET /3/technician/appointments

Retrieves appointments for a specific technician within a date range.

**Base URL**: `{API_BASE}/3/technician/appointments`

**Query Parameters**:
- `session_token` (required): Valid session token
- `technician_id` (required): Selected technician's ID
- `start_date` (required): YYYY-MM-DD format
- `end_date` (required): YYYY-MM-DD format

**Request Trigger**:
The API call is made when:
1. A technician is selected from the "STAFF ON SHIFT" section
2. The date range changes (user navigates between dates)

**Date Range Logic**:
- `start_date`: The first visible date in the calendar view (typically today)
- `end_date`: The last visible date in the calendar view (28 days from start_date, covering 4 weeks)
- **Single-Day Query**: Can also query a single day by setting `start_date` and `end_date` to the same value

**Response Formats**:

The API returns different `estimated_duration` formats based on Triple Match availability.

**Type 1: Individual (Triple Match found)**:
```json
{
  "status": "success",
  "data": [
    {
      "order_id": 322428,
      "date_booked": "2026-02-04",
      "time_booked": "10:00",
      "client_name": "Bích",
      "client_phone": "0903762763",
      "service_name": "New Flawless Mink 770",
      "last_normal_retain_date": "2026-01-06",
      "last_normal_retain_id": 320145,
      "estimated_duration": {
        "type": "individual",
        "breakdown": {
          "preparation": 8,
          "pre_servicing": 4,
          "cleaning": 4,
          "servicing": 72
        },
        "total_minute": 88
      },
      "status": "Confirmed",
      "notes": "Chị khách cũ mà chị không nhớ số...",
      "is_new_client": false,
      "visit_count": 15,
      "last_visit": {
        "date": "2026-01-06",
        "days_ago": 26,
        "services": [
          {
            "service_name": "New Ultralight 990 Refill",
            "service_type": "Retain",
            "technician_name": "Thiên Thiên "
          }
        ]
      },
      "attributes": "9, 12, 11, 10, Black, C, 80, 0.05, Wing"
    }
  ]
}
```

**Type 2: Projected Group Average (fallback)**:
```json
{
  "status": "success",
  "data": [
    {
      "order_id": 322031,
      "date_booked": "2026-02-10",
      "time_booked": "09:00",
      "client_name": "Dương Nguyễn",
      "client_phone": "0902500357",
      "service_name": "Any - Lashes 2",
      "last_normal_retain_date": "2026-01-27",
      "last_normal_retain_id": 319203,
      "estimated_duration": {
        "type": "projected_group_avg",
        "breakdown": null,
        "total_minute": 74,
        "speed_ratio": 0.82
      },
      "status": "New",
      "notes": "27/1 chị book Thảo mới lịch Tết...",
      "is_new_client": false,
      "visit_count": 58,
      "last_visit": {
        "date": "2026-01-27",
        "days_ago": 14,
        "services": [
          {
            "service_name": "New Classic 110",
            "service_type": "Normal",
            "technician_name": "Giang"
          }
        ]
      },
      "attributes": ""
    }
  ]
}
```

### Core Tables

- **`order`** (Alias: `Ord`): Root booking data (order_id, date_booked, time_booked, status)
- **`order_service`** (Alias: `OS`): Assignment links and attribute group keys (technician assignment, service details)
- **`staff_service_ability`** (Alias: `Ability`): Technical speed profiles (7-day moving averages)
- **`item_attribute_value`** (Alias: `Attr`): Lash design elements (Volume, Length, Style, Color, Curl)
- **`user_access_token`** (Alias: `Auth`): Session validation
- **`user_profile`** (Alias: `Staff`): Technician details and status

### Response Schema

- **`order_id`**: Unique booking identifier
- **`date_booked`**: Appointment date in YYYY-MM-DD format
- **`time_booked`**: Appointment start time in HH:MM format (24-hour)
- **`client_name`**: Client's full name (may include Vietnamese Unicode characters)
- **`client_phone`**: Client's phone number
- **`service_name`**: Name of the booked service
- **`last_normal_retain_date`**: Date of the last standard appointment (Normal or Retain) used for gap analysis
- **`last_normal_retain_id`**: ID of the last standard appointment
- **`estimated_duration`**: Duration calculation object
    - `type`: "individual" or "projected_group_avg"
    - `breakdown`: 4-phase breakdown object (individual only)
    - `total_minute`: Total estimated duration in minutes
    - `speed_ratio`: Speed comparison ratio (projected only)
- **`status`**: Appointment status ("New", "Confirmed", "Completed", "Cancelled")
- **`notes`**: Booking notes
- **`is_new_client`**: Boolean indicating if this is a new client
- **`visit_count`**: Total number of visits by this client
- **`last_visit`**: Object containing details of the previous visit
    - `date`: Date of last visit
    - `days_ago`: Number of days since last visit
    - `services`: Array of services with `service_type` (Normal, Retain)
- **`attributes`**: Service attributes (comma-separated string e.g., "9, 12, 11, 10, Black, C, 80, 0.05, Wing")

## Business Rules & Logic

The `last_normal_retain_date` is critical for determining pricing tiers and service eligibility based on the gap since the last paid visit.

### 1. Service Guarantee (Fix/Log/Adjust)
- **Timeframe**: 3 Days from service (special cases may allow extensions).
- **Cost**: Free ($0).
- **Service Types**: `Fix`, `Log`, `Adjust`.
- **Note**: These appointments do **not** reset the `last_normal_retain_date`.

### 2. Standard Pricing Logic
Used for non-combo customers.
- **Gap ≤ 21 Days**: Eligible for **Refill** (Retain price ~60% of normal).
- **Gap > 21 Days**: Charged as **New Set** (Normal price).

### 3. Combo Package Pricing
Used for customers with active combo packages.
- **Gap ≤ 25 Days**: Deducts **1 Refill Count** from package.
- **Gap > 25 Days**: Deducts **1 New Set Count** from package.

## 🧠 Duration Analytics: Adaptive Speed System

The `estimated_duration` is **NOT static**. It's powered by a **7-Day Moving Average** algorithm:

**Background Processing**:
- Every night, `generate-report-staff-technician-service.php` analyzes actual time spent by each technician on completed orders over the last 7 days
- The system calculates average duration for each combination of: **Technician ID + Service ID + Lash Volume**
- Results are stored in the `staff_service_ability` table

**Triple Match Strategy**:
1. **Technician ID**: Specific staff member
2. **Service ID**: The service being performed
3. **Lash Volume**: Design attribute (e.g., 3D vs 5D)

**Selection Rule**: The API selects the **latest row** from `staff_service_ability` for the triple-match, ensuring the technician's most recent speed improvements are reflected immediately.

**Phase Breakdown** (Individual Type Only):
- **preparation**: Station setup, choosing lashes/glue (avg: 8 min)
- **pre_servicing**: Pre-service consultation + Beginning State Photo (avg: 4 min)
- **cleaning**: Eyelash cleaning + Clean State Photo (avg: 4 min)
- **servicing**: Actual lash application + Final Result Photo (avg: 60-90 min)

> [!IMPORTANT]
> The Triple Match Rule **prioritizes precision**. If the system has tracked this specific technician doing this exact service with this volume before, it uses their **real performance data** (`type: "individual"`). Otherwise, it estimates based on the **group average** (`type: "projected_group_avg"`).

## UI Components

### Appointment Indicator (Dot)

**Visual Design**:
- **Shape**: Small circular dot
- **Size**: 6px diameter
- **Position**: Top-right corner of the timeslot button
- **Color Scheme**:
  - `#FFD700` (Gold): Confirmed appointments
  - `#FF6B6B` (Soft Red): Pending/Tentative appointments
  - `#A0A0A0` (Grey): Cancelled appointments (if shown)

**Display Logic**:
- Show indicator if `time_booked` matches the timeslot's start time
- Multiple appointments at the same time: Show stacked dots or a count badge (e.g., "2")
- Indicator appears on top of the existing slot availability styling (does not replace it)

**CSS Implementation** (example):
```css
.timeslot-appointment-indicator {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #FFD700;
    border: 1px solid rgba(255, 255, 255, 0.3);
    z-index: 10;
}

.timeslot-appointment-indicator.multiple {
    /* For multiple appointments */
    width: auto;
    height: auto;
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 600;
}
```

### Appointment Details Tooltip

**Trigger**: `mouseover` / `mouseenter` event on the appointment indicator dot

**Display Behavior**:
- Appears after 200ms delay (prevents accidental triggers)
- Positioned above or below the timeslot based on available space
- Remains visible while cursor is over the indicator or tooltip
- Fades out when cursor leaves both indicator and tooltip

**Tooltip Content Structure** (varies by response type):

**Variant 1: Individual Type (with phase breakdown)**
```
┌──────────────────────────────────────┐
│ 🕐 12:15 - 13:09 (54 min)           │
│ ⚡ ADAPTIVE SPEED                    │
├──────────────────────────────────────┤
│ Linh • 0909561176                   │
│ ⭐ Visit #85                         │
├──────────────────────────────────────┤
│ 📅 Last: 2026-01-13 (20d ago)       │
│ 🛠️ New Ultralight 660 by Thảo Lê    │
├──────────────────────────────────────┤
│ New Ultralight 660 Refill           │
│ Black, D, C, 60, 0.05, Natural      │
├──────────────────────────────────────┤
│ 📊 Prep (2m) → Check (14m) →        │
│    Clean (1m) → Service (37m)       │
├──────────────────────────────────────┤
│ ✅ Completed                         │
│ 📝 29/1 Chị book dặm mi, CV Thảo Lê │
└──────────────────────────────────────┘
```
*Based on real Test Case 2 data*

**Variant 2: Projected Group Avg (with speed ratio)**
```
┌──────────────────────────────────────┐
│ 🕐 09:00 - 10:14 (74 min)           │
│ 📊 ESTIMATED                         │
├──────────────────────────────────────┤
│ Dương Nguyễn • 0902500357           │
│ ⭐ Visit #58                         │
├──────────────────────────────────────┤
│ 📅 Last: 2026-01-27 (14d ago)       │
│ 🛠️ New Classic 110 by Giang         │
├──────────────────────────────────────┤
│ Any - Lashes 2                       │
│ (No design specified)                │
├──────────────────────────────────────┤
│ ⚡ 82% speed (faster than avg)      │
├──────────────────────────────────────┤
│ ⏱ New                               │
│ 📝 27/1 chị book Thảo mới lịch...   │
└──────────────────────────────────────┘
```

**Data Mapping**:

| Tooltip Field | API Field | Format | Notes |
|---------------|-----------|--------|-------|
| Time Range | `time_booked` + `estimated_duration.total_minute` | HH:MM - HH:MM (XXX min) | End time calculation needed |
| Client Info | `client_name` + `client_phone` | Name • Phone | - |
| Visit Badge | `is_new_client` + `visit_count` | "NEW CLIENT 🌟" or "Visit #X" | - |
| Last Visit | `last_visit` | "📅 Last Visit: [date] ([days]d ago)" | Show if object exists |
| Last Service | `last_visit.services` | "🛠️ [Service] by [Tech]" | Show first service if list exists |
| Service | `service_name` | Direct display | - |
| Attributes | `attributes` | Direct display or "No design specified" | Show only if not empty |
| Duration Type | `estimated_duration.type` | "Adaptive Speed" (individual) or "Estimated" (projected_group_avg) | Visual badge |
| Phase Breakdown | `estimated_duration.breakdown` | Show 4 phases if type="individual" | Conditional display |
| Speed Indicator | `estimated_duration.speed_ratio` | "82% speed" (show only if type="projected_group_avg") | Conditional display |
| Status | `status` | Icon + text | Color-coded |
| Notes | `notes` | Truncate if > 60 chars | Show only if not empty |

**Conditional Tooltip Elements**:

```javascript
// Display phase breakdown ONLY if type is "individual"
if (appointment.estimated_duration.type === "individual" && appointment.estimated_duration.breakdown) {
    // Show: Preparation (8m) → Pre-service (4m) → Cleaning (4m) → Service (72m)
}

// Display speed ratio ONLY if type is "projected_group_avg"
if (appointment.estimated_duration.type === "projected_group_avg" && appointment.estimated_duration.speed_ratio) {
    // Show: "⚡ 82% speed" (faster than average)
}
```

**Tooltip Styling** (example):
```css
.appointment-tooltip {
    position: absolute;
    background: rgba(20, 20, 35, 0.98);
    border: 1px solid rgba(255, 215, 0, 0.3);
    border-radius: 12px;
    padding: 12px;
    min-width: 260px;
    max-width: 320px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(10px);
    z-index: 1000;
    font-size: 13px;
    line-height: 1.4;
    color: #E0E0E0;
}

.appointment-tooltip-time {
    font-size: 14px;
    font-weight: 600;
    color: #FFD700;
    margin-bottom: 8px;
}

.appointment-tooltip-client {
    font-size: 13px;
    font-weight: 500;
    color: #FFFFFF;
    margin-bottom: 4px;
}

.appointment-tooltip-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    background: rgba(255, 215, 0, 0.2);
    color: #FFD700;
    font-size: 11px;
    font-weight: 600;
    margin-bottom: 8px;
}

.appointment-tooltip-service {
    font-weight: 500;
    color: #FFFFFF;
    margin-bottom: 2px;
}

.appointment-tooltip-attributes {
    color: #B0B0B0;
    font-size: 12px;
    margin-bottom: 8px;
}

.appointment-tooltip-status {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
}

.appointment-tooltip-notes {
    color: #A0A0A0;
    font-style: italic;
    font-size: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 8px;
    margin-top: 8px;
}
```

## State Management

### Data Storage

Store fetched appointments in state when technician is selected:

```javascript
state.selectedTechnicianAppointments = {
    technicianId: 51756,
    appointments: [...], // Array from API response
    dateRange: {
        start: "2026-02-04",
        end: "2026-02-11"
    },
    lastFetched: "2026-02-04T08:24:53+07:00"
}
```

### Cache Strategy

- Cache appointments for 5 minutes
- Invalidate cache when:
  - Different technician is selected
  - Date range changes
  - User manually refreshes the booking screen
  - A new booking is confirmed (to reflect updated state)

### Performance Optimization

- Debounce tooltip display by 200ms
- Lazy render tooltips (only create DOM element on first hover)
- Reuse tooltip DOM element, update content on subsequent hovers
- Limit API calls: fetch once per technician per date range

## Integration with Booking Screen

### Slot Rendering Logic

When rendering timeslot buttons:

1. Check if `state.selectedTechnicianAppointments` exists
2. For each timeslot, check if any appointment matches `time_booked`
3. If match found, append indicator dot to the slot's DOM
4. Attach hover event listeners to the indicator

### Example Integration Code

```javascript
function renderTimeslotWithAppointment(slot, appointments) {
    const slotTime = slot.time; // e.g., "09:00"
    
    // Find ALL appointments at this time (not just one)
    const appointmentsAtTime = appointments.filter(apt => apt.time_booked === slotTime);
    
    const slotButton = createSlotButton(slot);
    
    if (appointmentsAtTime.length > 0) {
        const indicator = document.createElement('div');
        indicator.className = 'timeslot-appointment-indicator';
        
        // Handle multiple appointments
        if (appointmentsAtTime.length > 1) {
            indicator.classList.add('multiple');
            indicator.textContent = appointmentsAtTime.length;
            indicator.dataset.appointments = JSON.stringify(appointmentsAtTime);
        } else {
            indicator.dataset.appointment = JSON.stringify(appointmentsAtTime[0]);
        }
        
        indicator.addEventListener('mouseenter', (e) => {
            showAppointmentTooltip(e.target, appointmentsAtTime);
        });
        
        slotButton.appendChild(indicator);
    }
    
    return slotButton;
}
```

**Key Implementation Notes**:
- Use `filter()` instead of `find()` to capture all appointments at the same time
- The test case shows 3 real appointments at 09:00 for technician 45417 on 2026-02-10
- Display count badge when `appointmentsAtTime.length > 1`

## Interaction Flow

```
User selects technician from "STAFF ON SHIFT"
    ↓
Fetch appointments via /3/technician/appointments
    ↓
Cache appointments in state
    ↓
Re-render timeslots with appointment indicators
    ↓
User hovers over appointment dot
    ↓
Display tooltip with appointment details
    ↓
User moves cursor away
    ↓
Hide tooltip with fade-out animation
```

## Edge Cases

### Multiple Appointments at Same Time

**Scenario**: Multiple appointments scheduled at the same timeslot (e.g., 3 appointments at 09:00)

**Real Example from API**:
```json
// Three separate appointments at 09:00 on 2026-02-10
{ "order_id": 322031, "client_name": "Dương Nguyễn", "time_booked": "09:00" }
{ "order_id": 322476, "client_name": "Huyền", "time_booked": "09:00" }
{ "order_id": 322476, "client_name": "Huyền", "time_booked": "09:00" }
```

**Handling**:
- Display count badge (e.g., **"3"**) instead of single dot
- Use different color to indicate overbooking: `#FF6B6B` (Soft Red)
- On hover, show combined tooltip with all appointments listed vertically
- Separate each appointment with a subtle divider line

**Multi-Appointment Tooltip Structure**:
```
┌──────────────────────────────────────┐
│ 🕐 09:00 - Multiple Bookings (3)    │
├──────────────────────────────────────┤
│ 1. Dương Nguyễn • 0902500357        │
│    Any - Lashes 2 (74 min)          │
│    Visit #58                         │
│                                      │
│ 2. Huyền • 0937600400               │
│    Any - Lashes 2 (74 min)          │
│    Visit #152                        │
│                                      │
│ 3. Huyền • 0788716868               │
│    Any - Lashes 2 (74 min)          │
│    Visit #152                        │
├──────────────────────────────────────┤
│ ⚠️ OVERBOOKING ALERT                │
└──────────────────────────────────────┘
```

**CSS for Count Badge**:
```css
.timeslot-appointment-indicator.multiple {
    width: auto;
    height: auto;
    padding: 3px 7px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 700;
    background: #FF6B6B;
    color: #FFFFFF;
    border: 1px solid rgba(255, 255, 255, 0.5);
}
```

### Overlapping Appointments

**Scenario**: Appointment 1 (10:00-12:00) overlaps with slot at 11:00

**Handling**:
- Show indicator only on the starting timeslot (10:00)
- Tooltip displays full duration range
- Optionally: Grey out overlapping slots with reduced opacity

### New Client Badge

**Display Logic**:
```javascript
if (appointment.is_new_client) {
    badge = "NEW CLIENT 🌟";
} else {
    badge = `Visit #${appointment.visit_count}`;
}
```

### Missing or Empty Fields

**Notes Field**: Display only if not empty or null
**Attributes Field**: Display "No attributes specified" if empty
**Phone Number**: Mask if privacy mode is enabled (future feature)

## Future Enhancements

- Click indicator to open full appointment editing modal
- Color-code indicators by service type
- Show appointment conflicts visually (overlapping times)
- Add "Book Anyway" option for consultants to override conflicts
- Display technician's running late status on appointment indicators

## Related Skills

- [Wings AI Booking Screen](../wings-ai-booking-screen/SKILL.md) - Parent booking interface
- [Wings Booking Slots API](../wings-booking-slots-api/SKILL.md) - Slot availability logic
- [Wings AI Main Interface](../wings-ai-main-interface/SKILL.md) - Overall UI framework
