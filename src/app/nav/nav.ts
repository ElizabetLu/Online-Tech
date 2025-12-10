import { Component, OnInit, HostListener } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Https } from '../service/https';
import { User } from '../shared/product.model';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-nav',
  standalone: false,
  templateUrl: './nav.html',
  styleUrl: './nav.scss',
})
export class Nav implements OnInit {
  searchQuery: string = '';
  cartProducts: number = 0;
  isLoggedIn: boolean = false;
  user: User | null = null;
  userDropdownOpen: boolean = false;
  mobileMenuOpen: boolean = false;
  mobileSearchOpen: boolean = false;

  constructor(private https: Https, private router: Router) {}

  ngOnInit(): void {
    this.checkAuthStatus();
    this.cartCount();
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.checkAuthStatus();
      this.cartCount();
      this.closeMobileMenu();
      this.closeMobileSearch();
    });
  }

  private isTokenValid(token: string | null): boolean {
    return !!(token && token !== 'undefined' && token !== 'null' && token.trim() !== '');
  }

  checkAuthStatus(): void {
    const token = localStorage.getItem('accessToken');
    if (!this.isTokenValid(token)) {
      this.isLoggedIn = false;
      this.user = null;
      return;
    }
    this.isLoggedIn = true;

    this.https.getCurrentUser().subscribe({
      next: (user) => {
        this.user = user;
        this.isLoggedIn = true;
        localStorage.setItem('user', JSON.stringify(user));
      },
      error: () => {
        this.isLoggedIn = false;
        this.user = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('hasCart');
        localStorage.removeItem('cartCount');
        localStorage.removeItem('hasCartNotification');
      },
    });
  }

  cartCount(): void {
    const hasCart = localStorage.getItem('hasCart');
    if (hasCart === 'true') {
      const storedCount = localStorage.getItem('cartCount');
      this.cartProducts = storedCount ? parseInt(storedCount, 10) || 0 : 0;
    } else {
      this.cartProducts = 0;
    }
  }

  search(): void {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/search'], { queryParams: { q: this.searchQuery.trim() } });
      this.searchQuery = '';
      this.closeMobileSearch();
    }
  }

  toggleUserDropdown(): void {
    this.userDropdownOpen = !this.userDropdownOpen;
  }

  closeUserDropdown(): void {
    this.userDropdownOpen = false;
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    if (this.mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      this.closeMobileSearch();
    } else {
      document.body.style.overflow = '';
    }
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
    document.body.style.overflow = '';
  }

  toggleMobileSearch(): void {
    this.mobileSearchOpen = !this.mobileSearchOpen;
    if (this.mobileSearchOpen) {
      this.closeMobileMenu();
    }
  }

  closeMobileSearch(): void {
    this.mobileSearchOpen = false;
  }

  verifyEmail(): void {
    if (!this.user) return;
    this.https.verifyEmail(this.user.email).subscribe({
      next: () => {
        alert('Check your email for a link to verify your registration');
        this.closeUserDropdown();
        this.closeMobileMenu();
      },
      error: (error) => {
        const errorMsg = error.error?.error || 'Failed to send verification email';
        alert(errorMsg);
      },
    });
  }

  deleteAccount(): void {
    if (confirm('Are you sure you want to delete the account?')) {
      this.https.deleteUser().subscribe({
        next: () => {
          alert('Account deleted successfully');
          localStorage.clear();
          this.isLoggedIn = false;
          this.user = null;
          this.cartProducts = 0;
          this.userDropdownOpen = false;
          this.closeMobileMenu();
          this.router.navigate(['/']);
          window.location.reload();
        },
        error: (error) => {
          const errorMsg = error.error?.error || 'Failed to delete account';
          alert(errorMsg);
        },
      });
    }
  }

  logout(): void {
    this.https.signOut().subscribe({
      next: () => {
        this.performLogout();
      },
      error: () => {
        this.performLogout();
      },
    });
  }

  private performLogout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('hasCart');
    localStorage.removeItem('cartCount');
    localStorage.removeItem('hasCartNotification');
    this.isLoggedIn = false;
    this.user = null;
    this.cartProducts = 0;
    this.userDropdownOpen = false;
    this.closeMobileMenu();
    this.router.navigate(['/']);
    window.location.reload();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu')) {
      this.userDropdownOpen = false;
    }
  }
}
