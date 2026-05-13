import { Component, OnInit } from '@angular/core';
import { CourseService } from '../../../services/course.service';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-course-list',
  templateUrl: './course-list.component.html',
  styleUrls: ['./course-list.component.css']
})
export class CourseListComponent implements OnInit {
  courses: any[] = [];
  filteredCourses: any[] = [];
  loading = true;
  searchTerm = '';
  selectedCategory = 'All';
  instructorCache: Map<string, string> = new Map();

  categories = ['All', 'Programming', 'Design', 'Business', 'Marketing', 'Data Science'];

  constructor(
    private courseService: CourseService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCourses();
  }

  loadCourses(): void {
    this.courseService.getAllCourses().subscribe({
      next: (response) => {
        this.courses = response.courses || [];
        this.filteredCourses = [...this.courses];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading courses:', error);
        this.loading = false;
      }
    });
  }

  searchCourses(): void {
    if (this.searchTerm) {
      this.courseService.searchCourses(this.searchTerm).subscribe({
        next: (response) => {
          this.filteredCourses = response.courses || [];
        },
        error: (error) => {
          console.error('Error searching courses:', error);
        }
      });
    } else {
      this.filterByCategory();
    }
  }

  filterByCategory(): void {
    if (this.selectedCategory === 'All') {
      this.filteredCourses = [...this.courses];
    } else {
      this.courseService.getCoursesByCategory(this.selectedCategory).subscribe({
        next: (response) => {
          this.filteredCourses = response.courses || [];
        },
        error: (error) => {
          console.error('Error filtering courses:', error);
        }
      });
    }
  }

  viewCourse(courseId: string): void {
    this.router.navigate(['/courses', courseId]);
  }

  onSearchChange(): void {
    this.searchCourses();
  }

  onCategoryChange(category: string): void {
    this.selectedCategory = category;
    this.filterByCategory();
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
}
