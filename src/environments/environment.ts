// Development environment configuration
// IMPORTANT: Never commit real tokens to source control.
// Store secrets in CI/CD secrets or a secrets manager in production.
export const environment = {
  production: false,

  github: {
    token: (window as any).__ENV__?.GITHUB_TOKEN || '',
    owner: (window as any).__ENV__?.GITHUB_OWNER || 'fejinfm2000',
    repo: (window as any).__ENV__?.GITHUB_REPO || 'QuizForge',
    branch: 'main',
    basePath: 'quizzes',
    admins: ['admin@example.com', 'fejinfm2000@gmail.com']
  }
};
