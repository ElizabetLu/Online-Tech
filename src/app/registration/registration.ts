import { Component, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { NgForm } from '@angular/forms';
import { Https } from '../service/https';

@Component({
  selector: 'app-registration',
  standalone: false,
  templateUrl: './registration.html',
  styleUrl: './registration.scss',
})
export class Registration {
  constructor(private https: Https, private router: Router, private location: Location) {}

  showPassword: boolean = false;
  showConfirmPassword: boolean = false;
  isScrollingDown: boolean = true;

  formData = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    age: null as number | null,
    address: '',
    phone: '',
    zipcode: '',
    avatar: '',
    gender: '',
  };

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    if (value.length >= 13) {
      const form = input.form;
      if (form) {
        const inputs = Array.from(form.querySelectorAll('input, select, textarea'));
        const currentIndex = inputs.indexOf(input);
        if (currentIndex < inputs.length - 1) {
          const nextInput = inputs[currentIndex + 1] as HTMLElement;
          nextInput.focus();
        }
      }
    }
  }

  onZipcode(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    if (value.length >= 10) {
      const form = input.form;
      if (form) {
        const inputs = Array.from(form.querySelectorAll('input, select, textarea'));
        const currentIndex = inputs.indexOf(input);
        if (currentIndex < inputs.length - 1) {
          const nextInput = inputs[currentIndex + 1] as HTMLElement;
          nextInput.focus();
        }
      }
    }
  }

  register(form: NgForm): void {
    if (form.invalid) {
      alert('Please fill all required fields correctly');
      return;
    }

    if (this.formData.password !== this.formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    const signupData = {
      firstName: this.formData.firstName.trim(),
      lastName: this.formData.lastName.trim(),
      email: this.formData.email.trim().toLowerCase(),
      password: this.formData.password,
      age: Number(this.formData.age),
      address: this.formData.address.trim(),
      phone: this.formData.phone.trim(),
      zipcode: this.formData.zipcode.trim(),
      avatar: this.formData.avatar.trim(),
      gender: this.formData.gender as 'MALE' | 'FEMALE',
    };

    this.https.signUp(signupData).subscribe({
      next: (response) => {
        alert('Your account is successfully registered');
        this.router.navigate(['/signin']);
      },
      error: (error) => {
        let errorMsg = 'Registration failed';
        if (error.error?.errorKeys) {
          const errors = error.error.errorKeys;
          if (errors.includes('errors.email_in_use')) {
            errorMsg = 'This email is already in use';
          } else if (errors.includes('errors.invalid_email')) {
            errorMsg = 'Invalid email format';
          } else if (errors.includes('errors.invalid_phone_number')) {
            errorMsg = 'Invalid phone number format. Use format: +[country code][number]';
          } else if (errors.includes('errors.password_too_short')) {
            errorMsg = 'Password must be at least 8 characters';
          } else if (errors.includes('errors.invalid_avatar')) {
            errorMsg = 'Invalid avatar URL';
          } else {
            errorMsg = errors.join(', ');
          }
        } else if (error.error?.error) {
          errorMsg = error.error.error;
        }
        alert(errorMsg);
      },
    });
  }

  back(): void {
    this.location.back();
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.updateScrollButton();
  }

  updateScrollButton(): void {
    const scrollY = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const scrollProgress = maxScroll > 0 ? scrollY / maxScroll : 0;
    this.isScrollingDown = scrollProgress <= 0.5;
  }

  handleScroll(): void {
    if (this.isScrollingDown) {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
