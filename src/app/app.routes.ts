import { Routes } from '@angular/router';
import { Questionnaire } from './features/quiz/pages/questionnaire/questionnaire';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'quiz/estilos-comunicacion',
    pathMatch: 'full'
  },
  {
    path: '*',
    redirectTo: 'quiz/estilos-comunicacion',
  },
  {
    path: 'quiz/:quizSlug',
    component:  Questionnaire
  },
  {
    path: 'result',
    loadComponent: () => import('./features/quiz/pages/result/result').then(m => m.Result)
  },

];

