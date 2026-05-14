import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class EnrollmentService {
  private apiUrl = 'https://edulearn-enrollment-service-cxok.onrender.com/api/enrollments';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    return this.authService.getAuthHeaders();
  }

  enrollInCourse(courseId: string): Observable<any> {
    const userId = this.authService.getCurrentUser()?.id;
    return this.http.post(`${this.apiUrl}`, { courseId, studentId: userId }, { headers: this.getHeaders() });
  }

  getUserEnrollments(userId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/student/${userId}`, { headers: this.getHeaders() });
  }

  getCourseEnrollments(courseId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/course/${courseId}`, { headers: this.getHeaders() });
  }

  cancelEnrollment(enrollmentId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${enrollmentId}/drop`, {}, { headers: this.getHeaders() });
  }

  // Instructor methods
  getInstructorEnrollments(instructorId: string): Observable<any> {
    // Note: Backend doesn't have instructor enrollments endpoint, return empty for now
    return of({ enrollments: [] });
  }
}
