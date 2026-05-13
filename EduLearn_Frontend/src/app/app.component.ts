import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'EduLearn_Frontend';

  ngOnInit(): void {
    // Initialize AOS animations after component loads
    setTimeout(() => {
      if (typeof (window as any).AOS !== 'undefined') {
        (window as any).AOS.init({
          duration: 800,
          easing: 'ease-in-out',
          once: true,
          offset: 100
        });
      }
    }, 100);
  }
}
