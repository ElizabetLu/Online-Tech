import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { NgForm } from '@angular/forms';
import { Https } from '../service/https';
import { User } from '../shared/product.model';

@Component({
  selector: 'app-profile',
  standalone: false,
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit {
  user: User | null = null;
  editMode: boolean = false;
  showPasswordForm: boolean = false;
  showOldPassword: boolean = false;
  showNewPassword: boolean = false;
  isScrollingDown: boolean = true;

  editData = {
    firstName: '',
    lastName: '',
    age: 0,
    address: '',
    phone: '',
    zipcode: '',
    avatar: '',
    gender: '',
  };

  passwordData = {
    oldPassword: '',
    newPassword: '',
  };

  constructor(private https: Https, private router: Router, private location: Location) {}

  ngOnInit(): void {
    this.checkAuth();
    this.loadUser();
  }

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

  checkAuth(): void {
    const token = localStorage.getItem('accessToken');
    if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
      alert('Please sign in to view your profile');
      this.router.navigate(['/signin']);
    }
  }

  loadUser(): void {
    const token = localStorage.getItem('accessToken');

    if (!token || token === 'undefined' || token === 'null') {
      this.user = null;
      return;
    }

    this.https.getCurrentUser().subscribe({
      next: (user) => {
        this.user = user;
        localStorage.setItem('user', JSON.stringify(user));
        this.initializeEditData();
      },
      error: () => {
        this.user = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        this.router.navigate(['/signin']);
      },
    });
  }

  initializeEditData(): void {
    if (this.user) {
      this.editData = {
        firstName: this.user.firstName,
        lastName: this.user.lastName,
        age: this.user.age,
        address: this.user.address,
        phone: this.user.phone,
        zipcode: this.user.zipcode,
        avatar: this.user.avatar,
        gender: this.user.gender,
      };
    }
  }

  toggleEditMode(): void {
    this.editMode = !this.editMode;
    if (this.editMode) {
      this.initializeEditData();
    }
  }

  saveChanges(form: NgForm): void {
    if (form.invalid) {
      alert('Please fill all fields correctly');
      return;
    }

    const updateData = {
      firstName: this.editData.firstName.trim(),
      lastName: this.editData.lastName.trim(),
      age: Number(this.editData.age),
      address: this.editData.address.trim(),
      phone: this.editData.phone.trim(),
      zipcode: this.editData.zipcode.trim(),
      avatar: this.editData.avatar.trim(),
      gender: this.editData.gender as 'MALE' | 'FEMALE',
    };

    this.https.updateUser(updateData).subscribe({
      next: () => {
        alert('Profile updated successfully');
        this.editMode = false;
        this.loadUser();
      },
      error: (error) => {
        alert('Failed to update profile: ' + (error.error?.error || 'Unknown error'));
      },
    });
  }

  cancelEdit(): void {
    this.editMode = false;
    this.initializeEditData();
  }

  changePassword(form: NgForm): void {
    if (form.invalid) {
      alert('Please fill all fields correctly');
      return;
    }

    this.https
      .changePassword({
        oldPassword: this.passwordData.oldPassword,
        newPassword: this.passwordData.newPassword,
      })
      .subscribe({
        next: () => {
          alert('Password changed successfully');
          this.showPasswordForm = false;
          this.passwordData = { oldPassword: '', newPassword: '' };
        },
        error: (error) => {
          let errorMsg = 'Failed to change password';
          if (error.error?.errorKeys) {
            const errors = error.error.errorKeys;
            if (errors.includes('errors.old_password_incorrect')) {
              errorMsg = 'Old password is incorrect';
            } else if (errors.includes('errors.new_password_matches_old')) {
              errorMsg = 'New password must be different from old password';
            } else if (errors.includes('errors.password_too_short')) {
              errorMsg = 'Password must be at least 8 characters';
            }
          } else if (error.error?.error) {
            errorMsg = error.error.error;
          }
          alert(errorMsg);
        },
      });
  }

  cancelPasswordChange(): void {
    this.showPasswordForm = false;
    this.passwordData = { oldPassword: '', newPassword: '' };
  }

  deleteAccount(): void {
    if (confirm('Are you sure you want to delete the account?')) {
      this.https.deleteUser().subscribe({
        next: () => {
          alert('Account deleted successfully');
          localStorage.clear();
          this.router.navigate(['/']);
          window.location.reload();
        },
        error: (error) => {
          alert('Failed to delete account: ' + (error.error?.error || 'Unknown error'));
        },
      });
    }
  }

  back(): void {
    this.location.back();
  }

  capitalizeTitle(text: string): string {
    if (!text) return '';
    return text
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
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
