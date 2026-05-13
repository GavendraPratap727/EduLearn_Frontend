import { Component, Input, OnInit } from '@angular/core';
import { LessonService } from '../../../services/lesson.service';
import { QuizService } from '../../../services/quiz.service';

@Component({
  selector: 'app-lesson-manager',
  templateUrl: './lesson-manager.component.html',
  styleUrls: ['./lesson-manager.component.css']
})
export class LessonManagerComponent implements OnInit {
  @Input() courseId: string = '';
  
  lessons: any[] = [];
  quizzes: any[] = [];
  loading = false;
  saving = false;
  error = '';
  
  showAddForm = false;
  showQuizForm = false;
  editingLesson: any = null;
  editingQuiz: any = null;
  
  newLesson = {
    title: '',
    description: '',
    contentType: 0, // 0=VIDEO, 1=ARTICLE, 2=PDF, 3=QUIZ_LINK
    contentUrl: '',
    durationMinutes: 0,
    displayOrder: 0,
    isPreview: false
  };

  newQuiz = {
    title: '',
    description: '',
    timeLimitMinutes: 30,
    passingScore: 70,
    maxAttempts: 3,
    questions: [] as any[]
  };

  contentTypes = [
    { value: 0, label: 'Video' },
    { value: 1, label: 'Article' },
    { value: 2, label: 'PDF' },
    { value: 3, label: 'Quiz Link' }
  ];

  constructor(
    private lessonService: LessonService,
    private quizService: QuizService
  ) {}

  ngOnInit(): void {
    if (this.courseId) {
      this.loadLessons();
      this.loadQuizzes();
    }
  }

  loadLessons(): void {
    this.loading = true;
    this.lessonService.getLessonsByCourse(this.courseId).subscribe({
      next: (response: any) => {
        const lessonList = response.lessons || response || [];
        this.lessons = (Array.isArray(lessonList) ? lessonList : []).map((l: any) => ({
          ...l,
          lessonId: l.lessonId || l.LessonId,
          courseId: l.courseId || l.CourseId,
          title: l.title || l.Title,
          description: l.description || l.Description,
          contentType: l.contentType !== undefined ? l.contentType : l.ContentType,
          contentUrl: l.contentUrl || l.ContentUrl,
          durationMinutes: l.durationMinutes !== undefined ? l.durationMinutes : l.DurationMinutes,
          displayOrder: l.displayOrder !== undefined ? l.displayOrder : l.DisplayOrder,
          isPreview: l.isPreview !== undefined ? l.isPreview : l.IsPreview,
          isPublished: l.isPublished !== undefined ? l.isPublished : l.IsPublished
        }));
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading lessons:', error);
        this.error = 'Failed to load lessons';
        this.loading = false;
      }
    });
  }

  loadQuizzes(): void {
    this.quizService.getQuizzesByCourse(this.courseId).subscribe({
      next: (response: any) => {
        const quizList = response.quizzes || response || [];
        this.quizzes = (Array.isArray(quizList) ? quizList : []).map((q: any) => ({
          ...q,
          quizId: q.quizId || q.QuizId,
          courseId: q.courseId || q.CourseId,
          title: q.title || q.Title,
          description: q.description || q.Description,
          timeLimitMinutes: q.timeLimitMinutes !== undefined ? q.timeLimitMinutes : q.TimeLimitMinutes,
          passingScore: q.passingScore !== undefined ? q.passingScore : q.PassingScore,
          maxAttempts: q.maxAttempts !== undefined ? q.maxAttempts : q.MaxAttempts,
          isPublished: q.isPublished !== undefined ? q.isPublished : q.IsPublished,
          questions: q.questions || q.Questions
        }));
      },
      error: (error: any) => {
        console.error('Error loading quizzes:', error);
      }
    });
  }

  showAddLessonForm(): void {
    this.showAddForm = true;
    this.editingLesson = null;
    this.resetNewLesson();
    // Set display order to next available
    this.newLesson.displayOrder = this.lessons.length;
  }

  showAddQuizForm(): void {
    this.showQuizForm = true;
    this.showAddForm = false;
    this.editingQuiz = null;
    this.resetNewQuiz();
  }

  showEditQuizForm(quiz: any): void {
    this.editingQuiz = quiz;
    this.showQuizForm = true;
    this.showAddForm = false;
    this.newQuiz = {
      title: quiz.title,
      description: quiz.description || '',
      timeLimitMinutes: quiz.timeLimitMinutes,
      passingScore: quiz.passingScore,
      maxAttempts: quiz.maxAttempts,
      questions: quiz.questions || []
    };
  }

