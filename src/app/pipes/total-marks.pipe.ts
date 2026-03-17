import { Pipe, PipeTransform } from '@angular/core';
import { QuizQuestion } from '../models/quiz.models';

@Pipe({ name: 'totalMarks', standalone: true })
export class TotalMarksPipe implements PipeTransform {
  transform(questions: QuizQuestion[]): number {
    return questions.reduce((sum, q) => sum + (q.marks || 1), 0);
  }
}
