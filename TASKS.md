# Mock Interview Platform — Full Implementation Task List

---

## Task 1: Project Setup & Repository Structure

Set up Next.js project with TypeScript, Tailwind CSS, shadcn/ui, ESLint, folder structure, and environment variable configuration.

**Acceptance criteria:**
- `npm run dev` runs without errors
- Tailwind and shadcn/ui components render correctly
- `.env.local` template created with all required keys documented
- Folder structure: `/app`, `/components`, `/lib`, `/hooks`, `/types`, `/prompts` established

---

## Task 2: Database Schema Design & Migration

Design and apply Supabase PostgreSQL schema for all entities: users, sessions, rounds, messages, evaluations, saved answers, session results.

**Acceptance criteria:**
- All tables created with correct relationships and foreign keys
- Row Level Security (RLS) policies enabled — users can only access their own data
- Indexes on `user_id`, `session_id`, `created_at` for query performance
- Schema migration file committed to repo

---

## Task 3: Phone Number Login (No OTP)

User enters their phone number to identify themselves. If the phone number exists in the DB, the user is logged in. If not, a new user record is created automatically. No OTP or password required.

**Acceptance criteria:**
- Login screen shows a single phone number input field and a "Continue" button
- Phone number validated for format (digits only, 10–15 characters) before submission
- Existing phone → user fetched from DB and session created
- New phone → new user record inserted into `users` table, then session created
- Auth state (user id + phone) persisted in a cookie or localStorage across page refresh
- User redirected to the Dashboard (session list) after successful login
- Error message shown if phone number format is invalid

---

## Task 4: Dashboard — Session List Screen

After login, display the user's dashboard as the home screen. It shows a list of all past interview sessions and a prominent "New Session" button.

**Acceptance criteria:**
- Dashboard is the first screen after login
- Session list shows each session as a card with: session name, JD job title, date created, status (active / completed), rounds completed count, overall score (if completed)
- Sessions sorted by most recent first
- Empty state shown (with illustration and prompt text) when no sessions exist yet
- "New Session" button is visible at the top of the screen at all times
- "Continue" button on active session cards; "Review" button on completed session cards
- Clicking "New Session" navigates to the Create Session screen (Task 5)

---

## Task 5: Create Session Screen — Document Upload

When the user clicks "New Session" from the dashboard, a dedicated screen is shown where they upload their CV, JD, and optional extra information before starting the interview setup.

**Acceptance criteria:**
- Screen has three sections:
  - **CV upload**: drag-and-drop or file picker, accepts PDF only, max 5MB
  - **Job Description**: drag-and-drop PDF upload OR plain text paste (tab toggle between modes)
  - **Extra info** (optional): free text field (max 500 characters) for context such as target company, specific concerns, or interview date
- Uploaded PDF files have text extracted automatically via `pdf-parse`; extracted text previewed below the upload area
- File validation: wrong format or oversized file shows inline error message
- Session name field (optional, auto-generated as "Interview – [Job Title] – [Date]" if left blank)
- "Create Session" button disabled until both CV and JD are provided
- On submit: session saved to DB with status `draft`, extracted texts stored, user redirected to Interview Plan Review screen (Task 6)

---

## Task 6: Interview Plan Review & Confirmation

After the session is created, call the AI to generate a structured interview plan from the uploaded CV, JD, and extra info. Display the plan for the user to review and confirm before the interview starts.

**Acceptance criteria:**
- AI called automatically on page load with CV text + JD text + extra info
- Loading skeleton shown while AI generates the plan (typically 3–5 seconds)
- Plan rendered as a list of round cards, each showing: round type (HR / Technical / Culture Fit), title, estimated duration, number of questions, focus areas
- User can remove individual rounds by clicking a remove icon on each card
- "Regenerate Plan" button re-calls the AI and replaces the current plan
- "Confirm & Start Round 1" button saves the confirmed plan to DB, updates session status to `active`, and navigates to the interview chat UI
- Error state with retry button shown if the AI call fails

---

## Task 7: AI — Generate Interview Plan

Call AI (GPT-4o-mini) with CV + JD + extra context to generate a structured interview plan: list of rounds, each with type, estimated duration, number of questions, and focus areas.

**Acceptance criteria:**
- AI returns structured JSON: `{ rounds: [{ type, title, duration_min, question_count, focus_areas[] }] }`
- Plan rendered clearly on screen for user to review
- User can remove or reorder rounds before confirming
- Plan saved to session record on confirmation
- Error state shown if AI call fails, with retry option

---

## Task 8: Interview Chat UI

Build the interview interface: chat-style layout showing interviewer messages (questions, feedback) and candidate input (text area for answers), with a progress indicator showing the current question number.

**Acceptance criteria:**
- Interviewer messages styled differently from candidate messages
- Current question number and total displayed (e.g. "Question 3 of 8")
- Text area for answer input with submit button and character count
- Submit disabled when input is empty
- Previous messages scrollable; current question always visible
- Loading state shown while AI is processing

