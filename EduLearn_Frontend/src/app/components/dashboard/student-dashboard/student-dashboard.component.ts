import { Component, OnInit, ViewChild, TemplateRef, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { CourseService } from '../../../services/course.service';
import { EnrollmentService } from '../../../services/enrollment.service';
import { ProgressService } from '../../../services/progress.service';
import { PaymentService } from '../../../services/payment.service';
import { ReviewService } from '../../../services/review.service';
import { QuizService } from '../../../services/quiz.service';

@Component({
  selector: 'app-student-dashboard',
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.css']
})
export class StudentDashboardComponent implements OnInit {
  currentUser: any = null;
  enrolledCourses: any[] = [];
  recommendedCourses: any[] = [];
  recentProgress: any[] = [];
  stats = {
    totalEnrollments: 0,
    completedCourses: 0,
    inProgressCourses: 0,
    totalHours: 0
  };
  loading = true;
  @ViewChild('loadingTemplate') loadingTemplate!: TemplateRef<any>;
  circumference: number = 2 * Math.PI * 16;
  showPaymentModal = false;
  selectedCourseId = '';
  selectedCourseTitle = '';
  selectedCoursePrice = 0;
  showCertificateModal = false;
  certificateData = {
    studentName: '',
    courseName: '',
    completionDate: '',
    averageScore: 0,
    certificateId: ''
  };

  constructor(
    private router: Router,
    private authService: AuthService,
    private courseService: CourseService,
    private enrollmentService: EnrollmentService,
    private progressService: ProgressService,
    private paymentService: PaymentService,
    private reviewService: ReviewService,
    private quizService: QuizService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser) {
      this.loadStudentData();
    } else {
      this.loading = false;
      this.router.navigate(['/login']);
    }
  }

  loadStudentData(): void {
    this.loading = true;

    // Load enrolled courses
    this.enrollmentService.getUserEnrollments(this.currentUser.id).subscribe({
      next: (response: any) => {
        this.enrolledCourses = response.enrollments || [];
        this.stats.totalEnrollments = this.enrolledCourses.length;

        // For each enrollment, fetch the full course details (title, level, etc.)
        this.enrolledCourses.forEach((course, index) => {
          this.courseService.getCourseById(course.courseId).subscribe({
            next: (courseRes: any) => {
              if (courseRes.success && courseRes.course) {
                const details = courseRes.course;
                const updatedCourse = {
                  ...course,
                  title: details.title || details.Title || 'Untitled Course',
                  instructor: details.instructorName || details.InstructorName || '',
                  level: details.level || details.Level || '',
                  duration: details.duration || details.Duration || ''
                };
                // Use proper change detection by creating new array
                this.enrolledCourses = [...this.enrolledCourses.slice(0, index), updatedCourse, ...this.enrolledCourses.slice(index + 1)];
                this.cdr.detectChanges(); // Trigger change detection manually
              } else {
                console.warn(`Course ${course.courseId} not found, removing from enrolled courses`);
                // Remove course from enrolled courses if it doesn't exist
                this.enrolledCourses = this.enrolledCourses.filter(c => c.courseId !== course.courseId);
                this.cdr.detectChanges(); // Trigger change detection manually
              }
            },
            error: (error) => {
              console.warn(`Course ${course.courseId} not found, removing from enrolled courses`);
              // Remove course from enrolled courses if it doesn't exist
              this.enrolledCourses = this.enrolledCourses.filter(c => c.courseId !== course.courseId);
              this.cdr.detectChanges(); // Trigger change detection manually
            }
          });

        // Fetch progress for each course
          this.progressService.getCourseProgress(this.currentUser.id, course.courseId).subscribe({
            next: (progResponse: any) => {
              const rawProgress = progResponse.courseProgressPercent ?? progResponse.CourseProgressPercent ?? 0;
              const progressList: any[] = progResponse.progressList || progResponse.ProgressList || [];

              let finalProgress = Math.round(rawProgress);
              if (finalProgress === 0 && progressList.length > 0) {
                const completedCount = progressList.filter((p: any) => p.isCompleted || p.IsCompleted).length;
                finalProgress = Math.round((completedCount / progressList.length) * 100);
              }

              const updatedCourseWithProgress = {
                ...this.enrolledCourses[index],
                progress: finalProgress,
                isCompleted: finalProgress >= 100
              };
              // Use proper change detection by creating new array
              this.enrolledCourses = [...this.enrolledCourses.slice(0, index), updatedCourseWithProgress, ...this.enrolledCourses.slice(index + 1)];
              this.calculateStats();
              this.cdr.detectChanges(); // Trigger change detection manually

              if (finalProgress >= 100) {
                this.reviewService.hasStudentReviewed(this.currentUser.id, course.courseId).subscribe({
                  next: (revResponse: any) => {
                    const updatedCourseWithReview = {
                      ...this.enrolledCourses[index],
                      hasReviewed: revResponse.hasReviewed ?? false
                    };
                    // Use proper change detection by creating new array
                    this.enrolledCourses = [...this.enrolledCourses.slice(0, index), updatedCourseWithReview, ...this.enrolledCourses.slice(index + 1)];
                    this.cdr.detectChanges(); // Trigger change detection manually
                  },
                  error: () => {
                    // Ignore errors, assume not reviewed
                  }
                });
              }
            }
          });
        });
      },
      error: (error: any) => {
        console.error('Error loading enrollments:', error);
        this.loading = false;
        this.cdr.detectChanges(); // Trigger change detection manually
      }
    });

    // Load recommended courses
    this.courseService.getTopRatedCourses(6).subscribe({
      next: (response: any) => {
        this.recommendedCourses = response.courses || [];
      },
      error: (error: any) => {
        console.error('Error loading recommended courses:', error);
      }
    });

    // Load recent progress
    this.progressService.getUserProgress(this.currentUser.id).subscribe({
      next: (response: any) => {
        this.recentProgress = response.progress || [];
        this.loading = false;
        this.cdr.detectChanges(); // Trigger change detection manually
      },
      error: (error: any) => {
        console.error('Error loading progress:', error);
        this.loading = false;
        this.cdr.detectChanges(); // Trigger change detection manually
      }
    });
  }

  calculateStats(): void {
    this.stats.completedCourses = this.enrolledCourses.filter(c => c.isCompleted).length;
    this.stats.inProgressCourses = this.enrolledCourses.filter(c => !c.isCompleted && c.progress > 0).length;
    this.stats.totalHours = this.enrolledCourses.reduce((total, course) => total + (course.duration || 0), 0);
  }

  
  viewCourse(courseId: string): void {
    this.router.navigate(['/courses', courseId]);
  }

  // Rating Modal State
  showRatingModal = false;
  ratingCourseId = '';
  ratingCourseTitle = '';
  selectedRating = 0;
  hoverRating = 0;
  ratingComment = '';

  continueCourse(courseId: string): void {
    // Navigate to course learning page
    this.router.navigate(['/courses', courseId, 'learn']);
  }

  isEnrolledInCourse(courseId: string): boolean {
    return this.enrolledCourses.some(course => course.courseId === courseId);
  }

  rateCourse(courseId: string): void {
    const course = this.enrolledCourses.find(c => c.courseId === courseId);
    // Wrap rating modal assignments to avoid change detection errors
    setTimeout(() => {
      this.ratingCourseTitle = course ? course.title : 'this course';
      this.selectedRating = 0;
      this.hoverRating = 0;
      this.ratingComment = '';
      this.showRatingModal = true;
    });
  }

  setRating(rating: number): void {
    // Wrap rating assignment to avoid change detection error
    setTimeout(() => {
      this.selectedRating = rating;
    });
  }

  submitRating(): void {
    if (this.selectedRating === 0) return;
    
    this.reviewService.addReview({
      courseId: this.ratingCourseId,
      rating: this.selectedRating,
      comment: this.ratingComment
    }).subscribe({
      next: (res) => {
        console.log('Review submitted successfully', res);
        
        // Find the course and update it instantly
        const idx = this.enrolledCourses.findIndex(c => c.courseId === this.ratingCourseId);
        if (idx !== -1) {
          const updatedCourseWithReview = {
            ...this.enrolledCourses[idx],
            hasReviewed: true
          };
          // Use proper change detection by creating new array
          this.enrolledCourses = [...this.enrolledCourses.slice(0, idx), updatedCourseWithReview, ...this.enrolledCourses.slice(idx + 1)];
        }

        alert('Thank you! Your review has been submitted.');
        this.showRatingModal = false;
      },
      error: (err) => {
        console.error('Error submitting review:', err);
        alert('Could not submit review at this time.');
        this.showRatingModal = false;
      }
    });
  }

  closeRatingModal(): void {
    this.showRatingModal = false;
  }

  navigateToCourses(): void {
    this.router.navigate(['/courses']);
  }

  enrollInCourse(courseId: string): void {
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    // Find the course to check if payment is required
    const course = this.recommendedCourses.find(c => c.courseId === courseId);

    if (course && course.price > 0) {
      // Paid course - show payment modal
      // Wrap payment modal assignments to avoid change detection errors
      setTimeout(() => {
        this.selectedCourseId = courseId;
        this.selectedCourseTitle = course.title;
        this.selectedCoursePrice = course.price;
        this.showPaymentModal = true;
      });
    } else {
      // Free course - enroll directly
      this.enrollDirectly(courseId);
    }
  }

  onPaymentModalClosed(): void {
    this.showPaymentModal = false;
    // Refresh student data after payment modal closes
    this.loadStudentData();
  }

  enrollDirectly(courseId: string): void {
    this.enrollmentService.enrollInCourse(courseId).subscribe({
      next: (response: any) => {
        console.log('Successfully enrolled in course:', response);
        // Refresh the enrolled courses list
        this.loadStudentData();
      },
      error: (error: any) => {
        console.error('Error enrolling in course:', error);
      }
    });
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'completed':
        return 'fa-check';
      case 'progress':
        return 'fa-play';
      case 'enrolled':
        return 'fa-user-plus';
      default:
        return 'fa-circle';
    }
  }

  canDownloadCertificate(course: any): boolean {
    // Quick check for certificate eligibility
    if (!course.isCompleted) {
      return false;
    }
    return true; // Will be verified in detail when clicked
  }

  downloadCertificate(course: any): void {
    console.log('Certificate download clicked for course:', course);
    
    // Check if course is completed
    if (!course?.isCompleted) {
      console.log('Certificate not available: Course not completed');
      alert('Please complete the course before downloading the certificate.');
      return;
    }
    
    // Get quizzes for this course and check attempts
    this.quizService.getQuizzesByCourse(course.courseId).subscribe({
      next: (quizResponse: any) => {
        console.log('Quiz response:', quizResponse);
        const quizzes = quizResponse.quizzes || quizResponse.Quizzes || [];
        
        if (quizzes.length === 0) {
          console.log('No quizzes found - allowing certificate');
          // No quizzes in course, allow certificate with 0% average
          const certId = this.getOrGenerateCertificateId(course.courseId, this.currentUser.id);
          // Wrap certificate modal assignments to avoid change detection errors
          setTimeout(() => {
            this.certificateData = {
              studentName: this.currentUser?.fullName || this.currentUser?.name || 'Student',
              courseName: course?.title || course?.Title || 'Course',
              completionDate: new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }),
                          averageScore: 0,
              certificateId: certId
            };
            this.showCertificateModal = true;
          });
          return;
        }
        
        // Get best attempt for each quiz
        const quizScorePromises = quizzes.map((quiz: any) => {
          return this.quizService.getBestAttempt(this.currentUser.id, quiz.quizId || quiz.QuizId).toPromise()
            .then(attemptResponse => {
              const attempt = attemptResponse?.attempt || attemptResponse?.Attempt;
              return {
                quizId: quiz.quizId || quiz.QuizId,
                score: attempt?.score || attempt?.Score || 0,
                isPassed: attempt?.isPassed || attempt?.IsPassed || false,
                passingScore: quiz.passingScore || quiz.PassingScore || 70
              };
            })
            .catch(error => {
              console.log(`No attempt found for quiz ${quiz.quizId || quiz.QuizId}`);
              return {
                quizId: quiz.quizId || quiz.QuizId,
                score: 0,
                isPassed: false,
                passingScore: quiz.passingScore || quiz.PassingScore || 70
              };
            });
        });
        
        Promise.all(quizScorePromises).then(quizResults => {
          console.log('Quiz results:', quizResults);
          
          const allQuizzesPassed = quizResults.every(result => result.isPassed);
          
          if (!allQuizzesPassed) {
            console.log('Certificate not available: Not all quizzes passed');
            alert('You must pass all quizzes in the course to download the certificate.');
            return;
          }
          
          // Calculate average score
          const totalScore = quizResults.reduce((sum, result) => sum + result.score, 0);
          const averageScore = quizResults.length > 0 ? Math.round(totalScore / quizResults.length) : 0;
          
          console.log('Average score calculated:', averageScore);
          
          // All checks passed - generate certificate and show modal
          const certId = this.getOrGenerateCertificateId(course.courseId, this.currentUser.id);
          // Wrap certificate modal assignments to avoid change detection errors
          setTimeout(() => {
            this.certificateData = {
              studentName: this.currentUser?.fullName || this.currentUser?.name || 'Student',
              courseName: course?.title || course?.Title || 'Course',
              completionDate: new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }),
                          averageScore: averageScore,
              certificateId: certId
            };
            
            console.log('Certificate data prepared:', this.certificateData);
            this.showCertificateModal = true;
          });
        });
      },
      error: (error: any) => {
        console.error('Error fetching quizzes:', error);
        // Allow certificate if we can't verify quiz status
        console.log('Allowing certificate due to API error');
        const certId = this.getOrGenerateCertificateId(course.courseId, this.currentUser.id);
        // Wrap certificate error assignments to avoid change detection errors
        setTimeout(() => {
          this.certificateData = {
            studentName: this.currentUser?.fullName || this.currentUser?.name || 'Student',
            courseName: course?.title || course?.Title || 'Course',
            completionDate: new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
                    averageScore: 0,
            certificateId: certId
          };
          this.showCertificateModal = true;
        });
      }
    });
  }

  closeCertificateModal(): void {
    // Wrap certificate modal assignment to avoid change detection error
    setTimeout(() => {
      this.showCertificateModal = false;
    });
  }

  shareCertificate(): void {
    // Simple share functionality for now
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      alert('Certificate link copied to clipboard!');
    });
  }

  getOrGenerateCertificateId(courseId: string, studentId: string): string {
    // Create a unique key for this student-course combination
    const storageKey = `certificate_${studentId}_${courseId}`;
    
    // Check if certificate ID already exists in localStorage
    let certificateId = localStorage.getItem(storageKey);
    
    if (!certificateId) {
      // Generate a new certificate ID only if it doesn't exist
      certificateId = this.generateCertificateId();
      // Store it permanently
      localStorage.setItem(storageKey, certificateId);
    }
    
    return certificateId;
  }

  generateCertificateId(): string {
    // Generate a unique certificate ID using timestamp and random string
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `CERT-${timestamp.toUpperCase()}-${randomStr.toUpperCase()}`;
  }

  downloadCertificateFile(): void {
    // Print the certificate section
    const certificateElement = document.querySelector('.certificate-modal-content');
    if (certificateElement) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Certificate - ${this.certificateData.courseName}</title>
              <style>
                body { font-family: Georgia, serif; margin: 0; padding: 40px; background: #f8f6f0; }
                .certificate { border: 8px solid #d4af37; padding: 60px; text-align: center; background: white; max-width: 800px; margin: 0 auto; }
                h1 { color: #d4af37; font-size: 2.5rem; margin-bottom: 10px; }
                h2 { color: #333; font-size: 1.5rem; margin: 20px 0; }
                .name { font-size: 2rem; color: #1a1a2e; font-weight: bold; margin: 20px 0; }
                .course { color: #1a1a2e; font-size: 1.2rem; margin: 20px 0; }
                .date { color: #666; font-size: 1rem; margin: 20px 0; }
                .instructor { color: #666; font-size: 1rem; margin: 20px 0; }
                .score { color: #1a1a2e; font-size: 1.1rem; margin: 10px 0; }
                .cert-id { color: #666; font-size: 0.9rem; margin: 10px 0; font-family: monospace; }
                .seal { font-size: 3rem; color: #d4af37; margin: 20px 0; }
              </style>
            </head>
            <body>
              <div class="certificate">
                <h1>Certificate of Completion</h1>
                <p>This certifies that</p>
                <div class="name">${this.certificateData.studentName}</div>
                <p>has successfully completed the course</p>
                <div class="course">${this.certificateData.courseName}</div>
                <div class="date">Completed on ${this.certificateData.completionDate}</div>
                                <div class="score">Average Quiz Score: ${this.certificateData.averageScore}%</div>
                <div class="cert-id">Certificate ID: ${this.certificateData.certificateId}</div>
                <div class="seal">&#9733; &#9733; &#9733;</div>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  }
}
