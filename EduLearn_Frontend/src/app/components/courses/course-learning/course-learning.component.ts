import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, TemplateRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
declare var Plyr: any;
import { CourseService } from '../../../services/course.service';
import { LessonService } from '../../../services/lesson.service';
import { ProgressService } from '../../../services/progress.service';
import { AuthService } from '../../../services/auth.service';
import { QuizService } from '../../../services/quiz.service';

@Component({
  selector: 'app-course-learning',
  templateUrl: './course-learning.component.html',
  styleUrls: ['./course-learning.component.css']
})
export class CourseLearningComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('plyrContainer') plyrContainer!: ElementRef;
  @ViewChild('loadingTemplate') loadingTemplate!: TemplateRef<any>;

  player: any;
  courseId: string = '';
  course: any = null;
  lessons: any[] = [];
  quizzes: any[] = [];
  currentLesson: any = null;
  currentQuiz: any = null;
  currentIndex: number = 0;
  loading = true;
  error = '';
  currentUser: any = null;
  showCompletionMessage = false;
  showCertificateMessage = false;
  today: Date = new Date();
  showQuizModal = false;
  showQuizLockedModal = false;
  quizLockedMessage = '';
  quizAttemptId: string = '';
  quizAnswers: { [key: number]: number } = {};
  quizSubmitted = false;
  quizScore = 0;
  quizPassed = false;
  quizTimeRemaining: number = 0;
  private quizTimer: any = null;
  quizStartTime: Date | null = null;
  quizAttemptData: { [quizId: string]: { bestScore: number; attemptCount: number } } = {};
  certificateMessage = '';
  private apiLoaded = false;
  private watchTimer: any;
  autoCompleteProgress: number = 0;
  isWatchingIframe: boolean = false;
  isDriveBlocked: boolean = false;
  private isMarkingComplete = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private courseService: CourseService,
    private lessonService: LessonService,
    private progressService: ProgressService,
    private authService: AuthService,
    private quizService: QuizService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.route.params.subscribe(params => {
      this.courseId = params['id'];
      if (this.courseId) {
        this.loadPlyrLibrary();
        this.loadCourseData();
      } else {
        this.router.navigate(['/dashboard/student']);
      }
    });

    // Certificate will only be shown when all requirements are met
    // Removed automatic certificate showing from URL parameter to ensure proper validation
  }

  loadPlyrLibrary(): void {
    if (!(window as any).Plyr) {
      console.warn('Plyr not found on window. Ensure it is correctly included in angular.json.');
      // Retrying after a short delay in case of slow script execution
      setTimeout(() => {
        if ((window as any).Plyr) {
          console.log('Plyr found after delay');
          this.initPlayer();
        }
      }, 2000);
    } else {
      console.log('Plyr is ready');
      this.initPlayer();
    }
  }

  ngOnDestroy(): void {
    if (this.player) {
      this.player.destroy();
    }
    this.clearWatchTimer();
  }

  clearWatchTimer(): void {
    if (this.watchTimer) {
      clearInterval(this.watchTimer);
      this.watchTimer = null;
    }
    this.isWatchingIframe = false;
    this.autoCompleteProgress = 0;
  }

  ngAfterViewInit(): void {
    this.initPlayer();
  }

  loadCourseData(): void {
    this.loading = true;

    // Load course details
    this.courseService.getCourseById(this.courseId).subscribe({
      next: (response: any) => {
        this.course = response.course;
      },
      error: (error: any) => {
        console.error('Error loading course:', error);
        this.error = 'Failed to load course';
        this.loading = false;
      }
    });

    // Load lessons
    this.lessonService.getLessonsByCourse(this.courseId).subscribe({
      next: (response: any) => {
        this.lessons = response.lessons || [];
        console.log('Loaded lessons:', this.lessons);

        // Load student progress to mark completed lessons
        if (this.currentUser) {
          const userId = this.currentUser.id || this.currentUser.Id;
          this.progressService.getCourseProgress(userId, this.courseId).subscribe({
            next: (progResponse: any) => {
              console.log('Loaded course progress:', progResponse);
              // Handle both camelCase and PascalCase from different backend configurations
              const progressList = progResponse.progressList || progResponse.ProgressList || progResponse.progress || [];

              if (Array.isArray(progressList)) {
                this.lessons.forEach(lesson => {
                  const lessonId = lesson.lessonId || lesson.LessonId;
                  const prog = progressList.find((p: any) => (p.lessonId || p.LessonId) === lessonId);

                  if (prog && (prog.isCompleted === true || prog.IsCompleted === true)) {
                    console.log(`Marking lesson ${lessonId} as completed from saved progress`);
                    lesson.isCompleted = true;
                    lesson.IsCompleted = true;
                  }
                });

                // Check for certificate after progress is merged
                this.checkForCertificate();
              }
            },
            error: (err) => console.error('Error loading course progress:', err)
          });
        }

        if (this.lessons.length > 0) {
          this.currentLesson = this.lessons[0];
          this.currentIndex = 0;
          console.log('Current lesson:', this.currentLesson);

          setTimeout(() => this.initPlayer(), 1000);
        }
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading lessons:', error);
        this.error = 'Failed to load lessons';
        this.loading = false;
      }
    });

    // Load quizzes (only published ones)
    this.quizService.getQuizzesByCourse(this.courseId).subscribe({
      next: (response: any) => {
        this.quizzes = response.quizzes?.filter((q: any) => q.isPublished) || [];
        // Load attempt data for each quiz
        this.loadQuizAttemptData();
      },
      error: (error: any) => {
        console.error('Error loading quizzes:', error);
      }
    });
  }

  loadQuizAttemptData(): void {
    if (!this.currentUser || !this.quizzes.length) return;

    this.quizzes.forEach((quiz: any) => {
      // Get best attempt
      this.quizService.getBestAttempt(this.currentUser.id, quiz.quizId).subscribe({
        next: (response: any) => {
          const bestScore = response.success && response.attempt ? response.attempt.score : 0;
          // Get attempt count
          this.quizService.getAttemptCount(this.currentUser.id, quiz.quizId).subscribe({
            next: (countResponse: any) => {
              const attemptCount = countResponse.success ? countResponse.count : 0;
              this.quizAttemptData[quiz.quizId] = { bestScore, attemptCount };
            },
            error: (error: any) => {
              console.error('Error getting attempt count:', error);
            }
          });
        },
        error: (error: any) => {
          console.error('Error getting best attempt:', error);
        }
      });
    });
  }

  isQuizLocked(quiz: any): { locked: boolean; message: string } {
    const attemptData = this.quizAttemptData[quiz.quizId];
    if (!attemptData) return { locked: false, message: '' };

    // If scored 100%, quiz is locked
    if (attemptData.bestScore === 100) {
      return { locked: true, message: `You scored 100% on this quiz. No more attempts needed!` };
    }

    // If attempts exhausted, quiz is locked
    if (attemptData.attemptCount >= quiz.maxAttempts) {
      return { locked: true, message: `Maximum attempts (${quiz.maxAttempts}) reached. Your best score: ${attemptData.bestScore}%` };
    }

    return { locked: false, message: '' };
  }

  openQuizLockedModal(message: string): void {
    this.quizLockedMessage = message;
    this.showQuizLockedModal = true;
  }

  closeQuizLockedModal(): void {
    this.showQuizLockedModal = false;
    this.quizLockedMessage = '';
  }

  selectLesson(lesson: any, index: number): void {
    this.currentLesson = lesson;
    this.currentIndex = index;
    this.clearWatchTimer();

    // Reset player for new lesson
    setTimeout(() => this.initPlayer(), 100);
  }

  nextLesson(): void {
    if (this.currentIndex < this.lessons.length - 1) {
      this.currentIndex++;
      this.currentLesson = this.lessons[this.currentIndex];
    } else {
      // Check if all lessons completed and course is finished
      this.checkForCertificate();
    }
  }

  previousLesson(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.currentLesson = this.lessons[this.currentIndex];
    }
  }

  markLessonComplete(): void {
    if (!this.currentLesson || this.isMarkingComplete) return;

    const lessonId = this.currentLesson.lessonId || this.currentLesson.LessonId;
    if (!lessonId) {
      console.error('Cannot mark lesson as complete: LessonId is missing', this.currentLesson);
      return;
    }

    // If already marked complete in this session, skip
    if (this.currentLesson.isCompleted) return;

    this.isMarkingComplete = true;

    // Optimistically mark as completed locally
    const originalStatus = this.currentLesson.isCompleted;
    this.currentLesson.isCompleted = true;
    this.currentLesson.IsCompleted = true;
    this.lessons[this.currentIndex] = { ...this.currentLesson };

    // Show completion message
    this.showCompletionMessage = true;

    this.progressService.markLessonCompleteByLessonId(lessonId, this.courseId).subscribe({
      next: (response: any) => {
        console.log('Lesson marked as complete successfully');
        this.isMarkingComplete = false;
        // Show completion message
        this.showCompletionMessage = true;

        // Hide message after 2 seconds, then move to next lesson
        setTimeout(() => {
          this.showCompletionMessage = false;

          // Check for certificate after every lesson completion
          this.checkForCertificate();

          // Move to next lesson automatically
          if (this.currentIndex < this.lessons.length - 1) {
            this.nextLesson();
          }
        }, 2000);
      },
      error: (error: any) => {
        console.error('Error marking lesson complete:', error);
        this.isMarkingComplete = false;
        // Rollback local status on error
        this.currentLesson.isCompleted = false;
        this.currentLesson.IsCompleted = false;
        this.showCompletionMessage = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/student']);
  }

  getContentTypeLabel(value: any): string {
    const types: { [key: string]: string } = {
      '0': 'Video',
      '1': 'Article',
      '2': 'PDF',
      '3': 'Quiz',
      'VIDEO': 'Video',
      'TEXT': 'Article',
      'DOCUMENT': 'PDF',
      'QUIZ': 'Quiz'
    };
    return types[value?.toString()] || 'Unknown';
  }

  isContentType(lesson: any, type: string | number): boolean {
    if (!lesson || lesson.contentType === undefined) return false;
    const value = lesson.contentType.toString();

    if (type === 0 || type === '0' || type === 'VIDEO') return value === '0' || value === 'VIDEO';
    if (type === 1 || type === '1' || type === 'TEXT') return value === '1' || value === 'TEXT';
    if (type === 2 || type === '2' || type === 'DOCUMENT') return value === '2' || value === 'DOCUMENT';
    if (type === 3 || type === '3' || type === 'QUIZ') return value === '3' || value === 'QUIZ';

    return value === type.toString();
  }

  isLessonCompleted(lesson: any): boolean {
    // This would be determined from progress data
    return lesson.isCompleted || false;
  }

  getSanitizedUrl(url: string): SafeResourceUrl {
    if (!url) {
      console.warn('No URL provided to sanitize');
      // Use a sample video for testing
      const sampleVideo = 'https://www.w3schools.com/html/mov_bbb.mp4';
      console.log('Using sample video URL:', sampleVideo);
      return this.sanitizer.bypassSecurityTrustResourceUrl(sampleVideo);
    }
    console.log('Sanitizing URL:', url);
    const sanitized = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    console.log('Sanitized URL:', sanitized);
    return sanitized;
  }

  isYouTubeUrl(url: string): boolean {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    // More specific check for YouTube domains
    return lowerUrl.includes('youtube.com/watch') ||
      lowerUrl.includes('youtube.com/embed') ||
      lowerUrl.includes('youtu.be/');
  }

  getYouTubeEmbedUrl(url: string): string {
    if (!url) return '';

    // Extract video ID from YouTube URL
    let videoId = '';

    if (url.includes('youtube.com/watch')) {
      const urlParams = new URLSearchParams(url.split('?')[1]);
      videoId = urlParams.get('v') || '';
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
    }

    if (videoId) {
      // Add parameters to fix CORS and embedding issues
      // origin: tells YouTube where request comes from
      // rel=0: don't show related videos from other channels
      // modestbranding=1: reduce YouTube logo
      // enablejsapi=0: disable JS API to avoid extension conflicts
      // enablejsapi=1: enable JS API to detect video end
      return `https://www.youtube.com/embed/${videoId}?origin=${window.location.origin}&rel=0&modestbranding=1&enablejsapi=1`;
    }

    return url;
  }

  isGoogleDriveUrl(url: string): boolean {
    if (!url) return false;
    return url.includes('drive.google.com');
  }

  getGoogleDrivePreviewUrl(url: string): string {
    if (!url) return '';
    // Extract file ID
    let fileId = '';

    // Pattern 1: /d/FILE_ID/view
    const dMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (dMatch && dMatch[1]) {
      fileId = dMatch[1];
    } else {
      // Pattern 2: ?id=FILE_ID or &id=FILE_ID
      const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (idMatch && idMatch[1]) {
        fileId = idMatch[1];
      }
    }

    if (fileId) {
      // Try docs.google.com which sometimes has more relaxed CSP than drive.google.com
      return `https://docs.google.com/file/d/${fileId}/preview`;
    }
    return url;
  }

  getGoogleDriveDownloadUrl(url: string): string {
    if (!url) return '';
    let fileId = '';
    const dMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (dMatch && dMatch[1]) {
      fileId = dMatch[1];
    } else {
      const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (idMatch && idMatch[1]) {
        fileId = idMatch[1];
      }
    }

    if (fileId) {
      return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
    return url;
  }

  extractYouTubeId(url: string): string {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : '';
  }

  initPlayer(): void {
    if (!this.currentLesson) return;
    const url = this.currentLesson.contentUrl || this.currentLesson.ContentUrl;
    if (!url) return;

    // Check if Plyr is loaded
    if (!(window as any).Plyr) {
      console.warn('Plyr not ready yet, retrying...');
      setTimeout(() => this.initPlayer(), 1000);
      return;
    }

    const PlyrClass = (window as any).Plyr;

    // Destroy previous player instance if exists
    if (this.player) {
      this.player.destroy();
    }

    const container = this.plyrContainer?.nativeElement;
    if (!container) {
      // If container not ready, retry in a bit
      setTimeout(() => this.initPlayer(), 500);
      return;
    }

    // Clear container
    container.innerHTML = '';

    let element: HTMLElement;
    const isYT = this.isYouTubeUrl(url);
    const isGD = this.isGoogleDriveUrl(url);

    if (isYT) {
      // Use Plyr's native YouTube provider for best experience
      const videoId = this.extractYouTubeId(url);
      element = document.createElement('div');
      element.setAttribute('data-plyr-provider', 'youtube');
      element.setAttribute('data-plyr-embed-id', videoId);
      container.appendChild(element);

      this.player = new PlyrClass(element, {
        tooltips: { controls: true, seek: true },
        autoplay: false,
        youtube: {
          noCookie: false,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          modestbranding: 1
        }
      });

      // Special handling for YouTube ended state
      this.player.on('statechange', (event: any) => {
        // Only trigger ended if the player actually reports code 0 (Ended)
        if (event.detail.code === 0) {
          console.log('YouTube Video State: Ended');
          this.onVideoEnded();
        }
      });

      this.setupCommonPlayerEvents();
      return;
    } else if (isGD) {
      // SMART GOOGLE DRIVE HANDLING:
      // Try video tag first (for custom UI and auto-completion)
      // Use a direct video element for Google Drive to try and play it in-site
      element = document.createElement('video');
      (element as HTMLVideoElement).playsInline = true;
      (element as HTMLVideoElement).controls = true;

      const downloadUrl = this.getGoogleDriveDownloadUrl(url);
      (element as HTMLVideoElement).src = downloadUrl;

      // Fallback to iframe if video fails to load
      let fallbackTriggered = false;
      element.addEventListener('error', (e) => {
        if (!fallbackTriggered) {
          console.warn('Direct stream failed, trying iframe embed inside website...');
          fallbackTriggered = true;
          this.switchToGoogleDriveIframe(url);
        }
      });

      // Shorter timeout to switch to iframe faster for better UX
      setTimeout(() => {
        if (!fallbackTriggered && (element as HTMLVideoElement).readyState < 1) {
          console.warn('Direct stream slow, switching to iframe...');
          fallbackTriggered = true;
          this.switchToGoogleDriveIframe(url);
        }
      }, 3000);

    } else {
      element = document.createElement('video');
      (element as HTMLVideoElement).playsInline = true;
      (element as HTMLVideoElement).controls = true;
      (element as HTMLVideoElement).src = url;
    }

    container.appendChild(element);

    this.player = new PlyrClass(element, {
      tooltips: { controls: true, seek: true },
      captions: { active: true, update: true, language: 'en' },
      invertTime: false,
      toggleInvert: false,
      hideControls: false,
      resetOnEnd: true,
      keyboard: { focused: true, global: true },
      autoplay: false
    });

    this.setupCommonPlayerEvents();
  }

  setupCommonPlayerEvents(): void {
    if (!this.player) return;

    // Listen for events
    this.player.on('ended', () => {
      console.log('Plyr Event: Video Ended');
      this.onVideoEnded();
    });

    this.player.on('error', (error: any) => {
      console.error('Plyr Player Error:', error);
    });
  }

  switchToGoogleDriveIframe(url: string): void {
    if (this.player) {
      try {
        this.player.destroy();
      } catch (e) { }
    }
    const container = this.plyrContainer?.nativeElement;
    if (!container) return;

    this.clearWatchTimer();
    this.isDriveBlocked = false; // Reset block flag initially
    container.innerHTML = '';

    const previewUrl = this.getGoogleDrivePreviewUrl(url);

    // Create a wrapper for the iframe to ensure it stays in the website
    const wrapper = document.createElement('div');
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';
    wrapper.style.position = 'relative';
    wrapper.innerHTML = `<iframe src="${previewUrl}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen allow="autoplay"></iframe>`;
    container.appendChild(wrapper);

    // Track completion via the timer since we are in the website now
    this.isWatchingIframe = true;
    const duration = this.currentLesson.durationMinutes || 1;
    const totalSeconds = duration * 60;
    let elapsedSeconds = 0;

    this.watchTimer = setInterval(() => {
      elapsedSeconds++;
      this.autoCompleteProgress = (elapsedSeconds / totalSeconds) * 100;
      if (elapsedSeconds >= totalSeconds) {
        this.clearWatchTimer();
        this.markLessonComplete();
      }
    }, 1000);
  }

  onVideoError(event: any): void {
    console.error('Video error:', event);
    console.error('Video error code:', event.target.error?.code);
    console.error('Video error message:', event.target.error?.message);
  }

  onVideoLoad(event: any): void {
    console.log('Video loaded successfully');
  }

  onVideoEnded(): void {
    console.log('Video ended, marking lesson as complete');
    this.markLessonComplete();
  }

  checkForCertificate(): void {
    // 1. All lessons must be completed
    const allLessonsCompleted = this.lessons.length > 0 && this.lessons.every(lesson => lesson.isCompleted || lesson.IsCompleted);

    // 2. All quizzes must have at least one passing attempt
    const allQuizzesPassed = this.quizzes.length === 0 || this.quizzes.every(quiz => {
      const attempt = this.quizAttemptData[quiz.quizId];
      return attempt && attempt.attemptCount > 0 && attempt.bestScore >= quiz.passingScore;
    });

    console.log('Checking certificate eligibility:', {
      allLessonsCompleted,
      allQuizzesPassed,
      lessonCount: this.lessons.length,
      quizCount: this.quizzes.length,
      quizAttemptData: this.quizAttemptData
    });

    // Debug each quiz status
    if (this.quizzes.length > 0) {
      this.quizzes.forEach((quiz, index) => {
        const attempt = this.quizAttemptData[quiz.quizId];
        const isPassed = attempt && attempt.attemptCount > 0 && attempt.bestScore >= quiz.passingScore;
        console.log(`Quiz ${index + 1} (${quiz.title}):`, {
          hasAttempt: attempt && attempt.attemptCount > 0,
          bestScore: attempt?.bestScore || 0,
          passingScore: quiz.passingScore,
          isPassed: isPassed
        });
      });
    }

    if (allLessonsCompleted && allQuizzesPassed) {
      // Show completion message instead of certificate
      this.showCompletionMessage = true;
      this.showCertificateMessage = true;
      this.certificateMessage = 'Course complete! Collect your certificate from the student dashboard.';
      console.log('Course completed - redirect to dashboard for certificate');
    } else {
      // Hide completion message if not eligible
      this.showCertificateMessage = false;
      
      // Show message about what's missing
      if (!allLessonsCompleted) {
        console.log('Course not completed: Not all lessons completed');
      }
      if (!allQuizzesPassed) {
        console.log('Course not completed: Not all quizzes passed');
      }
    }
  }

  closeCompletionMessage(): void {
    this.showCertificateMessage = false;
  }

  // Quiz methods
  openQuiz(quiz: any): void {
    // Check if quiz is locked
    const lockStatus = this.isQuizLocked(quiz);
    if (lockStatus.locked) {
      this.openQuizLockedModal(lockStatus.message);
      return;
    }

    this.currentQuiz = quiz;
    this.quizAnswers = {};
    this.quizSubmitted = false;
    this.error = '';
    this.showQuizModal = true;

    console.log('Opening quiz:', quiz);

    // Load quiz details with questions
    this.quizService.getQuizById(quiz.quizId).subscribe({
      next: (response: any) => {
        console.log('Quiz response:', response);
        if (response.success && response.quiz) {
          this.currentQuiz = response.quiz;
          console.log('Current quiz loaded:', this.currentQuiz);
          console.log('Questions:', this.currentQuiz.questions);
          // Start quiz attempt
          this.quizService.startAttempt(quiz.quizId).subscribe({
            next: (attemptResponse: any) => {
              if (attemptResponse.success) {
                this.quizAttemptId = attemptResponse.attempt.attemptId;
                this.startQuizTimer();
              } else {
                this.error = attemptResponse.message || 'Failed to start quiz';
              }
            },
            error: (error: any) => {
              console.error('Error starting quiz:', error);
              this.error = 'Failed to start quiz';
            }
          });
        } else {
          this.error = response.message || 'Failed to load quiz';
        }
      },
      error: (error: any) => {
        console.error('Error loading quiz:', error);
        this.error = 'Failed to load quiz';
      }
    });
  }

  closeQuizModal(): void {
    this.stopQuizTimer();
    this.showQuizModal = false;
    this.currentQuiz = null;
    this.quizAnswers = {};
    this.quizSubmitted = false;
  }

  startQuizTimer(): void {
    if (!this.currentQuiz) return;
    
    this.quizTimeRemaining = this.currentQuiz.timeLimitMinutes * 60; // Convert to seconds
    this.quizStartTime = new Date();
    
    this.stopQuizTimer(); // Clear any existing timer
    
    this.quizTimer = setInterval(() => {
      this.quizTimeRemaining--;
      
      // Auto-submit when time runs out
      if (this.quizTimeRemaining <= 0) {
        this.stopQuizTimer();
        this.autoSubmitQuiz();
      }
    }, 1000);
  }

  stopQuizTimer(): void {
    if (this.quizTimer) {
      clearInterval(this.quizTimer);
      this.quizTimer = null;
    }
  }

  autoSubmitQuiz(): void {
    if (!this.quizSubmitted && this.quizAttemptId) {
      console.log('Time expired! Auto-submitting quiz...');
      this.submitQuiz();
    }
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  selectAnswer(questionId: number, optionIndex: number): void {
    this.quizAnswers[questionId] = optionIndex;
  }

  getOptionLabel(index: number): string {
    return String.fromCharCode(65 + index);
  }

  getAnswerCount(): number {
    return Object.keys(this.quizAnswers).length;
  }

  submitQuiz(): void {
    if (!this.quizAttemptId) return;

    this.quizService.submitAttempt(this.quizAttemptId, this.quizAnswers).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.quizScore = response.attempt.score;
          this.quizPassed = response.attempt.isPassed;
          this.quizSubmitted = true;

          // Update local quiz attempt data to ensure certificate logic works immediately
          this.quizAttemptData[this.currentQuiz.quizId] = {
            bestScore: Math.max(this.quizAttemptData[this.currentQuiz.quizId]?.bestScore || 0, response.attempt.score),
            attemptCount: (this.quizAttemptData[this.currentQuiz.quizId]?.attemptCount || 0) + 1
          };

          // Check for certificate after quiz submission
          this.checkForCertificate();
        } else {
          this.error = response.message || 'Failed to submit quiz';
        }
      },
      error: (error: any) => {
        console.error('Error submitting quiz:', error);
        this.error = 'Failed to submit quiz';
      }
    });
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard/student']);
  }
}
