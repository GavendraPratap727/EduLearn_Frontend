import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class QuizService {
  private apiUrl = 'https://edulearn-quiz-service.onrender.com/api/quizzes';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Quiz CRUD operations
  createQuiz(quizData: any): Observable<any> {
    return this.http.post(this.apiUrl, quizData, { headers: this.getHeaders() });
  }

  getQuizById(quizId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${quizId}`, { headers: this.getHeaders() });
  }

  getQuizzesByCourse(courseId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/course/${courseId}`, { headers: this.getHeaders() });
  }

  getQuizByLesson(lessonId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/lesson/${lessonId}`, { headers: this.getHeaders() });
  }

  updateQuiz(quizId: string, quizData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${quizId}`, quizData, { headers: this.getHeaders() });
  }

  deleteQuiz(quizId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${quizId}`, { headers: this.getHeaders() });
  }

  publishQuiz(quizId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${quizId}/publish`, {}, { headers: this.getHeaders() });
  }

  // Quiz attempt operations
  startAttempt(quizId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/attempt/start`, { quizId }, { headers: this.getHeaders() });
  }

  submitAttempt(attemptId: string, answers: { [key: number]: number }): Observable<any> {
    return this.http.put(`${this.apiUrl}/attempt/${attemptId}/submit`, { answers }, { headers: this.getHeaders() });
  }

  getAttemptsByStudent(studentId: string, quizId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/attempts/${studentId}/${quizId}`, { headers: this.getHeaders() });
  }

  getBestAttempt(studentId: string, quizId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/best-attempt/${studentId}/${quizId}`, { headers: this.getHeaders() });
  }

  getAttemptCount(studentId: string, quizId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/attempt-count/${studentId}/${quizId}`, { headers: this.getHeaders() });
  }
}