  hideQuizForm(): void {
    this.showQuizForm = false;
    this.editingQuiz = null;
    this.resetNewQuiz();
  }

  resetNewQuiz(): void {
    this.newQuiz = {
      title: '',
      description: '',
      timeLimitMinutes: 30,
      passingScore: 70,
      maxAttempts: 3,
      questions: []
    };
  }

  showEditLessonForm(lesson: any): void {
    this.editingLesson = lesson;
    this.newLesson = {
      title: lesson.title,
      description: lesson.description || '',
      contentType: lesson.contentType,
      contentUrl: lesson.contentUrl || '',
      durationMinutes: lesson.durationMinutes,
      displayOrder: lesson.displayOrder,
      isPreview: lesson.isPreview
    };
    this.showAddForm = true;
  }

  hideForm(): void {
    this.showAddForm = false;
    this.editingLesson = null;
    this.resetNewLesson();
  }

  resetNewLesson(): void {
    this.newLesson = {
      title: '',
      description: '',
      contentType: 0,
      contentUrl: '',
      durationMinutes: 0,
      displayOrder: this.lessons.length,
      isPreview: false
    };
  }

  saveLesson(): void {
    this.saving = true;
    this.error = '';

    const lessonData = {
      courseId: this.courseId,
      title: this.newLesson.title,
      description: this.newLesson.description,
      contentType: this.newLesson.contentType,
      contentUrl: this.newLesson.contentUrl,
      durationMinutes: this.newLesson.durationMinutes,
      displayOrder: this.newLesson.displayOrder,
      isPreview: this.newLesson.isPreview
    };

    if (this.editingLesson) {
      const lessonId = this.editingLesson.lessonId || this.editingLesson.LessonId;
      this.lessonService.updateLesson(lessonId, lessonData).subscribe({
        next: (response: any) => {
          this.saving = false;
          if (response.success) {
            this.loadLessons();
            this.hideForm();
          } else {
            this.error = response.message || 'Failed to update lesson';
          }
        },
        error: (error: any) => {
          console.error('Error updating lesson:', error);
          this.saving = false;
          this.error = 'Failed to update lesson';
        }
      });
    } else {
      this.lessonService.createLesson(lessonData).subscribe({
        next: (response: any) => {
          this.saving = false;
          if (response.success) {
            this.loadLessons();
            this.hideForm();
          } else {
            this.error = response.message || 'Failed to create lesson';
          }
        },
        error: (error: any) => {
          console.error('Error creating lesson:', error);
          this.saving = false;
          this.error = 'Failed to create lesson';
        }
      });
    }
  }

