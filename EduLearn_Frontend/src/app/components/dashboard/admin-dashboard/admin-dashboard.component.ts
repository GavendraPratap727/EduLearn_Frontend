import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { CourseService } from '../../../services/course.service';
import { EnrollmentService } from '../../../services/enrollment.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  currentUser: any = null;
  recentCourses: any[] = [];
  recentUsers: any[] = [];
  instructors: any[] = [];
  students: any[] = [];
  filteredInstructors: any[] = [];
  filteredStudents: any[] = [];
  pendingApprovals: any[] = [];
  searchQuery: string = '';
  stats = {
    totalUsers: 0,
    totalCourses: 0,
    totalEnrollments: 0,
    totalRevenue: 0,
    activeUsers: 0,
    pendingCourses: 0
  };
  loading = true;
  error = '';
  
  // Instructor creation properties
  showInstructorModal = false;
  creatingInstructor = false;
  instructorForm = {
    fullName: '',
    email: '',
    password: ''
  };

  constructor(
    private router: Router,
    private authService: AuthService,
    private courseService: CourseService,
    private enrollmentService: EnrollmentService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadAdminData();
  }

  loadAdminData(): void {
    this.loading = true;
    
    // Load platform statistics
    this.loadPlatformStats();
    
    // Load recent courses
    this.courseService.getRecentCourses(5).subscribe({
      next: (response) => {
        this.recentCourses = response.courses || [];
      },
      error: (error) => {
        console.error('Error loading recent courses:', error);
      }
    });

    // Load recent users and categorize them
    this.authService.getRecentUsers(50).subscribe({
      next: (response) => {
        this.recentUsers = response.users || [];
        this.categorizeUsers();
      },
      error: (error) => {
        console.error('Error loading recent users:', error);
        // Fallback: categorize existing recent users
        this.categorizeUsers();
      }
    });

    // Load pending course approvals
    this.courseService.getPendingCourses().subscribe({
      next: (response) => {
        this.pendingApprovals = response.courses || response.Courses || [];
        this.stats.pendingCourses = this.pendingApprovals.length;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading pending courses:', error);
        this.error = 'Failed to load pending courses. Please ensure you have admin privileges.';
        this.loading = false;
      }
    });
  }

  loadPlatformStats(): void {
    // Load comprehensive platform statistics
    this.courseService.getPlatformStats().subscribe({
      next: (response) => {
        this.stats.totalCourses = response.totalCourses || 0;
        this.stats.totalEnrollments = response.totalEnrollments || 0;
        this.stats.totalRevenue = response.totalRevenue || 0;
        this.stats.activeUsers = response.activeUsers || 0;
      },
      error: (error) => {
        console.error('Error loading platform stats:', error);
      }
    });

    // Calculate total users from actual data instead of mock endpoint
    this.calculateTotalUsers();
  }

  approveCourse(courseId: string): void {
    this.courseService.approveCourse(courseId).subscribe({
      next: () => {
        this.pendingApprovals = this.pendingApprovals.filter(c => (c.courseId || c.CourseId) !== courseId);
        this.stats.pendingCourses = this.pendingApprovals.length;
      },
      error: (error) => {
        console.error('Error approving course:', error);
      }
    });
  }

  rejectCourse(courseId: string): void {
    this.courseService.rejectCourse(courseId).subscribe({
      next: () => {
        this.pendingApprovals = this.pendingApprovals.filter(c => (c.courseId || c.CourseId) !== courseId);
        this.stats.pendingCourses = this.pendingApprovals.length;
      },
      error: (error) => {
        console.error('Error rejecting course:', error);
      }
    });
  }

  deleteCourse(courseId: string): void {
    if (confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      this.courseService.deleteCourse(courseId).subscribe({
        next: () => {
          this.recentCourses = this.recentCourses.filter(c => (c.courseId || c.id) !== courseId);
          this.stats.totalCourses = Math.max(0, this.stats.totalCourses - 1);
        },
        error: (error) => {
          console.error('Error deleting course:', error);
          alert('Failed to delete course. Please try again.');
        }
      });
    }
  }

  showCreateInstructorModal(): void {
    this.showInstructorModal = true;
    this.instructorForm = {
      fullName: '',
      email: '',
      password: ''
    };
  }

  hideCreateInstructorModal(): void {
    this.showInstructorModal = false;
    this.instructorForm = {
      fullName: '',
      email: '',
      password: ''
    };
  }

  createInstructor(): void {
    if (!this.instructorForm.fullName || !this.instructorForm.email || !this.instructorForm.password) {
      alert('Please fill in all fields');
      return;
    }

    this.creatingInstructor = true;
    
    const instructorData = {
      fullName: this.instructorForm.fullName,
      email: this.instructorForm.email,
      password: this.instructorForm.password,
      role: 'INSTRUCTOR'
    };

    this.authService.createUser(
      this.instructorForm.email,
      this.instructorForm.password,
      this.instructorForm.fullName,
      'INSTRUCTOR'
    ).subscribe({
      next: (response: any) => {
        this.creatingInstructor = false;
        if (response.success) {
          alert('Instructor account created successfully!');
          this.hideCreateInstructorModal();
          
          // Add the new instructor to recent users list
          const newInstructor = {
            id: response.user?.id || response.user?.Id || this.instructorForm.email,
            fullName: response.user?.fullName || response.user?.FullName || this.instructorForm.fullName,
            email: response.user?.email || response.user?.Email || this.instructorForm.email,
            role: response.user?.role || response.user?.Role || 'INSTRUCTOR',
            createdAt: response.user?.createdAt || response.user?.CreatedAt || new Date().toISOString()
          };
          this.recentUsers.unshift(newInstructor);
          this.categorizeUsers(); // This will update both instructors and filteredInstructors
          
          // Ensure current admin user data is preserved
          this.currentUser = this.authService.getCurrentUser();
        } else {
          alert('Failed to create instructor: ' + (response.message || 'Unknown error'));
        }
      },
      error: (error: any) => {
        this.creatingInstructor = false;
        console.error('Error creating instructor:', error);
        alert('Failed to create instructor. Please try again.');
      }
    });
  }

  // User management methods
  categorizeUsers(): void {
    this.instructors = [];
    this.students = [];
    
    this.recentUsers.forEach(user => {
      const userRole = (user.role || '').toUpperCase();
      const isActive = user.isActive !== false; // Default to active if not specified
      
      if (userRole === 'INSTRUCTOR'.toUpperCase() || userRole === 'INSTRUCTOR') {
        this.instructors.push({ ...user, isActive });
      } else if (userRole === 'STUDENT'.toUpperCase() || userRole === 'STUDENT') {
        this.students.push({ ...user, isActive });
      }
    });
    
    // Initialize filtered arrays
    this.filteredInstructors = [...this.instructors];
    this.filteredStudents = [...this.students];
    
    // Update total users count based on actual data
    this.calculateTotalUsers();
  }

  calculateTotalUsers(): void {
    this.stats.totalUsers = this.recentUsers.length;
  }

  filterUsers(): void {
    const query = this.searchQuery.toLowerCase().trim();
    
    if (!query) {
      // If search is empty, show all users
      this.filteredInstructors = [...this.instructors];
      this.filteredStudents = [...this.students];
      return;
    }
    
    // Filter instructors
    this.filteredInstructors = this.instructors.filter(user => 
      user.fullName.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
    
    // Filter students
    this.filteredStudents = this.students.filter(user => 
      user.fullName.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  }

  toggleUserStatus(user: any): void {
    const action = user.isActive ? 'deactivate' : 'activate';
    const confirmMessage = `Are you sure you want to ${action} ${user.fullName}?`;
    
    if (confirm(confirmMessage)) {
      this.authService.toggleUserStatus(user.id, !user.isActive).subscribe({
        next: (response: any) => {
          if (response.success) {
            user.isActive = !user.isActive;
            alert(`User ${action}d successfully!`);
          } else {
            alert(`Failed to ${action} user: ${response.message || 'Unknown error'}`);
          }
        },
        error: (error: any) => {
          console.error(`Error ${action}ing user:`, error);
          alert(`Failed to ${action} user. Please try again.`);
        }
      });
    }
  }

  deleteUser(user: any): void {
    const confirmMessage = `Are you sure you want to delete ${user.fullName}? This action cannot be undone.`;
    
    if (confirm(confirmMessage)) {
      this.authService.deleteUser(user.id).subscribe({
        next: (response: any) => {
          if (response.success) {
            // Remove user from appropriate array
            if (user.role.toUpperCase() === 'INSTRUCTOR') {
              this.instructors = this.instructors.filter(u => u.id !== user.id);
            } else if (user.role.toUpperCase() === 'STUDENT') {
              this.students = this.students.filter(u => u.id !== user.id);
            }
            this.recentUsers = this.recentUsers.filter(u => u.id !== user.id);
            this.categorizeUsers(); // This will update both arrays and filtered arrays
            alert('User deleted successfully!');
          } else {
            alert('Failed to delete user: ' + (response.message || 'Unknown error'));
          }
        },
        error: (error: any) => {
          console.error('Error deleting user:', error);
          alert('Failed to delete user. Please try again.');
        }
      });
    }
  }

  viewUserDetails(userId: string): void {
    // Navigate to user management page or show user details modal
    this.router.navigate(['/admin/users', userId]);
  }

  viewCourseDetails(courseId: string): void {
    // Navigate to course details page
    this.router.navigate(['/courses', courseId]);
  }

  manageAllCourses(): void {
    // Navigate to course list page
    this.router.navigate(['/courses']);
  }

  manageAllUsers(): void {
    // Navigate to user management page
    this.router.navigate(['/admin/users']);
  }
}
