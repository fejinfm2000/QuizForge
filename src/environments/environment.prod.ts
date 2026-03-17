// Production environment configuration
// Values here should be injected at build time via CI/CD environment variables.
// Example (Angular builder env substitution or a build script):
//   GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO
export const environment = {
  production: true,

  github: {
    token: (window as any).__ENV__?.GITHUB_TOKEN || '',
    owner: (window as any).__ENV__?.GITHUB_OWNER || '',
    repo: (window as any).__ENV__?.GITHUB_REPO || '',
    branch: 'main',
    basePath: 'quizzes',
    admins: ['fejinfm2000@gmail.com']
  }
};
