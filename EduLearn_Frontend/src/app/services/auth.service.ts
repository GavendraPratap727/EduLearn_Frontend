import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'https://edulearn-auth-service-7zc3.onrender.com/api/auth';
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      this.currentUserSubject.next(JSON.parse(storedUser));
    }
  }

  register(email: string, password: string, fullName: string, role: string = 'STUDENT'): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, {
      email,
      password,
      fullName,
      role
    }).pipe(
      tap(response => {
        if (response.success) {
          this.currentUserSubject.next(response.user);
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          localStorage.setItem('token', response.token);
        }
      })
    );
  }

  // Method for admin to create users without changing current logged-in user
  createUser(email: string, password: string, fullName: string, role: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, {
      email,
      password,
      fullName,
      role
    }).pipe(
      tap(response => {
        // Ensure we don't accidentally update the current user when creating a new user
        // This is a safeguard to prevent the admin's role from being changed
        const currentUser = this.currentUserSubject.value;
        if (currentUser && response.user && response.user.email !== currentUser.email) {
          // If the created user is different from current user, refresh current user from localStorage
          const storedUser = localStorage.getItem('currentUser');
          if (storedUser) {
            this.currentUserSubject.next(JSON.parse(storedUser));
          }
        }
      })
    );
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap(response => {
        if (response.success) {
          this.currentUserSubject.next(response.user);
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          localStorage.setItem('token', response.token);
        }
      })
    );
  }

  logout(): Observable<any> {
    const userId = this.currentUserSubject.value?.id;
    return this.http.post<any>(`https://edulearn-auth-service-7zc3.onrender.com/api/users/logout`, userId).pipe(
      tap(() => {
        this.currentUserSubject.next(null);
        localStorage.removeItem('currentUser');
        localStorage.removeItem('token');
      }),
      catchError(() => {
        this.currentUserSubject.next(null);
        localStorage.removeItem('currentUser');
        localStorage.removeItem('token');
        return of({ success: true });
      })
    );
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  getCurrentUser(): any {
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Admin methods
  // Note: Backend doesn't have these specific admin endpoints, using available ones
  getRecentUsers(limit: number = 50): Observable<any> {
    return this.http.get(`https://edulearn-auth-service-7zc3.onrender.com/api/users/recent/${limit}`, {
      headers: this.getAuthHeaders()
    });
  }

  toggleUserStatus(userId: string, isActive: boolean): Observable<any> {
    return this.http.put(`https://edulearn-auth-service-7zc3.onrender.com/api/users/${userId}/status`, { isActive }, {
      headers: this.getAuthHeaders()
    });
  }

  deleteUser(userId: string): Observable<any> {
    return this.http.delete(`https://edulearn-auth-service-7zc3.onrender.com/api/users/${userId}`, {
      headers: this.getAuthHeaders()
    });
  }

  getUserById(userId: string): Observable<any> {
    return this.http.get(`https://edulearn-auth-service-7zc3.onrender.com/api/users/${userId}`, {
      headers: this.getAuthHeaders()
    });
  }

  getUserStats(): Observable<any> {
    // Note: Backend doesn't have user stats endpoint, return mock data
    return of({
      totalUsers: 0
    });
  }
}
