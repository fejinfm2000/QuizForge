# QuizForge

An Angular 17 quiz platform where admins, invigilators, and candidates collaborate on Excel-defined quizzes stored in GitHub.

---

## Features

- Admin and invigilator dashboard access with role-based permissions
- Email-based attendee login and candidate flow
- Download and upload quiz definitions via Excel
- GitHub persistence for quiz definitions and attendee submissions
- Activity logging and usage statistics
- Theme toggle persisted in browser session storage
- Responsive UI for desktop and small-screen devices
- No automatic countdown timer; quizzes are completed at the user’s pace
- Result review with score, answer feedback, and attendance export

---

## Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── dashboard/      # Admin and invigilator dashboard
│   │   ├── login/          # Email login and role flow
│   │   ├── quiz/           # Quiz taking and submission
│   │   └── results/        # Score review and answer breakdown
│   ├── guards/
│   │   └── auth.guard.ts   # Route authorization
│   ├── models/
│   │   └── quiz.models.ts  # Domain models
│   └── services/
│       ├── activity.service.ts  # Activity logging
│       ├── auth.service.ts      # Session auth and user state
│       ├── excel.service.ts     # Excel import/export
│       ├── github.service.ts    # GitHub REST API persistence
│       ├── quiz.service.ts      # Quiz and attendee management
│       └── theme.service.ts     # Theme persistence
└── environments/
    ├── environment.ts.example
    ├── environment.ts
    └── environment.prod.ts
```

---

## GitHub Repository Layout

The app saves quizzes under the configured `basePath` in GitHub.

Example layout:

```
quizzes/
├── my-quiz/
│   ├── quiz.json          # Quiz definition
│   └── attendees.xlsx     # Attendee submissions
```

---

## Setup

### 1. Clone & Install

```bash
git clone <this-repo>
cd quiz-app
npm install
```

### 2. Create a GitHub Personal Access Token

1. Go to <https://github.com/settings/tokens>
2. Generate a token with the `repo` scope
3. Copy the token

### 3. Configure Local Environment

Create `src/environments/environment.ts` from the example:

```bash
copy src\environments\environment.ts.example src\environments\environment.ts
```

Edit the copied file with your GitHub settings:

```ts
export const environment = {
  production: false,
  github: {
    token: 'ghp_YOUR_REAL_TOKEN',
    owner: 'your-github-username',
    repo: 'your-quiz-data-repo',
    branch: 'main',
    basePath: 'quizzes'
  }
};
```

> `src/environments/environment.ts` should remain local and not be committed.

### 4. Run Locally

```bash
npm start
```

Open `http://localhost:4200/` in your browser.

---

## Excel Template Format

The quiz upload template uses these columns:

| Column | Description |
|--------|-------------|
| Question | Quiz question text |
| Option A | Choice A |
| Option B | Choice B |
| Option C | Choice C |
| Option D | Choice D |
| Correct Answer (A/B/C/D) | Correct option letter |
| Marks | Numeric score value |

---

## Usage

- Admins and invigilators upload quizzes using the Excel template.
- Candidates log in with email and take a quiz.
- Submitted results are stored in GitHub per quiz.
- Attendance can be exported from the dashboard.
- Theme preference persists across the browser session.

---

## Testing

Run unit tests once with:

```bash
npm test -- --watch=false
```

---

## Production Build

Build the application with:

```bash
npm run build
```

The build output is generated in `dist/quiz-app`.

---

## Notes

- Configure a GitHub repo for data storage with the settings in `environment.ts`.
- The app uses GitHub as the backend, so no separate server is required.
- For production, inject secrets through environment variables or CI instead of committing tokens.
