import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { Product } from '../shared/product.model';

@Component({
  selector: 'app-orders',
  standalone: false,
  templateUrl: './orders.html',
  styleUrl: './orders.scss',
})
export class Orders implements OnInit {
  constructor(private location: Location, private router: Router) {}

  orders: any[] = [];
  selectedOrder: any = null;
  isScrollingDown: boolean = true;

  ngOnInit(): void {
    this.checkAuth();
    this.loadOrders();
  }

  checkAuth(): void {
    const token = localStorage.getItem('accessToken');
    if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
      alert('Please sign in to view your orders');
      this.router.navigate(['/signin']);
    }
  }

  loadOrders(): void {
    const ordersData = localStorage.getItem('orders');
    if (ordersData) {
      this.orders = JSON.parse(ordersData);
      this.orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }

  viewOrderDetails(order: any): void {
    this.selectedOrder = order;
  }

  closeOrderDetails(): void {
    this.selectedOrder = null;
  }

  viewProductDetails(product: Product): void {
    if (!product || !product._id) {
      return;
    }
    const categoryId = product.category?.id;
    if (categoryId === '1') {
      this.router.navigate(['/laptops', 'product', product._id]);
    } else if (categoryId === '2') {
      this.router.navigate(['/phones', 'product', product._id]);
    } else {
      this.router.navigate(['/product', product._id]);
    }
  }

  viewProductDetailsFromModal(product: Product): void {
    this.closeOrderDetails();
    this.viewProductDetails(product);
  }

  back(): void {
    this.location.back();
  }

  capitalizeTitle(title: string): string {
    return title
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
