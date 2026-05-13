import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ProgressService {
  private apiUrl = 'https://edulearn-progress-service-rq1l.onrender.com/api/progress';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    return this.authService.getAuthHeaders();
  }

  getUserProgress(userId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/student/${userId}`, {
      headers: this.getHeaders()
    });
  }

  getCourseProgress(userId: string, courseId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/course/${courseId}/student/${userId}`, {
      headers: this.getHeaders()
    });
  }

  createProgress(progressData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}`, progressData, {
      headers: this.getHeaders()
    });
  }

  updateProgress(progressId: string, progressData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${progressId}`, progressData, {
      headers: this.getHeaders()
    });
  }

  markLessonComplete(progressId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${progressId}/complete`, {}, {
      headers: this.getHeaders()
    });
  }

  markLessonCompleteByLessonId(lessonId: string, courseId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/lesson/${lessonId}/complete?courseId=${courseId}`, {}, {
      headers: this.getHeaders()
    });
  }

  issueCertificate(userId: string, courseId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/certificates/issue`, { studentId: userId, courseId: courseId }, {
      headers: this.getHeaders()
    });
  }

  getUserCertificates(userId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/certificates/student/${userId}`, {
      headers: this.getHeaders()
    });
  }

  verifyCertificate(certificateId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/certificates/verify/${certificateId}`, {
      headers: this.getHeaders()
    });
  }
}
