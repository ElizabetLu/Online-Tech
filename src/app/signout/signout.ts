import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { User } from '../shared/product.model';

@Component({
  selector: 'app-signout',
  standalone: false,
  templateUrl: './signout.html',
  styleUrl: './signout.scss',
})
export class SignOut implements OnInit {
  constructor(private router: Router, private location: Location) {}

  user: User | null = null;

  ngOnInit(): void {
    this.loadUser();
  }

  loadUser(): void {
    const userData = localStorage.getItem('user');
    if (userData) {
      this.user = JSON.parse(userData);
    } else {
      this.router.navigate(['/']);
    }
  }

  signOut(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    alert('You have been signed out successfully');
    this.router.navigate(['/']);
  }

  cancel(): void {
    this.location.back();
  }

  back(): void {
    this.location.back();
  }
}
