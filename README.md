# QuizForge
<<<<<<< HEAD
Dynamic Quiz Market
=======

An Angular 17 quiz platform where admins upload Excel-based quizzes and attendees complete them in-browser. All data (quiz definitions + attendee results) is stored directly in a GitHub repository via the GitHub API.

---

## Features

| # | Feature |
|---|---------|
| 1 | Email-based login — email is the primary key for every attendee |
| 2 | Download a blank Excel template with sample questions |
| 3 | Upload a filled Excel → instantly generates a quiz page |
| 4 | Timed quiz with a question map and per-question navigation |
| 5 | Results page with grade, score breakdown and answer review |
| 6 | Results saved to GitHub as an `attendees.xlsx` per quiz |
| 7 | Admin can download full attendees list (score, grade, all details) |
| 8 | Each quiz has its own isolated attendees file in GitHub |

---

## Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── login/          # Email + Name login
│   │   ├── dashboard/      # Attend & Manage tabs
│   │   ├── quiz/           # Timed quiz UI
│   │   └── results/        # Score + answer review
│   ├── services/
│   │   ├── auth.service.ts     # Session-based auth
│   │   ├── github.service.ts   # GitHub REST API wrapper
│   │   ├── quiz.service.ts     # Quiz CRUD via GitHub
│   │   └── excel.service.ts    # xlsx parse / generate
│   ├── guards/
│   │   └── auth.guard.ts
│   ├── models/
│   │   └── quiz.models.ts
│   └── pipes/
│       └── total-marks.pipe.ts
└── environments/
    ├── environment.ts.example   ← copy to environment.ts and configure
    ├── environment.ts           ← .gitignored — your real secrets go here
    └── environment.prod.ts
```

---

## GitHub Repository Layout

After the first quiz upload, the target repo will look like:

```
quizzes/
└── javascript-fundamentals/
    ├── quiz.json          ← Question definitions
    └── attendees.xlsx     ← Attendee results (appended per attempt)
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
2. Click **Generate new token (classic)**
3. Select scope: **`repo`** (full control of private repositories)
4. Copy the token

### 3. Configure Environment

```bash
cp src/environments/environment.ts.example src/environments/environment.ts
```

Edit `src/environments/environment.ts`:

```ts
export const environment = {
  production: false,
  github: {
    token: 'ghp_YOUR_REAL_TOKEN',
    owner: 'your-github-username',
    repo:  'your-quiz-data-repo',   // must already exist
    branch: 'main',
    basePath: 'quizzes'
  }
};
```

> **Security:** `environment.ts` is `.gitignore`d. Never commit your token.

### 4. Create the GitHub Repo for Data

Create an empty repo on GitHub (e.g. `quiz-data`). It can be private. No files needed — the app initialises the folder structure on first upload.

### 5. Run

```bash
npm start
# → http://localhost:4200
```

---

## Excel Template Format

Download the template from the Dashboard → **Manage Quizzes** → **Download Template**.

| Column | Description |
|--------|-------------|
| Question | Full question text |
| Option A | Choice A |
| Option B | Choice B |
| Option C | Choice C |
| Option D | Choice D |
| Correct Answer (A/B/C/D) | Single letter |
| Marks | Integer (e.g. 1, 2, 5) |

---

## Production Deployment

For production, inject secrets at build time via CI/CD rather than committing `environment.prod.ts`.

Example GitHub Actions step:

```yaml
- name: Build
  env:
    GITHUB_TOKEN: ${{ secrets.QUIZ_GITHUB_TOKEN }}
    GITHUB_OWNER: ${{ secrets.QUIZ_GITHUB_OWNER }}
    GITHUB_REPO:  ${{ secrets.QUIZ_GITHUB_REPO }}
  run: npm run build -- --configuration production
```

Then update `environment.prod.ts` to read from `window.__ENV__` which you populate from a server-rendered `<script>` block.

---

## Tech Stack

- **Angular 17** (standalone components, signals-ready)
- **xlsx** — Excel parsing & generation
- **GitHub REST API v3** — storage backend (no server required)
- **DM Sans + Playfair Display** — typography
>>>>>>> 4b09c27 (Initial commit: QuizForge application with improved GitHub error handling)
