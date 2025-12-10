import { Component, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { NgForm } from '@angular/forms';
import { Https } from '../service/https';

@Component({
  selector: 'app-signin',
  standalone: false,
  templateUrl: './signin.html',
  styleUrl: './signin.scss',
})
export class Signin {
  constructor(private https: Https, private router: Router, private location: Location) {}

  showPassword: boolean = false;
  isScrollingDown: boolean = true;
  showForgotPasswordModal: boolean = false;
  recoveryEmail: string = '';

  credentials = {
    email: '',
    password: '',
  };

  signin(form: NgForm): void {
    if (form.invalid) {
      alert('Please fill all required fields correctly');
      return;
    }

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('hasCart');

    const email = this.credentials.email.trim().toLowerCase();
    const password = this.credentials.password;

    if (!email || !password) {
      alert('Email and password cannot be empty');
      return;
    }

    const loginData = {
      email: email,
      password: password,
    };

    console.log('Attempting login with email:', email);

    this.https.signIn(loginData).subscribe({
      next: (response) => {
        console.log('Login successful:', response);

        if (!response || !response.access_token || !response.refresh_token) {
          alert('Login failed: Invalid response from server');
          return;
        }

        localStorage.setItem('accessToken', response.access_token);
        localStorage.setItem('refreshToken', response.refresh_token);

        this.https.getCurrentUser().subscribe({
          next: (user) => {
            console.log('User data:', user);

            if (!user.emailVerified && !user.verified) {
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              alert(
                "Account Not Verified!\n\nPlease check your email and verify your account before signing in.\n\nIf you didn't receive the verification email, please contact support."
              );
              return;
            }

            localStorage.setItem('user', JSON.stringify(user));
            alert('Login successful!');

            setTimeout(() => {
              this.router.navigate(['/']).then(() => {
                window.location.reload();
              });
            }, 500);
          },
          error: (userError) => {
            console.error('Failed to fetch user data:', userError);
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            alert('Verify your profile to sign in!');
          },
        });
      },
      error: (error) => {
        console.error('Login error details:', error);

        let errorMsg = 'Login failed';

        if (error.status === 400) {
          if (
            error.error?.message?.includes('password') ||
            error.error?.error?.includes('password')
          ) {
            errorMsg =
              'Password Issue!\n\n';
          } else if (error.error?.error === 'Invalid credentials') {
            errorMsg =
              'Invalid credentials!\n\n';
          } else if (error.error?.message) {
            errorMsg = error.error.message;
          } else {
            errorMsg =
              'Incorrect email or password. If you recently reset your password, please use the new password from your email.';
          }
        } else if (error.status === 403 && error.error?.error === 'Account not verified') {
          errorMsg =
            'Account Not Verified!\n\nPlease check your email and verify your account before signing in.';
        } else if (error.error?.errorKeys && Array.isArray(error.error.errorKeys)) {
          errorMsg = error.error.errorKeys.join(', ');
        } else if (error.error?.error) {
          errorMsg = error.error.error;
        } else if (error.error?.message) {
          errorMsg = error.error.message;
        }

        alert(errorMsg);
      },
    });
  }

  openForgotPasswordModal(): void {
    this.showForgotPasswordModal = true;
    this.recoveryEmail = '';
  }

  closeForgotPasswordModal(): void {
    this.showForgotPasswordModal = false;
    this.recoveryEmail = '';
  }

  sendPasswordRecovery(form: NgForm): void {
    if (form.invalid) {
      alert('Please enter a valid email address');
      return;
    }

    const email = this.recoveryEmail.trim().toLowerCase();

    console.log('Sending password recovery for:', email);

    this.https.recoverPassword(email).subscribe({
      next: (response) => {
        console.log('Password recovery response:', response);

        let message =
          'Please check your email for the new password.';

        if (response && response.message) {
          message = response.message + '\n\n' + message;
        }

        alert(message);

        this.closeForgotPasswordModal();

        this.credentials.email = email;
        this.credentials.password = '';
      },
      error: (error) => {
        console.error('Password recovery error:', error);

        let errorMsg = 'Failed to send recovery email';

        if (error.error?.errorKeys && Array.isArray(error.error.errorKeys)) {
          errorMsg = error.error.errorKeys.join(', ');
        } else if (error.error?.error) {
          errorMsg = error.error.error;
        } else if (error.error?.message) {
          errorMsg = error.error.message;
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