---

## Task 9: AI — Generate Interview Question

For each question slot in a round, call AI to generate a relevant question based on JD, CV, round type, and previously asked questions (to avoid repetition).

**Acceptance criteria:**
- Question is relevant to the round type (HR / Technical / Culture Fit)
- Question references specific details from JD or CV where appropriate
- No duplicate questions within the same session
- Question displayed in chat UI within 3 seconds
- AI prompt includes round focus areas and prior questions as context

---

## Task 10: Candidate Answer Submission

Capture the candidate's typed answer, validate it is not empty, and submit it to trigger the evaluation pipeline.

**Acceptance criteria:**
- Answer must be at least 20 characters; short answers show a warning
- Answer saved to `messages` table with role `candidate` before AI evaluation starts
- Loading/evaluating state shown immediately after submission
- User cannot edit a submitted answer

---

## Task 11: AI — Evaluate Candidate Answer

Call AI to evaluate the candidate's answer against the question, JD requirements, and round type. Return structured feedback: score (1–10), strengths, weaknesses, English quality note.

**Acceptance criteria:**
- AI returns structured JSON: `{ score: 7, strengths: [], weaknesses: [], english_feedback: "", missing_points: [] }`
- Evaluation saved to `evaluations` table linked to the message
- Score displayed visually (e.g. color-coded badge)
- Strengths and weaknesses shown as bullet points
- English quality note shown if candidate's English level is beginner/intermediate
- Evaluation displayed within 5 seconds of answer submission

---

## Task 12: AI — Generate Best Practice Answer

After evaluating the candidate's answer, call AI to generate a model best-practice answer for the same question, tailored to the JD and role.

**Acceptance criteria:**
- Best answer is generated after evaluation, not before (so it does not bias the candidate)
- Best answer saved to `evaluations` table
- Displayed in a collapsible/expandable section below the evaluation
- Clearly labeled "Suggested Best Answer" to distinguish from the candidate's answer
- User can click "Save to Library" to store this answer

---

## Task 13: Save Answer to Personal Library

Allow the user to save any suggested best answer (and their own answer) to a personal answer library for future reference and practice.

**Acceptance criteria:**
- "Save" button on each suggested answer
- Saved answer stored in `saved_answers` table with question text, candidate answer, best answer, and tags (round type, topic)
- Confirmation toast shown on save
- Duplicate saves for the same question prevented; "Already saved" state shown

---

## Task 14: Round Navigation & Completion

After each question/answer/evaluation cycle, show a "Next Question" button. After the last question, show a "Finish Round" button to trigger round evaluation.

**Acceptance criteria:**
- "Next Question" triggers the next AI question generation
- Progress bar updates after each question
- "Finish Round" only appears on the last question
- Round marked as `completed` in DB when finished
- User cannot go back to previous questions mid-round

---

## Task 15: AI — Round Verdict & Evaluation

After all questions in a round are complete, call AI with the full Q&A transcript to generate a round verdict: pass/needs practice, overall score, key strengths, areas to improve, and specific action items.

**Acceptance criteria:**
- AI returns: `{ verdict: "pass|practice", overall_score: 7.5, strengths: [], improvements: [], action_items: [], english_score: 6 }`
- Verdict displayed with clear visual treatment (green = pass / yellow = needs practice)
- Overall score shown as a number and descriptive label (e.g. "Good — Ready with minor improvements")
- Action items shown as a numbered list
- Result saved to `session_results` table

---

## Task 16: Round Result Screen

Display the round evaluation result on a dedicated screen with all feedback sections, and an option to proceed to the next round or end the session.

**Acceptance criteria:**
- Shows: verdict badge, overall score, strengths list, improvement list, action items, English score
- "Start Next Round" button if more rounds remain
- "End Session" button to close session and return to dashboard
- User can download/print round summary (PDF export, optional)

---

## Task 17: Multi-Round Flow

After completing Round 1, the user can start Round 2, then Round 3 sequentially. Each round is independent with its own questions and verdict.

**Acceptance criteria:**
- Round 2 starts only after Round 1 is marked complete
- Round 2 AI context includes Round 1 performance summary so AI can adapt difficulty
- Each round has its own chat thread and result screen
- Session progress visible at all times: "Round 1 ✓ → Round 2 (current) → Round 3 (locked)"

---

## Task 18: Session Review & History

User can open any past session to review all questions, their answers, AI evaluations, best answers, and round verdicts.

**Acceptance criteria:**
- Full Q&A transcript displayed per round
- Each answer shows: candidate answer, AI evaluation score/feedback, best answer
- Round verdict shown at the end of each round section
- Saved answers highlighted
- Read-only — no editing of past sessions

---

## Task 19: Personal Answer Library

Dedicated page showing all answers the user has saved, searchable and filterable by round type and topic.

