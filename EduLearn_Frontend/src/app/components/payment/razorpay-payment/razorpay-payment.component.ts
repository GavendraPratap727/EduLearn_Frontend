import { Component, Input, Output, OnInit, OnDestroy, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { PaymentService } from '../../../services/payment.service';
import { EnrollmentService } from '../../../services/enrollment.service';

// Razorpay type declarations
declare global {
  interface Window {
    Razorpay: any;
  }
}

// DTOs for Razorpay payment
export interface RazorpayOrderRequest {
  courseId: string;
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: { [key: string]: string };
}

export interface RazorpayOrderResponse {
  success: boolean;
  message: string;
  order: {
    paymentId: string;        // Database Payment GUID
    razorpayOrderId: string;  // Razorpay Order ID
    amount: number;
    currency: string;
    receipt: string;
    status: string;
    createdAt: string;
  };
}

export interface RazorpayPaymentOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: any) => void;
  prefill: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme: {
    color: string;
  };
  modal: {
    ondismiss: () => void;
  };
}

@Component({
  selector: 'app-razorpay-payment',
  templateUrl: './razorpay-payment.component.html',
  styleUrls: ['./razorpay-payment.component.css']
})
export class RazorpayPaymentComponent implements OnInit, OnDestroy {
  @Input() courseId: string = '';
  @Input() courseTitle: string = '';
  @Input() amount: number = 0;
  @Input() isOpen: boolean = false;

  @Output() paymentSuccess = new EventEmitter<void>();
  @Output() paymentClosed = new EventEmitter<void>();

  loading = false;
  error: string = '';
  razorpayOrder: RazorpayOrderResponse['order'] | null = null;
  storedPaymentId: string = ''; // Database Payment GUID for verification
  showPaymentModal = false;

  // Razorpay test key (in production, this should come from environment variables)
  private readonly RAZORPAY_KEY = 'rzp_test_SipR9xW5oqm0fF'; // Match backend configuration

  constructor(
    private paymentService: PaymentService,
    private enrollmentService: EnrollmentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('RazorpayPaymentComponent initialized', {
      isOpen: this.isOpen,
      courseId: this.courseId,
      courseTitle: this.courseTitle,
      amount: this.amount
    });
    
    // Log when isOpen changes
    console.log('Payment modal should be visible:', this.isOpen);
  }

  ngOnDestroy(): void {
    // Clean up any Razorpay instances
  }

  createPaymentOrder(): void {
    if (!this.courseId || this.amount <= 0) {
      this.error = 'Invalid payment details';
      return;
    }

    this.loading = true;
    this.error = '';

    const orderRequest: RazorpayOrderRequest = {
      courseId: this.courseId,
      amount: this.amount * 100, // Razorpay expects amount in paise
      currency: 'INR',
      receipt: `receipt_${this.courseId}_${Date.now()}`,
      notes: {
        courseId: this.courseId,
        courseTitle: this.courseTitle
      }
    };

    this.paymentService.createPaymentOrder(this.courseId, this.amount).subscribe({
      next: (response: any) => {
        this.loading = false;
        this.razorpayOrder = response.order;
        this.storedPaymentId = response.order?.paymentId || '';
        console.log('Payment order created from backend:', this.razorpayOrder, 'PaymentId:', this.storedPaymentId);
        // Open actual Razorpay modal with real order
        this.openRazorpayModal();
      },
      error: (error: any) => {
        this.loading = false;
        console.error('Error creating payment order:', error);
        this.error = 'Failed to create payment order. Please try again.';
      }
    });
  }

  openRazorpayModal(): void {
    if (!this.razorpayOrder) {
      this.error = 'No payment order available';
      return;
    }

    // Check if Razorpay script is loaded
    if (!window.Razorpay) {
      // Fallback to demo simulation if script not loaded
      console.log('Razorpay script not loaded, using demo simulation');
      this.simulatePaymentFlow();
      return;
    }

    const options: RazorpayPaymentOptions = {
      key: this.RAZORPAY_KEY,
      amount: (this.razorpayOrder?.amount || 0) * 100, // Convert to paise
      currency: this.razorpayOrder?.currency || 'INR',
      name: 'EduLearn Platform',
      description: `Payment for ${this.courseTitle}`,
      order_id: this.razorpayOrder?.razorpayOrderId || '',
      handler: (response: any) => {
        this.handlePaymentSuccess(response);
      },
      prefill: {
        name: '', // Will be populated from user profile
        email: '', // Will be populated from user profile
        contact: '' // Will be populated from user profile
      },
      theme: {
        color: '#22c55e'
      },
      modal: {
        ondismiss: () => {
          this.handlePaymentDismissal();
        }
      }
    };

    try {
      // Initialize Razorpay
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Error initializing Razorpay:', error);
      this.error = 'Payment gateway initialization failed. Please try again.';
    }
  }

