import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  private apiUrl = 'http://localhost:5001/api/courses';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    return this.authService.getAuthHeaders();
  }

  getAllCourses(): Observable<any> {
    return this.http.get(`${this.apiUrl}`, { headers: this.getHeaders() });
  }

  getCourseById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  getCoursesByCategory(category: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/category/${category}`, { headers: this.getHeaders() });
  }

  searchCourses(keyword: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/search?keyword=${keyword}`, { headers: this.getHeaders() });
  }

  // Note: Backend doesn't have top-rated endpoint, using published courses
  getTopRatedCourses(limit: number = 10): Observable<any> {
    return this.http.get(`${this.apiUrl}/published`, { headers: this.getHeaders() });
  }

  createCourse(course: any): Observable<any> {
    return this.http.post(`${this.apiUrl}`, course, { headers: this.getHeaders() });
  }

  updateCourse(id: string, course: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, course, { headers: this.getHeaders() });
  }

  deleteCourse(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  publishCourse(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/publish`, {}, { headers: this.getHeaders() });
  }

  finishCourse(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/finish`, {}, { headers: this.getHeaders() });
  }

  // Instructor methods
  getInstructorCourses(instructorId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/instructor/${instructorId}`, {
      headers: this.getHeaders()
    });
  }

  // Admin methods
  // Note: Backend doesn't have these specific admin endpoints, using available ones
  getRecentCourses(limit: number = 5): Observable<any> {
    return this.http.get(`${this.apiUrl}/published`, {
      headers: this.getHeaders()
    });
  }

  getPendingCourses(): Observable<any> {
    return this.http.get(`${this.apiUrl}/pending`, {
      headers: this.getHeaders()
    });
  }

  approveCourse(courseId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${courseId}/approve`, {}, {
      headers: this.getHeaders()
    });
  }

  rejectCourse(courseId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${courseId}/reject`, {}, {
      headers: this.getHeaders()
    });
  }

  getPlatformStats(): Observable<any> {
    // Note: Backend doesn't have stats endpoint, return mock data
    return of({
      totalCourses: 0,
      totalEnrollments: 0,
      totalRevenue: 0,
      activeUsers: 0
    });
  }
}