  deleteLesson(lessonId: string): void {
    if (!confirm('Are you sure you want to delete this lesson?')) {
      return;
    }

    this.lessonService.deleteLesson(lessonId).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.loadLessons();
        } else {
          this.error = response.message || 'Failed to delete lesson';
        }
      },
      error: (error: any) => {
        console.error('Error deleting lesson:', error);
        this.error = 'Failed to delete lesson';
      }
    });
  }

  moveLessonUp(index: number): void {
    if (index === 0) return;
    
    const temp = this.lessons[index];
    this.lessons[index] = this.lessons[index - 1];
    this.lessons[index - 1] = temp;
    
    this.updateDisplayOrders();
  }

  moveLessonDown(index: number): void {
    if (index === this.lessons.length - 1) return;
    
    const temp = this.lessons[index];
    this.lessons[index] = this.lessons[index + 1];
    this.lessons[index + 1] = temp;
    
    this.updateDisplayOrders();
  }

  updateDisplayOrders(): void {
    this.lessons.forEach((lesson, index) => {
      lesson.displayOrder = index;
      const lessonId = lesson.lessonId || lesson.LessonId;
      this.lessonService.updateLesson(lessonId, {
        title: lesson.title,
        description: lesson.description,
        contentType: lesson.contentType,
        contentUrl: lesson.contentUrl,
        durationMinutes: lesson.durationMinutes,
        isPreview: lesson.isPreview
      }).subscribe();
    });
  }

  getContentTypeLabel(value: number): string {
    const type = this.contentTypes.find(t => t.value === value);
    return type ? type.label : 'Unknown';
  }

  trackByLessonId(index: number, lesson: any): string {
    return lesson.lessonId || lesson.LessonId;
  }

  trackByQuizId(index: number, quiz: any): string {
    return quiz.quizId || quiz.QuizId;
  }

  trackByQuestionId(index: number, question: any): number {
    return question.questionId;
  }

  trackByOptionIndex(index: number, option: any): number {
    return index;
  }

  // Quiz question management
  addQuestion(): void {
    const newQuestion = {
      questionId: this.newQuiz.questions.length + 1,
      questionText: '',
      options: ['', '', '', ''],
      correctAnswer: null
    };
    this.newQuiz.questions.push(newQuestion);
  }

  removeQuestion(index: number): void {
    if (this.newQuiz.questions.length > 1) {
      this.newQuiz.questions.splice(index, 1);
      // Re-index questions
      this.newQuiz.questions.forEach((q, i) => q.questionId = i + 1);
    }
  }

  updateQuestionText(index: number, text: string): void {
    this.newQuiz.questions[index].questionText = text;
  }

  updateQuestionOption(questionIndex: number, optionIndex: number, value: string): void {
    this.newQuiz.questions[questionIndex].options[optionIndex] = value;
  }

  setCorrectAnswer(questionIndex: number, optionIndex: number): void {
    this.newQuiz.questions[questionIndex].correctAnswer = optionIndex;
  }

  // Quiz CRUD operations
  saveQuiz(): void {
    this.saving = true;
    this.error = '';

    console.log('Saving quiz with data:', this.newQuiz);

    // Validate quiz
    if (!this.newQuiz.title || this.newQuiz.questions.length === 0) {
      this.error = 'Quiz must have a title and at least one question';
      this.saving = false;
      return;
    }

    // Validate questions
    for (let i = 0; i < this.newQuiz.questions.length; i++) {
      const question = this.newQuiz.questions[i];
      if (!question.questionText || question.options.some((opt: string) => !opt.trim())) {
        this.error = `Question ${i + 1} is incomplete. Please fill in the question text and all options.`;
        this.saving = false;
        return;
      }
      if (question.correctAnswer === null || question.correctAnswer === undefined) {
        this.error = `Question ${i + 1} must have a correct answer selected.`;
        this.saving = false;
        return;
      }
    }

    const quizData = {
      courseId: this.courseId,
      title: this.newQuiz.title,
      description: this.newQuiz.description,
      timeLimitMinutes: this.newQuiz.timeLimitMinutes,
      passingScore: this.newQuiz.passingScore,
      maxAttempts: this.newQuiz.maxAttempts,
      questions: this.newQuiz.questions
    };

    console.log('Course ID:', this.courseId);
    console.log('Course ID type:', typeof this.courseId);
    console.log('Sending quiz data to backend:', quizData);

    if (this.editingQuiz) {
      this.quizService.updateQuiz(this.editingQuiz.quizId, quizData).subscribe({
        next: (response: any) => {
          console.log('Update quiz response:', response);
          this.saving = false;
          if (response.success) {
            this.loadQuizzes();
            this.hideQuizForm();
          } else {
            this.error = response.message || 'Failed to update quiz';
          }
        },
        error: (error: any) => {
          console.error('Error updating quiz:', error);
          this.saving = false;
          this.error = 'Failed to update quiz: ' + error.message;
        }
      });
    } else {
      this.quizService.createQuiz(quizData).subscribe({
        next: (response: any) => {
          console.log('Create quiz response:', response);
          this.saving = false;
          if (response.success) {
            this.loadQuizzes();
            this.hideQuizForm();
          } else {
            this.error = response.message || 'Failed to create quiz';
          }
        },
        error: (error: any) => {
          console.error('Error creating quiz:', error);
          this.saving = false;
          this.error = 'Failed to create quiz: ' + error.message;
        }
      });
    }
  }

  deleteQuiz(quizId: string): void {
    if (!confirm('Are you sure you want to delete this quiz?')) {
      return;
    }

    this.quizService.deleteQuiz(quizId).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.loadQuizzes();
        } else {
          this.error = response.message || 'Failed to delete quiz';
        }
      },
      error: (error: any) => {
        console.error('Error deleting quiz:', error);
        this.error = 'Failed to delete quiz';
      }
    });
  }

  publishQuiz(quizId: string): void {
    this.quizService.publishQuiz(quizId).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.loadQuizzes();
        } else {
          this.error = response.message || 'Failed to publish quiz';
        }
      },
      error: (error: any) => {
        console.error('Error publishing quiz:', error);
        this.error = 'Failed to publish quiz';
      }
    });
  }
}
