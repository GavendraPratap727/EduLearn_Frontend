import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CourseService } from '../../../services/course.service';
import { AuthService } from '../../../services/auth.service';
import { EnrollmentService } from '../../../services/enrollment.service';
import { PaymentService } from '../../../services/payment.service';

@Component({
  selector: 'app-course-detail',
  templateUrl: './course-detail.component.html',
  styleUrls: ['./course-detail.component.css']
})
export class CourseDetailComponent implements OnInit {
  course: any = null;
  loading = true;
  isEnrolled = false;
  currentUser: any = null;
  showPaymentModal = false;
  instructorCache: Map<string, string> = new Map();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private courseService: CourseService,
    private authService: AuthService,
    private enrollmentService: EnrollmentService,
    private paymentService: PaymentService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    const courseId = this.route.snapshot.paramMap.get('id');
    if (courseId) {
      this.loadCourseDetails(courseId);
      this.checkEnrollmentStatus(courseId);
    } else {
      this.router.navigate(['/courses']);
    }
  }

  loadCourseDetails(courseId: string): void {
    this.courseService.getCourseById(courseId).subscribe({
      next: (response) => {
        this.course = response.course;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading course details:', error);
        this.loading = false;
        this.router.navigate(['/courses']);
      }
    });
  }

  checkEnrollmentStatus(courseId: string): void {
    if (!this.currentUser) {
      this.isEnrolled = false;
      return;
    }

    // Check if user is enrolled in this course
    const userId = this.currentUser.id || this.currentUser.userId;
    console.log('Checking enrollment for userId:', userId, 'currentUser:', this.currentUser);
    this.enrollmentService.getUserEnrollments(userId).subscribe({
      next: (response: any) => {
        const enrollments = response.enrollments || response || [];
        this.isEnrolled = enrollments.some((e: any) => {
          const eCourseId = e.courseId || e.CourseId;
          return eCourseId && eCourseId.toString().toLowerCase() === courseId.toLowerCase();
        });
        console.log('Enrollment status checked:', this.isEnrolled, 'for course:', courseId);
      },
      error: (error: any) => {
        console.error('Error checking enrollment status:', error);
        this.isEnrolled = false;
      }
    });
  }

  onPaymentSuccess(): void {
    console.log('Payment successful, refreshing enrollment status');
    // Small delay to ensure backend has processed the enrollment
    setTimeout(() => {
      const courseId = this.route.snapshot.paramMap.get('id');
      if (courseId) {
        this.checkEnrollmentStatus(courseId);
      }
    }, 1000);
    this.showPaymentModal = false;
  }

  onPaymentClosed(): void {
    console.log('Payment modal closed');
    this.showPaymentModal = false;
  }

  enrollInCourse(): void {
    console.log('enrollInCourse called', {
      currentUser: this.currentUser,
      course: this.course,
      price: this.course?.price
    });
    
    if (!this.currentUser) {
      console.log('No current user, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    if (this.course.price > 0) {
      // Paid course - show payment modal
      console.log('Paid course detected, showing payment modal');
      this.showPaymentModal = true;
      console.log('showPaymentModal set to:', this.showPaymentModal);
    } else {
      // Free course - enroll directly
      console.log('Free course detected, enrolling directly');
      this.enrollDirectly(this.course.courseId);
    }
  }

  enrollDirectly(courseId: string): void {
    this.enrollmentService.enrollInCourse(courseId).subscribe({
      next: (response: any) => {
        console.log('Successfully enrolled in course:', response);
        this.isEnrolled = true;
        alert('Successfully enrolled in the course!');
      },
      error: (error: any) => {
        console.error('Error enrolling in course:', error);
        // Check if already enrolled
        if (error.error?.message?.includes('already enrolled') || 
            error.message?.includes('already enrolled')) {
          this.isEnrolled = true;
          alert('You are already enrolled in this course!');
        }
      }
    });
  }

  startLearning(): void {
    if (!this.isEnrolled) {
      this.enrollInCourse();
    } else {
      // Navigate to course learning page
      console.log('Navigating to course learning page');
      this.router.navigate(['/courses', this.course?.courseId, 'learn']);
    }
  }

  formatDuration(totalMinutes: number): string {
    if (totalMinutes === 0) return 'N/A';
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${minutes}m`;
    }
  }

  getInstructorName(course: any): string {
    // For now, return a placeholder instructor name
    // The AuthService endpoint requires authentication and specific permissions
    // We'll implement a proper solution later by adding instructor names to course API
    return 'Course Instructor';
  }

  goBack(): void {
    this.router.navigate(['/courses']);
  }
}
