import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CourseService } from '../../services/course.service';
import { EnrollmentService } from '../../services/enrollment.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  currentUser: any = null;
  enrolledCourses: any[] = [];
  topCourses: any[] = [];
  loading = true;

  constructor(
    private authService: AuthService,
    private courseService: CourseService,
    private enrollmentService: EnrollmentService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading = true;
    
    // Load top courses
    this.courseService.getTopRatedCourses(6).subscribe({
      next: (response) => {
        this.topCourses = response.courses || [];
      },
      error: (error) => {
        console.error('Error loading top courses:', error);
      }
    });

    // Load user enrollments if logged in
    if (this.currentUser) {
      this.enrollmentService.getUserEnrollments(this.currentUser.id).subscribe({
        next: (response) => {
          this.enrolledCourses = response.enrollments || [];
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading enrollments:', error);
          this.loading = false;
        }
      });
    } else {
      this.loading = false;
    }
  }

  viewCourse(courseId: string): void {
    // Navigate to course detail
    console.log('View course:', courseId);
  }
}
