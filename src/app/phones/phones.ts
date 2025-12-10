import { Component, HostListener, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Location } from '@angular/common';
import { filter } from 'rxjs/operators';
import { Https } from '../service/https';
import { Product, Cart } from '../shared/product.model';

interface Review {
  productId: string;
  rating: number;
}

@Component({
  selector: 'app-phones',
  standalone: false,
  templateUrl: './phones.html',
  styleUrl: './phones.scss',
})
export class Phones implements OnInit {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  brands: string[] = [];
  searchText: string = '';
  selectedBrand: string = '';
  minPrice: number = 0;
  maxPrice: number = 1000;
  selectedRating: string = '';
  sortOrder: string = '';
  sortRating: string = '';
  isAddingToCart: boolean = false;
  showCards: boolean = true;
  isScrollingDown: boolean = true;

  constructor(private https: Https, private router: Router, private location: Location) {}

  ngOnInit(): void {
    this.loadBrands();
    this.loadProducts();
    this.watchRouteChanges();
  }

  loadBrands(): void {
    this.https.getBrands().subscribe({
      next: (brands) => {
        this.brands = brands.filter((brand) => brand && brand.trim() !== '');
      },
      error: () => {
        this.brands = [];
      },
    });
  }

  calculateCombinedRating(product: Product): number {
    const apiRating = product.rating || 0;
    const reviewsData = localStorage.getItem('reviews');
    if (!reviewsData) return apiRating;
    try {
      const allReviews: Review[] = JSON.parse(reviewsData);
      const localReviews = allReviews.filter((r) => r.productId === product._id);
      if (localReviews.length === 0) return apiRating;
      const sumOfLocalRatings = localReviews.reduce((sum, review) => sum + review.rating, 0);
      return (apiRating + sumOfLocalRatings) / (1 + localReviews.length);
    } catch (e) {
      return apiRating;
    }
  }

  updateProductsWithRatings(products: Product[]): Product[] {
    return products.map((product) => ({
      ...product,
      rating: this.calculateCombinedRating(product),
    }));
  }

  loadProducts(): void {
    this.https.getProductsByCategory('2', 1, 100).subscribe({
      next: (response) => {
        this.products = this.updateProductsWithRatings(response.products || []);
        if (this.products.length > 0) {
          const prices = this.products.map((p) => p.price.current);
          const min = Math.min(...prices);
          const max = Math.max(...prices);
          this.minPrice = Math.floor(min);
          this.maxPrice = Math.ceil(max);
        }
        this.filter();
      },
      error: () => {
        this.products = [];
        this.filteredProducts = [];
      },
    });
  }

  watchRouteChanges(): void {
    this.showCards = !this.router.url.includes('/phones/product/');
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      this.showCards = !this.router.url.includes('/phones/product/');
    });
  }

  filter(): void {
    let result = [...this.products];
    if (this.searchText.trim()) {
      const q = this.searchText.trim().toLowerCase();
      result = result.filter((p) => p.title.toLowerCase().includes(q));
    }
    if (this.selectedBrand) {
      result = result.filter((p) => p.brand === this.selectedBrand);
    }
    result = result.filter(
      (p) => p.price.current >= this.minPrice && p.price.current <= this.maxPrice
    );
    if (this.selectedRating) {
      const r = Number(this.selectedRating);
      if (r === 5) {
        result = result.filter((p) => p.rating === 5.0);
      } else {
        result = result.filter((p) => p.rating >= r && p.rating < r + 1);
      }
    }
    if (this.sortOrder === 'asc') {
      result.sort((a, b) => a.price.current - b.price.current);
    } else if (this.sortOrder === 'desc') {
      result.sort((a, b) => b.price.current - a.price.current);
    }
    if (this.sortRating === 'asc') {
      result.sort((a, b) => a.rating - b.rating);
    } else if (this.sortRating === 'desc') {
      result.sort((a, b) => b.rating - a.rating);
    }
    this.filteredProducts = result;
  }

  reset(): void {
    this.searchText = '';
    this.selectedBrand = '';
    this.selectedRating = '';
    this.sortOrder = '';
    this.sortRating = '';
    if (this.products.length > 0) {
      const prices = this.products.map((p) => p.price.current);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      this.minPrice = Math.floor(min);
      this.maxPrice = Math.ceil(max);
    } else {
      this.minPrice = 0;
      this.maxPrice = 1000;
    }
    this.filter();
  }

  private handleAuthError(error: any): boolean {
    const message: string = error?.error?.error || '';
    const isTokenExpired =
      error.status === 400 &&
      typeof message === 'string' &&
      message.toLowerCase().includes('token expired');
    if (error.status === 401 || isTokenExpired) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('hasCart');
      localStorage.removeItem('cartCount');
      localStorage.removeItem('hasCartNotification');
      this.router.navigate(['/signin']);
      return true;
    }
    return false;
  }

  private syncCartState(cart: Cart): void {
    const count = cart.products
      ? cart.products.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)
      : 0;
    localStorage.setItem('hasCart', count > 0 ? 'true' : 'false');
    localStorage.setItem('cartCount', String(count));
    localStorage.setItem('hasCartNotification', 'true');
  }

  isOutOfStock(product: Product): boolean {
    return !product.stock || product.stock <= 0;
  }

  addToCart(event: Event, product: Product): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.isAddingToCart) return;
    if (this.isOutOfStock(product)) {
      alert('Sorry, this product is out of stock');
      return;
    }
    const token = localStorage.getItem('accessToken');
    if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
      alert('Please login to add items to cart');
      this.router.navigate(['/signin']);
      return;
    }
    this.isAddingToCart = true;
    this.https.addOrUpdateCart({ id: product._id, quantity: 1 }).subscribe({
      next: (cart) => {
        this.syncCartState(cart);
        alert('Product added to cart successfully!');
        this.isAddingToCart = false;
      },
      error: (error) => {
        this.isAddingToCart = false;
        if (!this.handleAuthError(error)) {
          const msg = error.error?.error || 'Failed to add to cart';
          alert(msg);
        }
      },
    });
  }

  capitalizeTitle(title: string): string {
    return title
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  capitalizeBrand(brand: string): string {
    if (!brand) return '';
    return brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
  }

  back(): void {
    this.router.navigate(['']);
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
