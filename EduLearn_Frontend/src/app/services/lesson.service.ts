import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class LessonService {
  private apiUrl = 'https://edulearn-lesson-service-aik3.onrender.com/api/lessons';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    return this.authService.getAuthHeaders();
  }

  getLessonsByCourse(courseId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/course/${courseId}`);
  }

  getLessonById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  createLesson(lesson: any): Observable<any> {
    return this.http.post(`${this.apiUrl}`, lesson, { headers: this.getHeaders() });
  }

  updateLesson(id: string, lesson: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, lesson, { headers: this.getHeaders() });
  }

  deleteLesson(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  markLessonComplete(lessonId: string, enrollmentId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${lessonId}/complete`, { enrollmentId }, { headers: this.getHeaders() });
  }
}
