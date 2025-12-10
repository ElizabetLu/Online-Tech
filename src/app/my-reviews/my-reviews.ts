import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { Https } from '../service/https';

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
  selector: 'app-my-reviews',
  standalone: false,
  templateUrl: './my-reviews.html',
  styleUrl: './my-reviews.scss',
})
export class MyReviews implements OnInit {
  constructor(private router: Router, private location: Location, private https: Https) {}

  reviews: Review[] = [];
  filteredReviews: Review[] = [];
  editingReview: Review | null = null;
  editReviewText: string = '';
  editRating: number = 0;
  selectedCategory: string = 'all';
  showAddReviewModal: boolean = false;
  purchasedProducts: any[] = [];
  selectedProductId: string = '';
  userName: string = '';
  userId: string = '';
  newRating: number = 0;
  newComment: string = '';
  isScrollingDown: boolean = true;

  ngOnInit(): void {
    this.checkAuth();
    this.loadUserName();
    this.loadReviews();
  }

  checkAuth(): void {
    const token = localStorage.getItem('accessToken');
    if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
      alert('Please sign in to view your reviews');
      this.router.navigate(['/signin']);
    }
  }

  loadUserName(): void {
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

  loadReviews(): void {
    const reviewsData = localStorage.getItem('reviews');
    if (reviewsData) {
      try {
        const allReviews: Review[] = JSON.parse(reviewsData);
        this.reviews = allReviews.filter((r) => r.userId === this.userId);
      } catch (e) {
        this.reviews = [];
      }
    }
    this.filterReviews();
  }

  filterReviews(): void {
    if (this.selectedCategory === 'all') {
      this.filteredReviews = [...this.reviews];
    } else {
      this.filteredReviews = this.reviews.filter(
        (r) => r.productCategory === this.selectedCategory
      );
    }
  }

  openAddReviewModal(): void {
    this.loadPurchasedProducts();
    this.showAddReviewModal = true;
    this.selectedProductId = '';
    this.newRating = 0;
    this.newComment = '';
  }

  closeAddReviewModal(): void {
    this.showAddReviewModal = false;
    this.selectedProductId = '';
    this.newRating = 0;
    this.newComment = '';
  }

  loadPurchasedProducts(): void {
    const ordersData = localStorage.getItem('orders');
    if (ordersData) {
      try {
        const orders = JSON.parse(ordersData);
        const productMap = new Map();
        orders.forEach((order: any) => {
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item: any) => {
              if (item.product && item.product._id) {
                if (!productMap.has(item.product._id)) {
                  productMap.set(item.product._id, item.product);
                }
              }
            });
          }
        });
        this.purchasedProducts = Array.from(productMap.values());
      } catch (e) {
        this.purchasedProducts = [];
      }
    }
  }

  onProductSelect(): void {}

  submitNewReview(): void {
    if (!this.selectedProductId) {
      alert('Please select a product');
      return;
    }
    if (this.newRating === 0) {
      alert('Please select a rating');
      return;
    }

    const selectedProduct = this.purchasedProducts.find((p) => p._id === this.selectedProductId);
    if (!selectedProduct) return;

    const reviewText = this.newComment.trim() || 'No comment provided';

    const newReview: Review = {
      _id: Date.now().toString(),
      productId: selectedProduct._id,
      productTitle: selectedProduct.title,
      productImage: selectedProduct.thumbnail,
      productCategory: selectedProduct.category.name,
      rating: this.newRating,
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

    this.https.rateProduct({ productId: selectedProduct._id, rate: this.newRating }).subscribe({
      next: () => {
        console.log('Review submitted to API successfully');
      },
      error: (error) => {
        console.error('Failed to submit rating to API:', error);
      },
    });

    this.loadReviews();
    alert('Review added successfully');
    this.closeAddReviewModal();
  }

  startEdit(review: Review): void {
    this.editingReview = review;
    this.editReviewText = review.review;
    this.editRating = review.rating;
  }

  saveEdit(): void {
    if (!this.editingReview) {
      alert('No review selected for editing');
      return;
    }
    if (this.editRating === 0) {
      alert('Please select a rating');
      return;
    }

    const reviewText = this.editReviewText.trim() || 'No comment provided';

    const reviewsData = localStorage.getItem('reviews');
    if (reviewsData) {
      try {
        let allReviews: Review[] = JSON.parse(reviewsData);
        const index = allReviews.findIndex((r) => r._id === this.editingReview!._id);
        if (index !== -1) {
          allReviews[index].review = reviewText;
          allReviews[index].rating = this.editRating;
          localStorage.setItem('reviews', JSON.stringify(allReviews));
          alert('Review updated successfully');
          this.loadReviews();
          this.cancelEdit();
        }
      } catch (e) {
        alert('Failed to update review');
      }
    }
  }

  cancelEdit(): void {
    this.editingReview = null;
    this.editReviewText = '';
    this.editRating = 0;
  }

  deleteReview(review: Review): void {
    if (confirm('Are you sure you want to delete this review?')) {
      const reviewsData = localStorage.getItem('reviews');
      if (reviewsData) {
        try {
          let allReviews: Review[] = JSON.parse(reviewsData);
          allReviews = allReviews.filter((r) => r._id !== review._id);
          localStorage.setItem('reviews', JSON.stringify(allReviews));
          alert('Review deleted successfully');
          this.loadReviews();
        } catch (e) {
          alert('Failed to delete review');
        }
      }
    }
  }

  deleteAllReviews(): void {
    if (confirm('Are you sure you want to delete all your reviews?')) {
      const reviewsData = localStorage.getItem('reviews');
      if (reviewsData) {
        try {
          let allReviews: Review[] = JSON.parse(reviewsData);
          allReviews = allReviews.filter((r) => r.userId !== this.userId);
          localStorage.setItem('reviews', JSON.stringify(allReviews));
          alert('All reviews deleted successfully');
          this.loadReviews();
        } catch (e) {
          alert('Failed to delete reviews');
        }
      }
    }
  }

  viewProduct(review: Review): void {
    const category = review.productCategory;
    this.router.navigate([`/${category}`, 'product', review.productId]);
  }

  back(): void {
    this.location.back();
  }

  getStarArray(rating: number): number[] {
    return Array(5)
      .fill(0)
      .map((_, i) => (i < rating ? 1 : 0));
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