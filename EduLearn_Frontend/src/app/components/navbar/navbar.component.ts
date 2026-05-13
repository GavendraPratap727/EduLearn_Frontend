import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  isScrolled = false;
  isMobileMenuOpen = false;
  currentUser: any = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
    window.addEventListener('scroll', this.onScroll);
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.onScroll);
  }

  onScroll = (): void => {
    this.isScrolled = window.scrollY > 50;
  };

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
    this.closeMobileMenu();
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: () => {
        this.router.navigate(['/login']);
      }
    });
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  getUserRole(): string {
    if (!this.currentUser) return 'Guest';
    
    // Debug: Log the role value (Commented out to prevent console spam)
    // console.log('Navbar - Current user role:', this.currentUser.role, 'Type:', typeof this.currentUser.role);
    
    // Handle both numeric and string role values
    const role = this.currentUser.role;
    
    if (role === 0 || role === '0' || role === 'STUDENT' || role === 'Student') {
      return 'Student';
    } else if (role === 1 || role === '1' || role === 'INSTRUCTOR' || role === 'Instructor') {
      return 'Instructor';
    } else if (role === 2 || role === '2' || role === 'ADMIN' || role === 'Admin') {
      return 'Admin';
    } else {
      console.log('Navbar - Unknown role value:', role, 'Defaulting to User');
      return 'User';
    }
  }
}
