import { Component, HostListener, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Location } from '@angular/common';
import { Https } from '../service/https';
import { Cart, CartProduct, Product } from '../shared/product.model';
import { filter } from 'rxjs/operators';
import { forkJoin } from 'rxjs';

interface Review {
  productId: string;
  rating: number;
}

@Component({
  selector: 'app-cart',
  standalone: false,
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
})
export class CartComponent implements OnInit {
  constructor(private https: Https, private location: Location, private router: Router) {}

  cart: Cart | null = null;
  isScrollingDown: boolean = true;

  ngOnInit(): void {
    this.checkAuth();
    localStorage.setItem('hasCartNotification', 'false');
    this.loadCart();
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      if (this.router.url === '/cart' || this.router.url.startsWith('/cart')) {
        localStorage.setItem('hasCartNotification', 'false');
        this.loadCart();
      }
    });
  }

  checkAuth(): void {
    const token = localStorage.getItem('accessToken');
    if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
      alert('Please sign in to view your cart');
      this.router.navigate(['/signin']);
    }
  }

  private handleAuthError(error: any): void {
    const message: string = error?.error?.error || '';
    const isTokenExpired =
      error.status === 400 &&
      typeof message === 'string' &&
      message.toLowerCase().includes('token expired');
    if (error.status === 401 || isTokenExpired) {
      alert('Your session has expired. Please sign in again');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('hasCart');
      localStorage.removeItem('cartCount');
      localStorage.removeItem('hasCartNotification');
      this.router.navigate(['/signin']);
    }
  }

  private syncCartState(apiCart: any | null): void {
    if (!apiCart || !apiCart.products || apiCart.products.length === 0) {
      localStorage.setItem('hasCart', 'false');
      localStorage.setItem('cartCount', '0');
      return;
    }
    const count = apiCart.products.reduce(
      (sum: number, item: any) => sum + (item.quantity || 0),
      0
    );
    localStorage.setItem('hasCart', count > 0 ? 'true' : 'false');
    localStorage.setItem('cartCount', String(count));
  }

  getReviewsCount(productId: string): number {
    const reviewsData = localStorage.getItem('reviews');
    if (!reviewsData) return 0;
    try {
      const allReviews: Review[] = JSON.parse(reviewsData);
      return allReviews.filter((r) => r.productId === productId).length;
    } catch (e) {
      return 0;
    }
  }

  loadCart(): void {
    const token = localStorage.getItem('accessToken');
    if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
      this.cart = null;
      this.syncCartState(null);
      return;
    }
    this.https.getCart().subscribe({
      next: (apiCart: any) => {
        if (!apiCart || !apiCart.products || apiCart.products.length === 0) {
          this.cart = null;
          this.syncCartState(null);
          return;
        }
        this.syncCartState(apiCart);
        const productRequests = apiCart.products.map((item: any) =>
          this.https.getProductById(item.productId)
        );
        forkJoin(productRequests).subscribe({
          next: (products) => {
            const p = products as any[];
            const normalizedProducts: CartProduct[] = apiCart.products.map(
              (item: any, index: number) => ({
                product: p[index],
                quantity: item.quantity,
              })
            );
            this.cart = {
              _id: apiCart._id,
              user: apiCart.userId ?? apiCart.user ?? '',
              products: normalizedProducts,
              total: apiCart.total?.price?.current ?? 0,
            };
          },
          error: (error) => {
            this.handleAuthError(error);
            this.cart = null;
          },
        });
      },
      error: (error) => {
        if (error.status !== 409 && error.status !== 404) {
          this.handleAuthError(error);
        }
        this.cart = null;
        this.syncCartState(null);
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

  increaseQuantity(event: Event, item: CartProduct): void {
    event.stopPropagation();
    if (!item || !item.product || !item.product._id) {
      return;
    }
    this.https.updateCartProduct({ id: item.product._id, quantity: item.quantity + 1 }).subscribe({
      next: (apiCart) => {
        this.syncCartState(apiCart);
        this.loadCart();
      },
      error: (error) => {
        this.handleAuthError(error);
        alert('Failed to update quantity');
      },
    });
  }

  decreaseQuantity(event: Event, item: CartProduct): void {
    event.stopPropagation();
    if (!item || !item.product || !item.product._id) {
      return;
    }
    if (item.quantity > 1) {
      this.https
        .updateCartProduct({ id: item.product._id, quantity: item.quantity - 1 })
        .subscribe({
          next: (apiCart) => {
            this.syncCartState(apiCart);
            this.loadCart();
          },
          error: (error) => {
            this.handleAuthError(error);
            alert('Failed to update quantity');
          },
        });
    }
  }

  removeItem(event: Event, item: CartProduct): void {
    event.stopPropagation();
    if (!item || !item.product || !item.product._id) {
      return;
    }
    if (confirm('Remove this item from cart?')) {
      this.https.deleteFromCart({ productId: item.product._id }).subscribe({
        next: (apiCart) => {
          this.syncCartState(apiCart);
          this.loadCart();
        },
        error: (error) => {
          this.handleAuthError(error);
          alert('Failed to remove item');
        },
      });
    }
  }

  getCartTotal(): number {
    if (!this.cart || !this.cart.products) return 0;
    return this.cart.products.reduce((sum, item) => {
      if (item && item.product && item.product.price) {
        return sum + item.product.price.current * item.quantity;
      }
      return sum;
    }, 0);
  }

  getCartCurrency(): string {
    if (!this.cart || !this.cart.products || this.cart.products.length === 0) return 'USD';
    const firstProduct = this.cart.products[0];
    return firstProduct?.product?.price?.currency || 'USD';
  }

  proceedToCheckout(): void {
    if (!this.cart || !this.cart.products || this.cart.products.length === 0) {
      alert('Your cart is empty');
      return;
    }
    localStorage.setItem('selectedCartItems', JSON.stringify(this.cart.products));
    this.router.navigate(['/checkout']);
  }

  clearCart(): void {
    if (confirm('Are you sure you want to clear your cart?')) {
      this.https.clearCart().subscribe({
        next: () => {
          localStorage.setItem('hasCart', 'false');
          localStorage.setItem('cartCount', '0');
          localStorage.setItem('hasCartNotification', 'false');
          this.cart = null;
        },
        error: (error) => {
          this.handleAuthError(error);
          alert('Failed to clear cart');
        },
      });
    }
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
