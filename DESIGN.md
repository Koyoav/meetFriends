# MeetFriends — Technical Design

## 1. Overview

An app to help a household track their friends, rank the relationships, log
gatherings, and get reminded when it's time to reconnect.

## 2. Tech Stack

- **Backend:** Python 3.12, FastAPI, MySQL, SQLAlchemy (ORM) + Alembic (migrations)
- **Auth:** Custom JWT (access + refresh tokens), passwords hashed with passlib/bcrypt
- **Mobile:** React Native (iOS + Android from one codebase)
- **Push notifications:** Firebase Cloud Messaging
- **Hosting:** Railway or Render (managed MySQL + Python app deploy) — finalized at deploy time
- **Repo:** `Koyoav/meetfriends` (private)

## 3. Multi-tenancy

Built multi-tenant from day one via a `Household` entity, even though only one
household (you + your wife) exists today. This avoids a schema migration when
the app later opens up to other households, and lays groundwork for optional
future billing per household.

## 4. Data Model

### Household
| field | type | notes |
|---|---|---|
| id | PK | |
| name | string | |
| created_at | datetime | |

### User
| field | type | notes |
|---|---|---|
| id | PK | |
| household_id | FK → Household | |
| email | string, unique | |
| password_hash | string | |
| name | string | |
| created_at | datetime | |

Each user belongs to exactly one household. You and your wife = two Users in
one Household, each with your own login.

### Friend (a family/couple unit — the core entity)
| field | type | notes |
|---|---|---|
| id | PK | |
| household_id | FK → Household | |
| display_name | string | e.g. "The Cohens" |
| notes | text, nullable | free-form notes |
| kids_fit_score | int 1–10, nullable | nullable if they have no kids |
| adult_fit_score | int 1–10 | |
| importance_score | int 1–10 | overall connection importance |
| created_at / updated_at | datetime | |

A Friend is a family unit, not an individual — matches "some friends are only
ours, some have kids that get along with ours."

### Person (individual members of a Friend family)
| field | type | notes |
|---|---|---|
| id | PK | |
| friend_id | FK → Friend | |
| name | string | |
| role | enum: adult / kid | |
| birth_year | int, nullable | optional, useful context for kids-fit |

### FriendGatheringType (the "relationship tracks" you want to maintain per friend)
| field | type | notes |
|---|---|---|
| id | PK | |
| friend_id | FK → Friend | |
| type | enum: FAMILY / MEN_1_1 / WOMEN_1_1 / KIDS_ONLY / CUSTOM | preset list + custom |
| custom_label | string, nullable | used when type = CUSTOM |
| reminder_threshold_days | int | default 60, editable per friend per type |
| created_at | datetime | |

Each Friend can have one or more gathering types configured — e.g. a friend
might only need "Family," while another has "Family" + "Men 1:1" + "Women 1:1,"
each tracked and reminded independently.

### Gathering (history log — one row per actual hangout)
| field | type | notes |
|---|---|---|
| id | PK | |
| friend_id | FK → Friend | |
| gathering_type_id | FK → FriendGatheringType | which "track" this satisfied |
| date | date | |
| location | enum: OUR_PLACE / THEIR_PLACE / OUTSIDE | |
| notes | text, nullable | |
| created_by | FK → User | who logged it |
| created_at | datetime | |

Full history is retained (not just "last gathering") — "last gathering" per
type is simply the most recent Gathering row for that gathering_type_id.

## 5. Reminders

Computed, not stored as their own table (at least for v1):

- For each `FriendGatheringType`, find the most recent `Gathering` of that
  type → `days_since_last`.
- "Overdue" = `days_since_last > reminder_threshold_days` (default 60,
  editable per friend per gathering type).
- **Reminders screen:** all overdue (friend, gathering type) pairs, sorted by
  most overdue first. A single friend can appear multiple times if several of
  their gathering types are overdue independently (e.g. "Men 1:1" overdue
  while "Family" is fine).
- **Push notifications (phase 2):** a scheduled backend job periodically
  checks for newly-crossed thresholds and pushes via FCM.

## 6. Invite planning ("who should we host?")

A dedicated view/endpoint over the `Friend` list, answering "who should we
invite next?" Supports:

- **Filter by gathering type**, default `ALL`:
  - `ALL` — staleness computed from the most recent `Gathering` of *any*
    type for that friend.
  - A specific type (e.g. `FAMILY`, `MEN_1_1`) — staleness computed from the
    most recent `Gathering` of *that* type only (friends who've never had
    that type, or that type isn't configured for, sort as "never/infinite").
- **Sort by:**
  - Longest time since last gathering (of the selected type)
  - Best `kids_fit_score`
  - Best `adult_fit_score`
  - `combined_score` (see below)

### Combined score

`combined_score = average(kids_fit_score, adult_fit_score, importance_score)`
for v1 (if a friend has no kids, `kids_fit_score` is excluded from the
average rather than treated as 0).

Implemented behind a single function (e.g. `compute_combined_score(friend)`
in one place in the backend), not inlined into queries — so the formula
(weights, which fields count, whether to require kids_fit) can change later
without touching API contracts or the mobile app.

## 7. Logging a gathering ("it just happened")

A first-class, low-friction flow — not just a history record. From a
friend's page (or from the invite-planning list), you can log a gathering in
a couple taps: pick the gathering type (defaults to the friend's only type if
they have just one), date (defaults to today), location, optional notes.
This is the same `Gathering` create endpoint described in the data model —
called out here because it's a primary interaction, not an afterthought.

## 8. Auth model

Custom JWT (access + refresh). All users in a household have equal
permissions on that household's data for now — no owner/admin distinction
yet (can be added later if needed for multi-user households or billing
roles).

## 9. Phased roadmap

**Phase 1 — MVP**
- Backend: household/user signup + login, Friend CRUD (+ People),
  FriendGatheringType CRUD, Gathering (history) CRUD, rankings
- Mobile: login, friend list (sortable/filterable by rankings), add/edit
  friend incl. people + gathering types, log a gathering, Reminders screen
  (in-app, no push yet)

**Phase 2 — Push notifications**
- FCM integration, scheduled job for threshold-crossing detection, device
  token registration from the mobile app

**Phase 3 — Future (not building yet)**
- Multi-household self-signup / onboarding flow
- Billing/subscription support
