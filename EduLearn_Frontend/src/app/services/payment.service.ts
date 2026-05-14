import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = 'https://edulearn-payment-service-3v8x.onrender.com/api/payments';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    return this.authService.getAuthHeaders();
  }

  createPaymentOrder(courseId: string, amount: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/create-order`, {
      courseId,
      amount
    }, { headers: this.getHeaders() });
  }

  verifyPayment(razorpayPaymentId: string, razorpayOrderId: string, razorpaySignature: string, paymentId: string = ''): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify`, {
      paymentId,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature
    }, { headers: this.getHeaders() });
  }

  getPaymentHistory(userId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/history/${userId}`, {
      headers: this.getHeaders()
    });
  }
}
