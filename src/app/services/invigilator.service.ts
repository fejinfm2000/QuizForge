import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { GithubService } from './github.service';

@Injectable({ providedIn: 'root' })
export class InvigilatorService {
  private readonly PATH = 'invigilators/invigilators.json';
  private invigilators$ = new BehaviorSubject<string[]>([]);

  get list$() { return this.invigilators$.asObservable(); }

  constructor(private github: GithubService) {}

  async list(): Promise<string[]> {
    const file = await this.github.getFile(this.PATH);
    if (!file) {
      this.invigilators$.next([]);
      return [];
    }
    try {
      const arr = JSON.parse(this.github.decodeBase64(file.content));
      const list = Array.isArray(arr) ? arr.map((s: string) => s.toLowerCase().trim()) : [];
      this.invigilators$.next(list);
      return list;
    } catch {
      this.invigilators$.next([]);
      return [];
    }
  }

  async add(email: string): Promise<void> {
    const norm = email.toLowerCase().trim();
    const file = await this.github.getFile(this.PATH);
    let list: string[] = [];
    if (file) {
      try { list = JSON.parse(this.github.decodeBase64(file.content)); } catch { list = []; }
    }
    if (!list.includes(norm)) list.push(norm);
    await this.github.putFile(this.PATH, this.github.encodeBase64(JSON.stringify(list, null, 2)), `Add invigilator: ${norm}`, file?.sha);
    await this.list();
  }

  async remove(email: string): Promise<void> {
    const norm = email.toLowerCase().trim();
    const file = await this.github.getFile(this.PATH);
    if (!file) return;
    let list: string[] = [];
    try { list = JSON.parse(this.github.decodeBase64(file.content)); } catch { list = []; }
    list = list.filter(e => e !== norm);
    await this.github.putFile(this.PATH, this.github.encodeBase64(JSON.stringify(list, null, 2)), `Remove invigilator: ${norm}`, file.sha);
    await this.list();
  }
}