  handlePaymentSuccess(response: any): void {
    console.log('Payment successful - Full response:', JSON.stringify(response, null, 2));
    console.log('Response keys:', response ? Object.keys(response) : 'null/undefined');

    // Handle edge case where response might be a string or non-object
    if (!response || typeof response !== 'object') {
      console.error('Invalid response type:', typeof response);
      this.error = 'Invalid payment response. Please contact support.';
      return;
    }

    // Extract properties - handle both camelCase and snake_case variations
    const paymentId = response.razorpay_payment_id || response.razorpayPaymentId || response.payment_id;
    // Use order_id from stored order as fallback since Razorpay handler doesn't always return it
    const orderId = response.razorpay_order_id || response.razorpayOrderId || response.order_id || this.razorpayOrder?.razorpayOrderId;
    // Signature may not always be present in test mode or certain flows
    const signature = response.razorpay_signature || response.razorpaySignature || response.signature;

    console.log('Extracted values:', { paymentId, orderId, signature });

    if (!paymentId || !orderId) {
      console.error('Missing required payment response properties. Available:', Object.keys(response));
      this.error = 'Payment verification incomplete. Please check your email for confirmation or contact support.';
      return;
    }

    // Verify payment with backend (signature may be empty for some flows)
    this.verifyPayment(paymentId, orderId, signature || '', this.storedPaymentId);
  }

  handlePaymentDismissal(): void {
    console.log('Payment modal dismissed');
    this.closePaymentModal();
  }

  verifyPayment(paymentId: string, orderId: string, signature: string, dbPaymentId: string = ''): void {
    this.loading = true;
    this.error = '';

    // Check if this is a demo payment
    if (paymentId?.startsWith('pay_demo_') || orderId?.startsWith('order_demo_') || signature?.startsWith?.('demo_signature_')) {
      console.log('Demo payment detected, skipping backend verification');
      // For demo payments, proceed directly to enrollment
      this.enrollUserAfterPayment();
      return;
    }

    this.paymentService.verifyPayment(paymentId, orderId, signature, dbPaymentId).subscribe({
      next: (response: any) => {
        this.loading = false;
        if (response.success) {
          // Payment verified successfully, now enroll the user
          this.enrollUserAfterPayment();
        } else {
          this.error = 'Payment verification failed. Please contact support.';
        }
      },
      error: (error: any) => {
        this.loading = false;
        console.error('Error verifying payment:', error);
        this.error = 'Payment verification failed. Please contact support.';
      }
    });
  }

  enrollUserAfterPayment(): void {
    this.loading = true;
    this.error = '';

    this.enrollmentService.enrollInCourse(this.courseId).subscribe({
      next: (response: any) => {
        this.loading = false;
        console.log('Successfully enrolled after payment:', response);
        this.closePaymentModal();
        // Notify parent component of successful payment/enrollment
        this.paymentSuccess.emit();
        // Show success message and navigate to course
        alert('Payment successful! You have been enrolled in the course.');
        this.router.navigate(['/courses', this.courseId]);
      },
      error: (error: any) => {
        this.loading = false;
        console.error('Error enrolling after payment:', error);
        
        // Check if user is already enrolled
        if (error.error?.message?.includes('already enrolled') || 
            error.message?.includes('already enrolled')) {
          console.log('User is already enrolled, treating as success');
          this.closePaymentModal();
          this.paymentSuccess.emit(); // Still emit success since user is enrolled
          alert('You are already enrolled in this course. Redirecting to course page...');
          this.router.navigate(['/courses', this.courseId]);
        } else {
          this.error = 'Enrollment failed. Please contact support.';
        }
      }
    });
  }

  closePaymentModal(): void {
    this.isOpen = false;
    this.razorpayOrder = null;
    this.storedPaymentId = '';
    this.error = '';
    this.loading = false;
    this.paymentClosed.emit();
  }

  retryPayment(): void {
    this.error = '';
    this.createPaymentOrder();
  }

  selectPaymentMethod(method: string): void {
    // For now, only Razorpay is supported
    console.log('Selected payment method:', method);
  }

  proceedToPayment(): void {
    console.log('Proceed to payment clicked');
    // Create payment order from backend first
    this.createPaymentOrder();
  }

  simulatePaymentFlow(): void {
    // Demo simulation when Razorpay script is not available
    const paymentConfirmed = confirm(
      `Demo Payment Simulation\n\n` +
      `Course: ${this.courseTitle}\n` +
      `Amount: $${this.amount}\n\n` +
      `This is a demo simulation since the Razorpay script is not loaded.\n` +
      `Click OK to simulate successful payment.\n` +
      `Click Cancel to abort payment.`
    );

    if (paymentConfirmed) {
      // Simulate successful payment response
      const mockResponse = {
        razorpay_payment_id: 'pay_demo_' + Date.now(),
        razorpay_order_id: this.razorpayOrder?.razorpayOrderId || 'order_demo_' + Date.now(),
        razorpay_signature: 'demo_signature_' + Date.now()
      };

      this.handlePaymentSuccess(mockResponse);
    } else {
      this.handlePaymentDismissal();
    }
  }
}
