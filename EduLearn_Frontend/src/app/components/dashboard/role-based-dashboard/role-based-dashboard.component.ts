import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-role-based-dashboard',
  template: '<router-outlet></router-outlet>'
})
export class RoleBasedDashboardComponent implements OnInit {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Debug: Check localStorage first
    const storedUser = localStorage.getItem('currentUser');
    console.log('Raw localStorage data:', storedUser);
    
    const currentUser = this.authService.getCurrentUser();
    
    if (!currentUser) {
      console.log('No current user found, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    // Debug: Log the current user and role
    console.log('Current user:', currentUser);
    console.log('User role:', currentUser.role);
    console.log('Role type:', typeof currentUser.role);
    console.log('JSON.stringify(currentUser):', JSON.stringify(currentUser));

    // Route based on user role - handle enum values (0=STUDENT, 1=INSTRUCTOR, 2=ADMIN)
    const userRole = currentUser.role;
    console.log('Raw role value:', userRole);
    console.log('Role type:', typeof userRole);
    
    // Convert enum to string for routing
    let roleString = '';
    if (userRole === 0 || userRole === '0' || userRole === 'STUDENT') {
      roleString = 'STUDENT';
    } else if (userRole === 1 || userRole === '1' || userRole === 'INSTRUCTOR') {
      roleString = 'INSTRUCTOR';
    } else if (userRole === 2 || userRole === '2' || userRole === 'ADMIN') {
      roleString = 'ADMIN';
    } else {
      roleString = 'STUDENT'; // Default
    }
    
    console.log('Final role string:', roleString);
    
    switch (roleString) {
      case 'STUDENT':
        console.log('Routing to student dashboard');
        this.router.navigate(['/dashboard/student']);
        break;
      case 'INSTRUCTOR':
        console.log('Routing to instructor dashboard');
        this.router.navigate(['/dashboard/instructor']);
        break;
      case 'ADMIN':
        console.log('Routing to admin dashboard');
        this.router.navigate(['/dashboard/admin']);
        break;
      default:
        console.log('Unknown role, defaulting to student dashboard');
        this.router.navigate(['/dashboard/student']); // Default to student
        break;
    }
  }
}
