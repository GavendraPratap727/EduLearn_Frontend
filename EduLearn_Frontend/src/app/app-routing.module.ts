import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/auth/login/login.component';
import { RegisterComponent } from './components/auth/register/register.component';
import { CourseListComponent } from './components/courses/course-list/course-list.component';
import { CourseDetailComponent } from './components/courses/course-detail/course-detail.component';
import { RoleBasedDashboardComponent } from './components/dashboard/role-based-dashboard/role-based-dashboard.component';
import { StudentDashboardComponent } from './components/dashboard/student-dashboard/student-dashboard.component';
import { InstructorDashboardComponent } from './components/dashboard/instructor-dashboard/instructor-dashboard.component';
import { AdminDashboardComponent } from './components/dashboard/admin-dashboard/admin-dashboard.component';
import { CourseFormComponent } from './components/instructor/course-form/course-form.component';
import { CourseLearningComponent } from './components/courses/course-learning/course-learning.component';
import { CertificateVerificationComponent } from './components/certificate-verification/certificate-verification.component';

const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'courses', component: CourseListComponent },
  { path: 'courses/:id', component: CourseDetailComponent },
  { path: 'courses/:id/learn', component: CourseLearningComponent },
  { path: 'dashboard', component: RoleBasedDashboardComponent },
  { path: 'dashboard/student', component: StudentDashboardComponent },
  { path: 'dashboard/instructor', component: InstructorDashboardComponent },
  { path: 'dashboard/admin', component: AdminDashboardComponent },
  { path: 'instructor/create-course', component: CourseFormComponent },
  { path: 'instructor/edit-course/:id', component: CourseFormComponent },
  { path: 'verify-certificate', component: CertificateVerificationComponent },
  { path: '**', redirectTo: '/home' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
