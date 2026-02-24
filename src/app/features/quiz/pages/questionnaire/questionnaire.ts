import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { QuestionResponse, QuizApiService, QuizPublicResponse, ResultResponse, SubmitQuizRequest } from '../../../../core/api/quiz-api';
import { finalize } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

//type StyleType = 'AGRESIVO' | 'ASERTIVO' | 'PASIVO';

@Component({
  selector: 'app-questionnaire',
  imports: [CommonModule,FormsModule],
  templateUrl: './questionnaire.html',
  styleUrl: './questionnaire.css',
  standalone: true,
})
export class Questionnaire {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(QuizApiService);

   // ---- State ----
  quizId = signal<string>('');
  quiz = signal<QuizPublicResponse | null>(null);

  loading = signal<boolean>(true);
  submitting = signal<boolean>(false);
  error = signal<string | null>(null);

  currentIndex = signal<number>(0);

  // answers: questionId -> optionId
  answers = signal<Record<number, number>>({});

  // ---- derived ----
  questions = computed<QuestionResponse[]>(() => this.quiz()?.questions ?? []);
  total = computed<number>(() => this.questions().length);

  currentQuestion = computed<QuestionResponse | null>(() => {
    const qs = this.questions();
    const idx = this.currentIndex();
    return qs[idx] ?? null;
  });

  progress = computed<number>(() => {
    const total = this.total();
    if (!total) return 0;
    return Math.round(((this.currentIndex() + 1) / total) * 100);
  });

  selectedOptionId(optionId: number) {
    const q = this.currentQuestion();
    if (!q) return 0;
    return this.answers()[q.questionId] ?? 0;
  };

  canGoPrev = computed<boolean>(() => this.currentIndex() > 0);

  canGoNext = computed<boolean>(() => {
    const q = this.currentQuestion();
    if (!q) return false;
    return !!this.answers()[q.questionId];
  });

  isLast = computed<boolean>(() => {
    const total = this.total();
    if (!total) return false;
    return this.currentIndex() === total - 1;
  });

  // ---- Init ----
  constructor() {

   this.route.paramMap.subscribe(params => {
      const slug = params.get('quizSlug')?? '';
      console.log('Quiz Slug:', slug);

      this.quizId.set(slug);
      if (!slug) {
        this.loading.set(false);
        this.error.set('Falta quizId/quizSlug en la URL.');
        return;
      }
        this.loadQuiz(slug);
  });


  }

  private loadQuiz(slug: string) {
    this.loading.set(true);
    this.error.set(null);

    this.api
      .getPublicQuiz(slug)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
         next: (data: QuizPublicResponse) => {
        // Orden defensivo:
        const sorted = {
          ...data,
          questions: [...data.questions]
            .sort((a, b) => a.order - b.order)
            .map(q => ({
              ...q,
              options: [...q.options].sort((a, b) => a.order - b.order),
            })),
        };
         console.log('QUIZ cargado:', sorted);

        this.quiz.set(sorted);
        this.currentIndex.set(0);
        this.answers.set({});
      },
        error: (e: Error) => {
          this.error.set(e.message || 'Error al cargar el cuestionario.');
        },
      });
  }

  // ---- UI actions ----
  selectOption(optionId: number) {
    const q = this.currentQuestion();
    if (!q) return;

    this.answers.update(prev => ({
      ...prev,
      [q.questionId]: optionId,
    }));

  }

  prev() {
    if (!this.canGoPrev()) return;
    this.currentIndex.set(this.currentIndex() - 1);
  }

  next() {
    if (!this.canGoNext()) return;
    if (this.isLast()) return; // en última, usa submit()
    this.currentIndex.set(this.currentIndex() + 1);
  }

  submit() {
    const quiz = this.quiz();
    if (!quiz) return;

    // Validación final: todo respondido
    const answersMap = this.answers();
    const allAnswered = quiz.questions.every((q) => !!answersMap[q.questionId]);
    if (!allAnswered) {
      this.error.set('Responde todas las preguntas antes de finalizar.');
      return;
    }

    const payload: SubmitQuizRequest = {
      //quizSlug: quiz.quizSlug,
      answers: quiz.questions.map((q) => ({
        questionId: q.questionId,
        optionId: answersMap[q.questionId],
      })),
    };

    this.submitting.set(true);
    this.error.set(null);

    this.api
      .submitQuiz(quiz.quizSlug, payload)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (result: ResultResponse) => {
          // Pasamos resultado por navigation state (rápido y simple)
          this.router.navigate(['/result'], { state: { result } });
        },
        error: (e: Error) => {
          this.error.set(e.message || 'Error al enviar el cuestionario.');
        },
      });
  }
}
