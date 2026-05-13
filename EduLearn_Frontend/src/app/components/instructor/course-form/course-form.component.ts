import { Component, OnInit, Input } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CourseService } from '../../../services/course.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-course-form',
  templateUrl: './course-form.component.html',
  styleUrls: ['./course-form.component.css']
})
export class CourseFormComponent implements OnInit {
  @Input() isEdit = false;
  
  courseId: string = '';
  loading = false;
  saving = false;
  error = '';
  currentUser: any = null;
  
  course = {
    title: '',
    description: '',
    category: '',
    level: 0, // 0=Beginner, 1=Intermediate, 2=Advanced (CourseLevel enum)
    price: 0,
    duration: '',
    language: 'English',
    thumbnailUrl: '',
    learningOutcomes: [''],
    requirements: [''],
    tags: [''],
    isPublished: false,
    isFinished: false,
    isApproved: false,
    isSubmittedForReview: false
  };

  categories = [
    'Web Development',
    'Mobile Development',
    'Data Science',
    'Machine Learning',
    'Cloud Computing',
    'DevOps',
    'Cybersecurity',
    'Design',
    'Business',
    'Marketing'
  ];

  levels = [
    { value: 0, label: 'Beginner' },
    { value: 1, label: 'Intermediate' },
    { value: 2, label: 'Advanced' }
  ];
  languages = ['English', 'Spanish', 'French', 'German', 'Chinese', 'Hindi'];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private courseService: CourseService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Check if we're on create-course route (no ID parameter)
    const urlSegments = this.route.snapshot.url;
    const isCreateRoute = urlSegments.some(segment => segment.path === 'create-course');
    
    if (isCreateRoute) {
      this.courseId = '';
      this.isEdit = false;
    } else {
      // We're on edit-course route, get the ID
      this.courseId = this.route.snapshot.paramMap.get('id') || '';
      this.isEdit = !!this.courseId;
    }
    
    this.currentUser = this.authService.getCurrentUser();
    
    if (this.isEdit && this.courseId) {
      this.loadCourse();
    }
  }

  loadCourse(): void {
    this.loading = true;
    this.courseService.getCourseById(this.courseId).subscribe({
      next: (response: any) => {
        if (response.course) {
          // Map CourseLevel enum to numeric value
          const levelMap: { [key: string]: number } = {
            'Beginner': 0,
            'Intermediate': 1,
            'Advanced': 2
          };
          
          this.course = {
            ...this.course,
            title: response.course.title || '',
            description: response.course.description || '',
            category: response.course.category || '',
            level: typeof response.course.level === 'number' 
              ? response.course.level 
              : (levelMap[response.course.level] ?? 0),
            price: response.course.price || 0,
            duration: response.course.totalDuration 
              ? `${response.course.totalDuration} minutes` 
              : '',
            language: response.course.language || 'English',
            thumbnailUrl: response.course.thumbnailUrl || '',
            isPublished: response.course.isPublished || false,
            isFinished: response.course.isFinished || false,
            isApproved: response.course.isApproved || false,
            isSubmittedForReview: response.course.isSubmittedForReview || false
          };
        }
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading course:', error);
        // If course not found (404), redirect to instructor dashboard
        if (error.status === 404) {
          alert('Course not found. Redirecting to dashboard.');
          this.router.navigate(['/dashboard/instructor']);
        } else {
          this.error = 'Failed to load course details';
        }
        this.loading = false;
      }
    });
  }

  saveCourse(): void {
    this.saving = true;
    this.error = '';

    // Parse duration to minutes (backend expects TotalDuration as int)
    let totalDuration = 0;
    if (this.course.duration) {
      const match = this.course.duration.match(/(\d+)/);
      if (match) {
        totalDuration = parseInt(match[1], 10);
      }
    }

    // Build data matching backend UpdateCourseRequest/CreateCourseRequest
    const courseData: any = {
      title: this.course.title,
      description: this.course.description,
      category: this.course.category,
      level: this.course.level === 0 ? 'Beginner' : this.course.level === 1 ? 'Intermediate' : 'Advanced', // Send as enum string
      price: this.course.price,
      language: this.course.language,
      thumbnailUrl: this.course.thumbnailUrl || null
    };

    if (!this.isEdit) {
      courseData.instructorId = this.currentUser?.id;
    }

    if (this.isEdit) {
      this.courseService.updateCourse(this.courseId, courseData).subscribe({
        next: (response: any) => {
          this.saving = false;
          if (response.success) {
            alert('Course updated successfully!');
            this.router.navigate(['/dashboard/instructor']);
          } else {
            this.error = response.message || 'Failed to update course';
          }
        },
        error: (error: any) => {
          console.error('Error updating course:', error);
          this.saving = false;
          this.error = 'Failed to update course. Please try again.';
        }
      });
    } else {
      this.courseService.createCourse(courseData).subscribe({
        next: (response: any) => {
          this.saving = false;
          if (response.success) {
            alert('Course created successfully!');
            // Navigate with replace URL to clear old course ID
            this.router.navigate(['/dashboard/instructor'], { replaceUrl: true });
          } else {
            this.error = response.message || 'Failed to create course';
          }
        },
        error: (error: any) => {
          console.error('Error creating course:', error);
          this.saving = false;
          this.error = 'Failed to create course. Please try again.';
        }
      });
    }
  }

  publishCourse(): void {
    if (!this.isEdit) {
      this.error = 'Please save the course first before publishing';
      return;
    }

    this.saving = true;
    this.courseService.publishCourse(this.courseId).subscribe({
      next: (response: any) => {
        this.saving = false;
        if (response.success) {
          this.course.isSubmittedForReview = true;
          this.course.isPublished = false;
          alert('Course submitted for admin review successfully!');
        } else {
          this.error = response.message || 'Failed to publish course';
        }
      },
      error: (error: any) => {
        console.error('Error publishing course:', error);
        this.saving = false;
        this.error = 'Failed to publish course. Please try again.';
      }
    });
  }

  finishCourse(): void {
    if (!this.isEdit) {
      this.error = 'Please save the course first before finishing';
      return;
    }

    if (!confirm('Are you sure you want to finish this course? Once finished, students can earn certificates after completing all content. This action cannot be undone.')) {
      return;
    }

    this.saving = true;
    this.courseService.finishCourse(this.courseId).subscribe({
      next: (response: any) => {
        this.saving = false;
        if (response.success) {
          this.course.isFinished = true;
          alert('Course finished successfully! Students can now earn certificates.');
        } else {
          this.error = response.message || 'Failed to finish course';
        }
      },
      error: (error: any) => {
        console.error('Error finishing course:', error);
        this.saving = false;
        this.error = 'Failed to finish course. Please try again.';
      }
    });
  }

  addArrayItem(arrayName: 'learningOutcomes' | 'requirements' | 'tags'): void {
    this.course[arrayName].push('');
  }

  removeArrayItem(arrayName: 'learningOutcomes' | 'requirements' | 'tags', index: number): void {
    if (this.course[arrayName].length > 1) {
      this.course[arrayName].splice(index, 1);
    }
  }

  trackByIndex(index: number): number {
    return index;
  }

  cancel(): void {
    this.router.navigate(['/dashboard/instructor']);
  }
}
