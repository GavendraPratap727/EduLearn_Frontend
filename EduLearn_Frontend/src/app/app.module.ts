import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// Components
import { NavbarComponent } from './components/navbar/navbar.component';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/auth/login/login.component';
import { RegisterComponent } from './components/auth/register/register.component';
import { CourseListComponent } from './components/courses/course-list/course-list.component';
import { CourseDetailComponent } from './components/courses/course-detail/course-detail.component';
import { StudentDashboardComponent } from './components/dashboard/student-dashboard/student-dashboard.component';
import { InstructorDashboardComponent } from './components/dashboard/instructor-dashboard/instructor-dashboard.component';
import { AdminDashboardComponent } from './components/dashboard/admin-dashboard/admin-dashboard.component';
import { RoleBasedDashboardComponent } from './components/dashboard/role-based-dashboard/role-based-dashboard.component';
import { RazorpayPaymentComponent } from './components/payment/razorpay-payment/razorpay-payment.component';
import { CourseFormComponent } from './components/instructor/course-form/course-form.component';
import { LessonManagerComponent } from './components/instructor/lesson-manager/lesson-manager.component';
import { CourseLearningComponent } from './components/courses/course-learning/course-learning.component';
import { CertificateVerificationComponent } from './components/certificate-verification/certificate-verification.component';

@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    HomeComponent,
    LoginComponent,
    RegisterComponent,
    CourseListComponent,
    CourseDetailComponent,
    StudentDashboardComponent,
    InstructorDashboardComponent,
    AdminDashboardComponent,
    RoleBasedDashboardComponent,
    RazorpayPaymentComponent,
    CourseFormComponent,
    LessonManagerComponent,
    CourseLearningComponent,
    CertificateVerificationComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    BrowserAnimationsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