**Acceptance criteria:**
- List of saved answers with: question, candidate answer, best answer, tags
- Search by keyword works across question and answer text
- Filter by round type: HR / Technical / Culture Fit
- Delete saved answer option with confirmation
- Empty state with prompt to complete an interview session

---

## Task 20: AI Prompt Engineering — System Prompts

Write and version-control all AI system prompts for: plan generation, question generation, answer evaluation, best answer generation, round verdict, and English evaluation.

**Acceptance criteria:**
- All prompts stored in `/prompts` directory as TypeScript constants
- Each prompt includes role definition, output format (JSON schema), evaluation rubric, and constraints
- Prompts handle edge cases: very short answers, off-topic answers, non-English answers
- Prompts tested manually with at least 5 sample inputs each
- JSON output from AI validated with Zod schema before use

---

## Task 21: Error Handling & Retry Logic

Handle AI API failures, network timeouts, and invalid JSON responses gracefully throughout the app.

**Acceptance criteria:**
- All AI calls wrapped in try/catch with retry (max 2 retries with exponential backoff)
- User-facing error messages are friendly, not technical
- Failed AI calls logged with context for debugging
- If AI returns malformed JSON, fallback to re-prompt or show manual retry button
- App never crashes or shows a blank screen due to AI failure

---

## Task 22: Rate Limiting & Cost Control

Implement per-user rate limits on AI calls to prevent abuse and control costs.

**Acceptance criteria:**
- Max 3 new sessions created per user per day
- Max 10 questions per round (hard cap enforced server-side)
- API route validates limits before calling AI; returns 429 with a clear message if exceeded
- Limits stored and checked in Supabase

---

## Task 23: Responsive UI & Mobile Support

Ensure all screens work correctly on mobile (375px+), tablet, and desktop.

**Acceptance criteria:**
- Interview chat UI usable on mobile: text area full width, messages readable
- Dashboard session cards stack correctly on small screens
- File upload works on mobile browsers
- No horizontal scroll on any screen at 375px width
- Tested on Chrome mobile and Safari iOS

---

## Task 24: Loading States & Skeleton UI

Add loading skeletons and spinners for all async operations: AI responses, data fetching, file upload, and authentication.

**Acceptance criteria:**
- Every AI call shows a loading indicator with contextual label (e.g. "Evaluating your answer...")
- Dashboard shows skeleton cards while sessions load
- File upload shows a progress indicator
- No layout shift when content loads

---

## Task 25: Environment Configuration & Deployment

Configure production environment variables, deploy to Vercel, connect Supabase production project.

**Acceptance criteria:**
- App deployed to Vercel
- Production Supabase project separate from local dev
- All environment variables set in Vercel dashboard
- `npm run build` passes with zero errors

---

## Task 26: Basic Analytics & Usage Tracking

Track key events: session created, round started, round completed, answer saved, pass/fail verdict.

**Acceptance criteria:**
- Events logged to Supabase `events` table with `user_id`, `event_type`, `metadata`, `timestamp`
- No third-party analytics added for MVP
- Queryable data: total sessions, average score per round type, most common improvement areas

---

## Summary

| # | Task | Category | Priority |
|---|---|---|---|
| 1 | Project Setup | Infrastructure | Week 1 |
| 2 | Database Schema | Infrastructure | Week 1 |
| 3 | Phone Number Login | Auth | Week 1 |
| 4 | Dashboard — Session List | UI | Week 1 |
| 5 | Create Session — Document Upload | UI + Storage | Week 1 |
| 6 | Interview Plan Review | UI + AI | Week 2 |
| 7 | AI — Generate Interview Plan | AI | Week 2 |
| 8 | Interview Chat UI | UI | Week 2 |
| 9 | AI — Generate Question | AI | Week 2 |
| 10 | Candidate Answer Submission | UI + DB | Week 2 |
| 11 | AI — Evaluate Answer | AI | Week 2 |
| 12 | AI — Generate Best Answer | AI | Week 2 |
| 13 | Save Answer to Library | Feature | Week 3 |
| 14 | Round Navigation & Completion | UI + DB | Week 3 |
| 15 | AI — Round Verdict | AI | Week 3 |
| 16 | Round Result Screen | UI | Week 3 |
| 17 | Multi-Round Flow | Feature | Week 3 |
| 18 | Session Review & History | Feature | Week 4 |
| 19 | Personal Answer Library | Feature | Week 4 |
| 20 | AI Prompt Engineering | AI | Week 2–3 |
| 21 | Error Handling & Retry | Quality | Week 4 |
| 22 | Rate Limiting & Cost Control | Quality | Week 4 |
| 23 | Responsive UI | Quality | Week 4 |
| 24 | Loading States & Skeleton UI | Quality | Week 4 |
| 25 | Deployment | Infrastructure | Week 4 |
| 26 | Basic Analytics | Observability | Post-MVP |
