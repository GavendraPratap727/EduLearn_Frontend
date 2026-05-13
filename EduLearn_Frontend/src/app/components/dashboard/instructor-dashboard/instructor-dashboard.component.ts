import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { CourseService } from '../../../services/course.service';
import { ReviewService } from '../../../services/review.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';


@Component({
  selector: 'app-instructor-dashboard',
  templateUrl: './instructor-dashboard.component.html',
  styleUrls: ['./instructor-dashboard.component.css']
})
export class InstructorDashboardComponent implements OnInit {
  currentUser: any = null;
  myCourses: any[] = [];
  stats = {
    totalCourses: 0,
    averageRating: 0
  };
  loading = true;

  constructor(
    private router: Router,
    private authService: AuthService,
    private courseService: CourseService,
    private reviewService: ReviewService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadInstructorData();
  }

  loadInstructorData(): void {
    this.loading = true;
    
    // Load instructor's courses
    this.courseService.getInstructorCourses(this.currentUser.id).subscribe({
      next: (response) => {
        this.myCourses = response.courses || [];
        this.stats.totalCourses = this.myCourses.length;
        
        if (this.myCourses.length > 0) {
          // Fetch real ratings for each course from ReviewService
          const ratingRequests = this.myCourses.map(course => 
            this.reviewService.getAverageRating(course.courseId || course.CourseId).pipe(
              catchError(() => of({ AverageRating: 0 }))
            )
          );

          forkJoin(ratingRequests).subscribe(results => {
            console.log('=== Rating API Results ===', results);
            let totalRating = 0;
            results.forEach((res: any, index) => {
              console.log(`Course ${index} response:`, res);
              console.log(`Course ${index} courseId:`, this.myCourses[index].courseId || this.myCourses[index].CourseId);
              this.myCourses[index].rating = res.AverageRating || 0;
              console.log(`Course ${index} rating set to:`, this.myCourses[index].rating);
              totalRating += this.myCourses[index].rating;
            });
            console.log('Total rating:', totalRating);
            console.log('Number of courses:', this.myCourses.length);
            this.stats.averageRating = Number((totalRating / this.myCourses.length).toFixed(1));
            console.log('Final average rating:', this.stats.averageRating);
            this.loading = false;
          });
        } else {
          this.stats.averageRating = 0;
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Error loading instructor courses:', error);
        this.loading = false;
      }
    });



  }

  createCourse(): void {
    // Navigate to course creation page or open modal
    this.router.navigate(['/instructor/create-course']);
  }

  editCourse(courseId: string): void {
    // Navigate to course edit page
    this.router.navigate(['/instructor/edit-course', courseId]);
  }

  viewCourseDetails(courseId: string): void {
    // Navigate to course details page
    this.router.navigate(['/courses', courseId]);
  }
}
