import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { Https } from '../service/https';
import { Product } from '../shared/product.model';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-checkout',
  standalone: false,
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class Checkout implements OnInit {
  constructor(private https: Https, private router: Router, private location: Location) {}

  cartItems: any[] = [];
  subtotal: number = 0;
  shipping: number = 15;
  total: number = 0;
  paymentMethod: string = '';
  shippingMethod: string = 'standard';
  isScrollingDown: boolean = true;

  ngOnInit(): void {
    this.checkAuth();
    this.loadCart();
  }

  checkAuth(): void {
    const token = localStorage.getItem('accessToken');
    if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
      alert('Please sign in to checkout');
      this.router.navigate(['/signin']);
    }
  }

  loadCart(): void {
    const token = localStorage.getItem('accessToken');
    if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
      alert('Please login to checkout');
      this.router.navigate(['/signin']);
      return;
    }

    this.https.getCart().subscribe({
      next: (cart: any) => {
        if (!cart || !cart.products || cart.products.length === 0) {
          alert('Your cart is empty');
          this.router.navigate(['/cart']);
          return;
        }

        const productRequests = cart.products.map((item: any) =>
          this.https.getProductById(item.productId)
        );

        forkJoin(productRequests).subscribe({
          next: (productsData: any) => {
            const products = productsData as any[];
            this.cartItems = cart.products.map((cartItem: any, index: number) => ({
              product: products[index],
              quantity: cartItem.quantity,
            }));
            this.calculateTotal();
          },
          error: () => {
            alert('Failed to load product details');
            this.router.navigate(['/cart']);
          },
        });
      },
      error: (error) => {
        if (error.status === 401 || error.status === 404) {
          alert('Your cart is empty or session expired');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          localStorage.removeItem('hasCart');
          localStorage.removeItem('cartCount');
          localStorage.removeItem('hasCartNotification');
          this.router.navigate(['/signin']);
        } else {
          alert('Failed to load cart');
          this.router.navigate(['/cart']);
        }
      },
    });
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

  calculateTotal(): void {
    this.subtotal = this.cartItems.reduce((sum, item) => {
      if (item && item.product && item.product.price) {
        return sum + item.product.price.current * item.quantity;
      }
      return sum;
    }, 0);

    if (this.shippingMethod === 'standard') {
      this.shipping = 15;
    } else if (this.shippingMethod === 'express') {
      this.shipping = 30;
    } else if (this.shippingMethod === 'overnight') {
      this.shipping = 50;
    }

    this.total = this.subtotal + this.shipping;
  }

  getCurrency(): string {
    if (!this.cartItems || this.cartItems.length === 0) return 'USD';
    return this.cartItems[0]?.product?.price?.currency || 'USD';
  }

  placeOrder(): void {
    if (!this.paymentMethod) {
      alert('Please select a payment method');
      return;
    }

    if (!this.shippingMethod) {
      alert('Please select a shipping method');
      return;
    }

    if (this.cartItems.length === 0) {
      alert('Your cart is empty');
      return;
    }

    this.https.checkout().subscribe({
      next: () => {
        const orders = JSON.parse(localStorage.getItem('orders') || '[]');
        orders.push({
          _id: Date.now().toString(),
          items: this.cartItems,
          subtotal: this.subtotal,
          shipping: this.shipping,
          total: this.total,
          currency: this.getCurrency(),
          createdAt: new Date().toISOString(),
          paymentMethod: this.paymentMethod,
          shippingMethod: this.shippingMethod,
        });
        localStorage.setItem('orders', JSON.stringify(orders));
        localStorage.setItem('hasCart', 'false');
        localStorage.setItem('cartCount', '0');
        localStorage.setItem('hasCartNotification', 'false');

        alert('Payment successfully processed');
        this.router.navigate(['/orders']);
      },
      error: (error) => {
        if (error.status === 401) {
          alert('Your session has expired. Please login again');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          localStorage.removeItem('hasCart');
          localStorage.removeItem('cartCount');
          localStorage.removeItem('hasCartNotification');
          this.router.navigate(['/signin']);
        } else {
          const errorMsg = error.error?.error || 'Failed to process payment';
          alert(errorMsg);
        }
      },
    });
  }

  back(): void {
    this.location.back();
  }

  capitalizeTitle(title: string): string {
    if (!title) return '';
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
