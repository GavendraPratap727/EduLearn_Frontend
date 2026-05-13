import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  contactForm = {
    name: '',
    email: '',
    message: ''
  };

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Initialize AOS animations
    if (typeof (window as any).AOS !== 'undefined') {
      (window as any).AOS.init({
        duration: 800,
        easing: 'ease-in-out',
        once: true
      });
    }
  }

  navigateToCourses(): void {
    this.router.navigate(['/courses']);
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  navigateToRegister(): void {
    this.router.navigate(['/register']);
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  submitContactForm(): void {
    console.log('Contact form submitted:', this.contactForm);
    
    // Create form data for web3forms.com
    const formData = new FormData();
    formData.append('access_key', '8055d0be-c260-4299-a7bf-77fe827fd882');
    formData.append('name', this.contactForm.name);
    formData.append('email', this.contactForm.email);
    formData.append('message', this.contactForm.message);
    
    // Submit to web3forms.com
    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: formData
    })
    .then(response => {
      console.log('Form submitted successfully:', response);
      alert('Thank you! Your message has been sent successfully.');
      this.resetContactForm();
    })
    .catch(error => {
      console.error('Error submitting form:', error);
      alert('Sorry, there was an error sending your message. Please try again later.');
    });
  }

  resetContactForm(): void {
    this.contactForm = {
      name: '',
      email: '',
      message: ''
    };
  }
}
