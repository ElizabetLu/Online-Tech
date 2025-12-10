import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Https } from '../service/https';
import { Product, Category, Cart } from '../shared/product.model';
import { filter } from 'rxjs/operators';

interface SlideStyle {
  transform: string;
  opacity: number;
}

interface CategoryWithProducts {
  category: Category;
  products: Product[];
}

interface Review {
  productId: string;
  rating: number;
}

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit, OnDestroy {
  popularProducts: Product[] = [];
  categories: Category[] = [];
  categoriesWithProducts: CategoryWithProducts[] = [];
  currentSlide: number = 0;
  autoSlideInterval: ReturnType<typeof setInterval> | null = null;
  isScrollingDown: boolean = true;
  isAddingToCart: boolean = false;

  constructor(private http: Https, private router: Router) {}

  ngOnInit(): void {
    this.loadPopularProducts();
    this.loadCategoriesWithProducts();
    this.updateScrollButton();

    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      if (this.router.url === '/' || this.router.url === '') {
        this.refreshRatings();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.autoSlideInterval) {
      clearInterval(this.autoSlideInterval);
    }
  }

  refreshRatings(): void {
    this.popularProducts = this.updateProductsWithRatings(this.popularProducts);
    this.categoriesWithProducts = this.categoriesWithProducts.map((catData) => ({
      category: catData.category,
      products: this.updateProductsWithRatings(catData.products),
    }));
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

  loadPopularProducts(): void {
    this.http.getCategories().subscribe((categories) => {
      let allProducts: Product[] = [];
      let categoriesLoaded = 0;
      categories.forEach((category) => {
        this.http.getProductsByCategory(category.id, 1, 100).subscribe((response) => {
          allProducts = allProducts.concat(response.products);
          categoriesLoaded++;
          if (categoriesLoaded === categories.length) {
            allProducts = this.updateProductsWithRatings(allProducts);
            this.popularProducts = allProducts.sort((a, b) => b.rating - a.rating).slice(0, 5);
            this.startAutoSlide();
          }
        });
      });
    });
  }

  loadCategoriesWithProducts(): void {
    this.http.getCategories().subscribe((categories) => {
      this.categories = categories;
      categories.forEach((category) => {
        this.http.getProductsByCategory(category.id, 1, 100).subscribe((response) => {
          const productsWithRatings = this.updateProductsWithRatings(response.products);
          const sorted = productsWithRatings.sort((a, b) => b.rating - a.rating).slice(0, 3);
          this.categoriesWithProducts.push({
            category: category,
            products: sorted,
          });
        });
      });
    });
  }

  nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.popularProducts.length;
  }

  prevSlide(): void {
    this.currentSlide =
      (this.currentSlide - 1 + this.popularProducts.length) % this.popularProducts.length;
  }

  goToSlide(index: number): void {
    this.currentSlide = index;
  }

  startAutoSlide(): void {
    this.autoSlideInterval = setInterval(() => {
      this.nextSlide();
    }, 3000);
  }

  getSlideStyle(index: number): SlideStyle {
    const offset = index - this.currentSlide;
    return {
      transform: `translateX(${offset * 100}%)`,
      opacity: offset === 0 ? 1 : 0,
    };
  }

  capitalizeFirst(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  capitalizeTitle(title: string): string {
    return title
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
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

  addToCart(event: Event, product: Product): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.isAddingToCart) {
      return;
    }
    if (!product.stock || product.stock <= 0) {
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
    this.http.addOrUpdateCart({ id: product._id, quantity: 1 }).subscribe({
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

  getCategoryRoute(categoryId: string, productId: string): string[] {
    if (categoryId === '1') return ['/laptops', 'product', productId];
    if (categoryId === '2') return ['/phones', 'product', productId];
    return ['/'];
  }

  getCategoryListRoute(categoryId: string): string[] {
    if (categoryId === '1') return ['/laptops'];
    if (categoryId === '2') return ['/phones'];
    return ['/'];
  }
}
