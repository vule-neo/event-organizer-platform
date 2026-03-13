import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css'
})
export class ContactComponent {
  form = { name: '', email: '', topic: '', message: '' };
  submitting = false;
  sent = false;

  submitForm() {
    if (!this.form.name || !this.form.email || !this.form.topic || !this.form.message) return;
    this.submitting = true;
    // Simulate API call — replace with real HTTP call when backend endpoint is ready
    setTimeout(() => {
      this.submitting = false;
      this.sent = true;
    }, 1200);
  }
}