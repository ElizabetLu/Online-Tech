import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Location } from '@angular/common';
import { Https } from '../service/https';
import { Product, Cart } from '../shared/product.model';

interface StarClass {
  filled: boolean;
  empty: boolean;
}

interface Review {
  _id: string;
  productId: string;
  productTitle: string;
  productImage: string;
  productCategory: string;
  rating: number;
  review: string;
  userName: string;
  userId: string;
  createdAt: string;
}

@Component({
  selector: 'app-details',
  standalone: false,
  templateUrl: './details.html',
  styleUrl: './details.scss',
})
export class Details implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private https: Https,
    private location: Location,
    private router: Router
  ) {}

  product!: Product;
  selectedTab: string = 'details';
  selectedImage: string = '';
  showRatingModal: boolean = false;
  showQRModal: boolean = false;
  showQROptionsModal: boolean = false;
  rating: number = 0;
  userName: string = '';
  userId: string = '';
  comment: string = '';
  hoveredStar: number = 0;
  qrCodeImage: string = '';
  isAddingToCart: boolean = false;
  productReviews: Review[] = [];

  ngOnInit(): void {
    this.loadUserData();
    this.route.params.subscribe((params: Params) => {
      const productId = params['id'];
      this.loadProduct(productId);
      this.loadProductReviews(productId);
    });
  }

  loadUserData(): void {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        this.userName = `${user.firstName} ${user.lastName}`;
        this.userId = user._id;
      } catch (e) {
        this.userName = '';
        this.userId = '';
      }
    }
  }

  loadProduct(id: string): void {
    this.https.getProductById(id).subscribe({
      next: (product) => {
        this.product = product;
        this.selectedImage = product.thumbnail;
        this.updateProductRating();
      },
      error: () => {
        alert('Failed to load product');
      },
    });
  }

  loadProductReviews(productId: string): void {
    const reviewsData = localStorage.getItem('reviews');
    if (reviewsData) {
      try {
        const allReviews: Review[] = JSON.parse(reviewsData);
        this.productReviews = allReviews.filter((r) => r.productId === productId);
        this.updateProductRating();
      } catch (e) {
        this.productReviews = [];
      }
    } else {
      this.productReviews = [];
    }
  }

  calculateCombinedRating(): number {
    if (!this.product) return 0;
    const apiRating = this.product.rating || 0;
    const localReviews = this.productReviews || [];
    if (localReviews.length === 0) {
      return apiRating;
    }
    const sumOfLocalRatings = localReviews.reduce((sum, review) => sum + review.rating, 0);
    const totalRating = apiRating + sumOfLocalRatings;
    const totalCount = 1 + localReviews.length;
    return totalRating / totalCount;
  }

  updateProductRating(): void {
    if (this.product && this.productReviews) {
      this.product.rating = this.calculateCombinedRating();
    }
  }

  isMyReview(review: Review): boolean {
    return review.userId === this.userId;
  }

  editReview(review: Review): void {
    this.router.navigate(['/reviews']);
  }

  deleteReview(review: Review): void {
    if (confirm('Are you sure you want to delete this review?')) {
      const reviewsData = localStorage.getItem('reviews');
      if (reviewsData) {
        try {
          let allReviews: Review[] = JSON.parse(reviewsData);
          allReviews = allReviews.filter((r) => r._id !== review._id);
          localStorage.setItem('reviews', JSON.stringify(allReviews));
          this.loadProductReviews(this.product._id);
          alert('Review deleted successfully');
          this.updateProductRating();
        } catch (e) {
          alert('Failed to delete review');
        }
      }
    }
  }

  get isOutOfStock(): boolean {
    if (!this.product) {
      return true;
    }
    const stockValue = Number(this.product.stock);
    return isNaN(stockValue) || stockValue <= 0;
  }

  selectTab(tab: string): void {
    this.selectedTab = tab;
  }

  selectImage(image: string): void {
    this.selectedImage = image;
  }

  openRatingModal(): void {
    const token = localStorage.getItem('accessToken');
    if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
      alert('Please login to rate products');
      this.router.navigate(['/signin']);
      return;
    }

    if (!this.hasPurchasedProduct()) {
      alert('You can only review products you have purchased');
      return;
    }

    this.showRatingModal = true;
    this.rating = 0;
    this.comment = '';
    this.hoveredStar = 0;
  }

  hasPurchasedProduct(): boolean {
    const ordersData = localStorage.getItem('orders');
    if (!ordersData) return false;
    try {
      const orders = JSON.parse(ordersData);
      return orders.some(
        (order: any) =>
          order.items &&
          order.items.some((item: any) => item.product && item.product._id === this.product._id)
      );
    } catch (e) {
      return false;
    }
  }

  closeRatingModal(): void {
    this.showRatingModal = false;
    this.rating = 0;
    this.comment = '';
    this.hoveredStar = 0;
  }

  setRating(star: number): void {
    this.rating = star;
  }

  setHoveredStar(star: number): void {
    this.hoveredStar = star;
  }

  submitRating(): void {
    if (this.rating === 0) {
      alert('Please select a rating');
      return;
    }

    const reviewText = this.comment.trim() || 'No comment provided';

    const newReview: Review = {
      _id: Date.now().toString(),
      productId: this.product._id,
      productTitle: this.product.title,
      productImage: this.product.thumbnail,
      productCategory: this.product.category.name,
      rating: this.rating,
      review: reviewText,
      userName: this.userName,
      userId: this.userId,
      createdAt: new Date().toISOString(),
    };

    const reviewsData = localStorage.getItem('reviews');
    let allReviews: Review[] = [];
    if (reviewsData) {
      try {
        allReviews = JSON.parse(reviewsData);
      } catch (e) {
        allReviews = [];
      }
    }
    allReviews.push(newReview);
    localStorage.setItem('reviews', JSON.stringify(allReviews));

    this.https.rateProduct({ productId: this.product._id, rate: this.rating }).subscribe({
      next: () => {
        alert('Review submitted successfully');
        this.closeRatingModal();
        this.loadProductReviews(this.product._id);
        this.updateProductRating();
      },
      error: (error) => {
        const errorMsg = error.error?.error || 'Failed to submit rating to API';
        console.error(errorMsg);
        alert('Review submitted successfully');
        this.closeRatingModal();
        this.loadProductReviews(this.product._id);
        this.updateProductRating();
      },
    });
  }

  openQRModal(): void {
    this.showQROptionsModal = true;
  }

  closeQROptionsModal(): void {
    this.showQROptionsModal = false;
  }

  generateSimpleQR(): void {
    this.closeQROptionsModal();
    const productUrl = window.location.href;
    this.https.generateQR({ text: productUrl }).subscribe({
      next: (response) => {
        this.qrCodeImage = response.result;
        this.showQRModal = true;
      },
      error: () => {
        alert('Failed to generate QR code');
      },
    });
  }

  generateQRWithImage(): void {
    this.closeQROptionsModal();
    const productUrl = window.location.href;
    const imageUrl = this.product.thumbnail;
    this.https.generateQRWithImage({ text: productUrl, imageURL: imageUrl }).subscribe({
      next: (response) => {
        this.qrCodeImage = response.result;
        this.showQRModal = true;
      },
      error: (error) => {
        const errorMsg = error.error?.error || 'Failed to generate QR code with image';
        alert(errorMsg);
      },
    });
  }

  closeQRModal(): void {
    this.showQRModal = false;
    this.qrCodeImage = '';
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

  addToCart(): void {
    if (this.isAddingToCart) {
      return;
    }
    if (this.isOutOfStock) {
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
    this.https.addOrUpdateCart({ id: this.product._id, quantity: 1 }).subscribe({
      next: (cart) => {
        this.syncCartState(cart);
        alert('Product added to cart');
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

  back(): void {
    this.location.back();
  }

  getStarClass(star: number): StarClass {
    const currentStar = this.hoveredStar || this.rating;
    return {
      filled: star <= currentStar,
      empty: star > currentStar,
    };
  }

  getStarArray(rating: number): number[] {
    return Array(5)
      .fill(0)
      .map((_, i) => (i < rating ? 1 : 0));
  }

  capitalizeFirst(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  capitalizeTitle(title: string): string {
    return title
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}
