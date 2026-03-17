import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { GitHubFileContent, GitHubPutPayload } from '../models/quiz.models';

@Injectable({ providedIn: 'root' })
export class GithubService {
  private readonly API = 'https://api.github.com';
  private readonly cfg = environment.github;

  constructor(private http: HttpClient) {}

  private get headers(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.cfg.token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28'
    });
  }

  private repoUrl(path: string): string {
    return `${this.API}/repos/${this.cfg.owner}/${this.cfg.repo}/contents/${path}`;
  }

  /** Fetch file content + sha (returns null if not found) */
  async getFile(path: string): Promise<GitHubFileContent | null> {
    try {
      const res = await firstValueFrom(
        this.http.get<GitHubFileContent>(this.repoUrl(path), { headers: this.headers })
      );
      return res;
    } catch (err: any) {
      if (err?.status === 404) return null;
      this.handleError(err);
    }
  }

  /** Create or update a file. Provide sha for updates. */
  async putFile(path: string, contentBase64: string, message: string, sha?: string): Promise<void> {
    const payload: GitHubPutPayload = {
      message,
      content: contentBase64,
      branch: this.cfg.branch,
      ...(sha ? { sha } : {})
    };
    try {
      await firstValueFrom(
        this.http.put(this.repoUrl(path), payload, { headers: this.headers })
      );
    } catch (err: any) {
      if (err?.status === 409) {
        throw new Error('Conflict detected: The file was modified by someone else. Please refresh and try again.');
      }
      this.handleError(err);
    }
  }

  /** Delete a file. Requires sha. */
  async deleteFile(path: string, sha: string, message: string): Promise<void> {
    const options = {
      headers: this.headers,
      body: {
        message,
        sha,
        branch: this.cfg.branch
      }
    };
    try {
      await firstValueFrom(
        this.http.delete(this.repoUrl(path), options)
      );
    } catch (err: any) {
      if (err?.status === 409) {
        throw new Error('Conflict detected: The file was modified by someone else. Please refresh and try again.');
      }
      this.handleError(err);
    }
  }

  /** List files in a directory */
  async listDir(dirPath: string): Promise<{ name: string; path: string; type: string }[]> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ name: string; path: string; type: string }[]>(
          this.repoUrl(dirPath), { headers: this.headers }
        )
      );
      return res;
    } catch (err: any) {
      if (err?.status === 404) return [];
      this.handleError(err);
    }
  }

  private handleError(err: any): never {
    if (err?.status === 401) {
      throw new Error('Unauthorized: Your GitHub token is invalid or has expired. Please update it in environment.ts.');
    }
    if (err?.status === 403) {
      throw new Error('Forbidden: Your token may have expired or lacks the necessary "repo" scope.');
    }
    throw err;
  }

  /** Helper: encode string to base64 */
  encodeBase64(str: string): string {
    return btoa(unescape(encodeURIComponent(str)));
  }

  /** Helper: decode base64 to string */
  decodeBase64(b64: string): string {
    return decodeURIComponent(escape(atob(b64.replace(/\n/g, ''))));
  }

  /** Helper: encode binary (Uint8Array) to base64 */
  encodeBinaryBase64(bytes: Uint8Array): string {
    let binary = '';
    bytes.forEach(b => (binary += String.fromCharCode(b)));
    return btoa(binary);
  }

  /** Helper: decode base64 to Uint8Array */
  decodeBinaryBase64(b64: string): Uint8Array {
    const binary = atob(b64.replace(/\n/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
}
