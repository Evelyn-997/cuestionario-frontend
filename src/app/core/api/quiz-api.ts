import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../enviroment/enviroment';
import { Observable } from 'rxjs';

export interface QuizPublicResponse {
  quizSlug: string;
  title: string;
  description?: string;
  totalQuestions: number;
  questions: QuestionResponse[];
}

export interface QuestionResponse {
  questionId: number;
  text: string;
  order: number;
  options: OptionResponse[];
}

export interface OptionResponse {
  optionId: number;
  text: string;
  order: number;
}

export interface SubmitQuizRequest {
  //quizSlug: string;
  answers: {
    questionId: number;
    optionId: number }[];
}

export type StyleKey = 'AGRESIVO' | 'ASERTIVO' | 'PASIVO';

export interface ResultResponse {
  infoBlocks: any;
 // quizSlug: string;
  submissionId: number;
  percentages: Record<StyleKey, number>;
  dominantStyle: StyleKey;
  summary?: string;
  extraInfo?: Partial<Record<StyleKey, string>>;
}

@Injectable({
  providedIn: 'root',
})
export class QuizApiService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiBaseUrl;

   getPublicQuiz(quizSlug: string): Observable<QuizPublicResponse> {
    return this.http.get<QuizPublicResponse>(`${this.baseUrl}/api/public/quizzes/${quizSlug}`);
  }

  submitQuiz(quizSlug: string, payload: SubmitQuizRequest): Observable<ResultResponse> {
    return this.http.post<ResultResponse>(`${this.baseUrl}/api/public/quizzes/${quizSlug}/submissions`, payload);
  }

}
