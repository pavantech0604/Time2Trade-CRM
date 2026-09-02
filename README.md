# Time2Trade - Stock Advisory & Trading Operations Portal

A premium, production-ready, mobile-first Employee Operational Desk and Stock-Trading Advisory Portal built using **React**, **TypeScript**, **Tailwind CSS**, and **Supabase** (PostgreSQL, real-time presence/activity notifications, client ledgers, round-robin lead allocation, and SEBI compliance data registers).

---

## 🐂 Brand Design & Logo Theme System

The design system and color palette of the application are derived directly from the dominant colors of the **Time2Trade logo** (`logo.png`):
- **Navy Body (`#091A2F`)**: Utilized as the primary background and surface tone for dark mode interfaces.
- **Brand Gold (`#C5A028`)**: Representing the bull's arc and upward trending arrows. Applied to primary visual badges, highlight metrics, active navigation indicators, and key focus states.
- **Brand Emerald (`#16A34A`)**: Representing the bullish performance bars and success indicators. Applied to active status pills, profit indicators, and main CTA buttons.

---

## ⚡ End-to-End Operational Workflow

The platform handles the complete business lifecycle for an Indian trading advisory firm:

### 1. Employee Onboarding & Roles
- **Signup**: A new employee registers at `/signup`. By default, the account is created with `approval_status = 'pending_admin_review'` and `is_active = false`.
- **Admin Approval**: The Admin accesses `/admin/employees` (Staff & Roles view) to:
  - Inspect the application credentials.
  - Assign a security role: `admin`, `telecaller`, or `relationship_manager`.
  - Approve the account to toggle `is_active` to true.
- **Secure Authentication**: Approved employees log in at `/login`, reading roles from the Supabase profile database and routing them to their respective operational dashboards.

### 2. Lead Lifecycle & Distribution
- **Excel Upload**: Admin uploads lead spreadsheets at `/admin/leads/upload` which validates cell structure, phone formats, and provides error warnings.
- **Round-Robin Auto-Distribution**: On confirm, the batch is instantly assigned to active, approved telecallers in an even, sequential distribution loop.
- **Telecaller Desk**:
  - Filter tabs: *Today's Leads*, *Not Answered*, *Callbacks*, *Interested*, *All My Leads*.
  - Call outcome logger updates state to `called` or `not_answered`.
  - Callback scheduler sets date/time triggers.
  - Interested leads trigger the 5-field qualification drawer (Investment Capacity, Experience, Preferred Segment, Notes) and assign an RM.
- **Lead Cleanup Desk**: Admin regularly checks `/admin/leads/cleanup` to archive unwanted, invalid, or lost records.

### 3. Active Trader Management
- **Conversion**: RM converts pre-qualified leads directly into active traders, creating trading registers, ledger tracking, and setting up daily profit-sharing streaks.
- **Onboarding Modal**: Admin and RM can manually add traders directly using the premium **"Add New Active Trader"** modal from the desktop or mobile viewport.

### 4. Attendance & Status Tracking
- **Presence Selector**: Telecallers & RMs update status in the top bar header: **Online**, **On Break**, **On Lunch**, **Offline**.
- **Admin Lock**: The status dropdown is hidden for Admin. Admin monitors all staff shifts and break durations from the **Attendance Board**.

### 5. Profit Submission & Verifications
- **Payments**: RM submits profit proof and deposits. Payments appear in the verification queue at `/admin/payments`.
- **Verification**: Admin reviews, cross-references UPI/bank reference numbers, and approves/rejects to update client ledger balances.

---

## 📱 Mobile-First Responsive Layout & Animations

- **Responsive Viewport Navigation**: A sticky bottom navigation bar is automatically enabled on mobile screens, displaying primary workspace routes (`Dashboard`, `Leads`, `Staff`, `Attendance`) with touch targets exceeding 44x44px.
- **Table-to-Card Conversion**: Dense desktop tables convert to touch-friendly stacked card lists on mobile viewports.
- **Smooth Animations**: Animated transitions on modal mounts (`animate-fade-in`), sliding drawers (`animate-slide-up`), and subtle glow effects (`animate-pulse-glow`) to create a polished, state-of-the-art visual appearance.
