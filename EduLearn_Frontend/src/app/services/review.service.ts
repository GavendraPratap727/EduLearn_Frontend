import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  private apiUrl = 'https://edulearn-review-service-xtnq.onrender.com/api/reviews';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    return this.authService.getAuthHeaders();
  }

  addReview(reviewData: { courseId: string, rating: number, comment?: string }): Observable<any> {
    return this.http.post(this.apiUrl, reviewData, { headers: this.getHeaders() });
  }

  getApprovedReviews(courseId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/course/${courseId}/approved`, { headers: this.getHeaders() });
  }

  hasStudentReviewed(studentId: string, courseId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/hasReviewed/${studentId}/${courseId}`, { headers: this.getHeaders() });
  }

  getAverageRating(courseId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/average/${courseId}`, { headers: this.getHeaders() });
  }
}
