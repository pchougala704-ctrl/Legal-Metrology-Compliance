# Legal Metrology Compliance

An inspection-management dashboard for legal metrology compliance teams. The current repository contains the Member 5 dashboard module, designed to consume inspection and analytics data from a Member 4 FastAPI backend.

## Current Project Structure

```text
dashboard/
├── index.html                    Dashboard application shell
├── dashboard.js                  UI state, rendering, filters, charts, and interactions
├── services/
│   └── dashboardApi.js           FastAPI adapter and demo fallback data
└── styles/
		└── dashboard.css             Responsive dashboard styling
```

There is currently no existing frontend framework, package manager configuration, backend implementation, routing system, or authentication system in this repository. The dashboard is therefore implemented as a dependency-free browser module and does not modify other team-owned areas.

## Features

- Inspection summary statistics
- Searchable and filterable inspection table
- Inspection detail modal
- Inspection activity trend chart
- Inspection status visualization
- Inspector activity timeline
- Violation severity and category overview
- Coordinate-based inspection map markers
- CSV inspection report export
- Responsive desktop, tablet, and mobile layouts
- Loading through live API data or clearly labeled demo data
- Reuse of existing `access_token` or `token` values from `localStorage`

## Run Locally

No dependencies are required for the current standalone version.

Open [dashboard/index.html](dashboard/index.html) directly in a browser. The dashboard starts in demo mode because no backend exists in the current repository.

## Connect the FastAPI Backend

Define the API base URL before loading the dashboard:

```html
<script>
	window.DASHBOARD_API_BASE_URL = 'http://localhost:8000';
</script>
<script type="module" src="dashboard.js"></script>
```

When a base URL is configured, [dashboardApi.js](dashboard/services/dashboardApi.js) requests:

```text
GET /api/dashboard/stats
GET /api/inspections
GET /api/inspections/{id}
GET /api/dashboard/inspection-trends
GET /api/dashboard/violations
GET /api/dashboard/inspector-activity
```

The adapter sends a bearer token when `localStorage` contains either `access_token` or `token`. It does not create a separate login flow.

The expected response shapes are flexible for the collection endpoints:

- Inspections may be returned directly as an array or inside an `items` property.
- Trends may be returned directly or inside a `data` property.
- Activity may be returned directly as an array or inside an `items` property.
- Violation analytics should provide `severity` and `categories` arrays.
- Dashboard statistics should provide values such as `totalInspections`, `completed`, `openViolations`, and `inspectors`.

If the API cannot be reached, the UI falls back to the demo dataset and displays an API warning instead of exposing raw errors.

## Dashboard Demo Flow

1. Open the dashboard.
2. Review the inspection summary cards.
3. Search for an inspection such as `INS-1045`.
4. Use status or priority filters.
5. Select the arrow in a table row to view inspection details.
6. Select a map marker to open the same detail view.
7. Change the inspection trend period.
8. Export the inspection table as CSV.

## Validation

The current module has been checked with:

```text
node --check dashboard/dashboard.js
node --check dashboard/services/dashboardApi.js
```

Browser smoke checks confirmed dashboard rendering, demo statistics, table filtering, inspection details, map markers, and the mobile layout.