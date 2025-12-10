import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import {
  AddProductsToCart,
  AuthUser,
  Cart,
  Category,
  DeleteFromProductCart,
  Product,
  Products,
  QRRequest,
  QRResponse,
  QRWithImageRequest,
  RateAProduct,
  SignInUser,
  SignUpUser,
  UpdateProductCart,
  User,
} from '../shared/product.model';

@Injectable({
  providedIn: 'root',
})
export class Https {
  private url: string = 'https://api.everrest.educata.dev';
  private isRefreshing: boolean = false;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    const headers: { [name: string]: string } = {
      'Content-Type': 'application/json',
    };

    if (token && token !== 'undefined' && token !== 'null' && token.trim() !== '') {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return new HttpHeaders(headers);
  }

  private handleAuthError(error: HttpErrorResponse): Observable<never> {
    if (error.status === 401 && !this.isRefreshing) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken && refreshToken !== 'undefined' && refreshToken !== 'null') {
        this.isRefreshing = true;
        return this.refreshToken(refreshToken).pipe(
          switchMap((response) => {
            this.isRefreshing = false;
            localStorage.setItem('accessToken', response.access_token);
            localStorage.setItem('refreshToken', response.refresh_token);
            return throwError(() => new Error('Token refreshed, retry request'));
          }),
          catchError((refreshError) => {
            this.isRefreshing = false;
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            return throwError(() => refreshError);
          })
        );
      }
    }
    return throwError(() => error);
  }

  getProductById(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.url}/shop/products/id/${id}`);
  }

  searchProducts(
    query?: string,
    page: number = 1,
    limit: number = 10,
    sortBy?: string,
    sortDirection?: string
  ): Observable<Products> {
    const params: Record<string, string> = {
      page: page.toString(),
      limit: limit.toString(),
      ...(query && { search: query }),
      ...(sortBy && { sortBy }),
      ...(sortDirection && { sortDirection }),
    };

    return this.http.get<Products>(`${this.url}/shop/products/search`, { params });
  }

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.url}/shop/products/categories`);
  }

  getProductsByCategory(
    categoryId: string,
    page: number = 1,
    limit: number = 10,
    sortBy?: string,
    sortDirection?: string
  ): Observable<Products> {
    const params: Record<string, string> = {
      page: page.toString(),
      limit: limit.toString(),
    };

    if (sortBy) params['sortBy'] = sortBy;
    if (sortDirection) params['sortDirection'] = sortDirection;

    return this.http.get<Products>(`${this.url}/shop/products/category/${categoryId}`, {
      params,
    });
  }

  getBrands(): Observable<string[]> {
    return this.http.get<string[]>(`${this.url}/shop/products/brands`);
  }

  getProductsByBrand(brand: string, page: number = 1, limit: number = 10): Observable<Products> {
    const params = {
      page: page.toString(),
      limit: limit.toString(),
    };

    return this.http.get<Products>(`${this.url}/shop/products/brand/${brand}`, { params });
  }

  getCart(): Observable<Cart> {
    const headers = this.getHeaders();

    return this.http.get<Cart>(`${this.url}/shop/cart`, { headers }).pipe(
      catchError((error) => {
        if (error.status === 404 || error.status === 409) {
          const emptyCart: Cart = {
            _id: '',
            user: '',
            products: [],
            total: 0,
          };
          return of(emptyCart);
        }
        return this.handleAuthError(error);
      })
    );
  }

  addOrUpdateCart(request: AddProductsToCart): Observable<Cart> {
    const headers = this.getHeaders();
    const body = {
      id: request.id,
      quantity: request.quantity,
    };

    return this.getCart().pipe(
      switchMap((cart) => {
        const existingProduct = cart.products?.find((p: any) => p.productId === request.id);

        if (existingProduct) {
          const newQuantity = existingProduct.quantity + request.quantity;
          const patchBody = {
            id: request.id,
            quantity: newQuantity,
          };
          return this.http.patch<Cart>(`${this.url}/shop/cart/product`, patchBody, { headers });
        } else {
          return this.http.post<Cart>(`${this.url}/shop/cart/product`, body, { headers }).pipe(
            catchError((postError) => {
              if (postError.status === 400 || postError.status === 409) {
                return this.http.patch<Cart>(`${this.url}/shop/cart/product`, body, { headers });
              }
              return this.handleAuthError(postError);
            })
          );
        }
      }),
      catchError((error) => {
        if (error.status === 404) {
          return this.http.post<Cart>(`${this.url}/shop/cart/product`, body, { headers }).pipe(
            catchError((postError) => {
              if (postError.status === 400 || postError.status === 409) {
                return this.http.patch<Cart>(`${this.url}/shop/cart/product`, body, { headers });
              }
              return this.handleAuthError(postError);
            })
          );
        }
        return this.handleAuthError(error);
      })
    );
  }

  updateCartProduct(request: UpdateProductCart): Observable<Cart> {
    const body = {
      id: request.id,
      quantity: request.quantity,
    };
    return this.http
      .patch<Cart>(`${this.url}/shop/cart/product`, body, {
        headers: this.getHeaders(),
      })
      .pipe(catchError((error) => this.handleAuthError(error)));
  }

  deleteFromCart(request: DeleteFromProductCart): Observable<Cart> {
    const body = {
      id: request.productId,
    };
    return this.http
      .delete<Cart>(`${this.url}/shop/cart/product`, {
        body,
        headers: this.getHeaders(),
      })
      .pipe(catchError((error) => this.handleAuthError(error)));
  }

  clearCart(): Observable<object> {
    return this.http
      .delete(`${this.url}/shop/cart`, { headers: this.getHeaders() })
      .pipe(catchError((error) => this.handleAuthError(error)));
  }

  checkout(): Observable<object> {
    return this.http
      .post(
        `${this.url}/shop/cart/checkout`,
        {},
        {
          headers: this.getHeaders(),
        }
      )
      .pipe(catchError((error) => this.handleAuthError(error)));
  }

  rateProduct(request: RateAProduct): Observable<object> {
    const body = {
      productId: request.productId,
      rate: request.rate,
    };
    return this.http
      .post(`${this.url}/shop/products/rate`, body, {
        headers: this.getHeaders(),
      })
      .pipe(catchError((error) => this.handleAuthError(error)));
  }

  signUp(request: SignUpUser): Observable<AuthUser> {
    return this.http.post<AuthUser>(`${this.url}/auth/sign_up`, request);
  }

  signIn(request: SignInUser): Observable<AuthUser> {
    return this.http.post<AuthUser>(`${this.url}/auth/sign_in`, request);
  }

  signOut(): Observable<any> {
    return this.http.post(`${this.url}/auth/sign_out`, {}, { headers: this.getHeaders() }).pipe(
      catchError((error) => {
        if (error.status === 501 || error.status === 404) {
          return of({
            message: 'Sign out not implemented on server, proceeding with local logout',
          });
        }
        return this.handleAuthError(error);
      })
    );
  }

  refreshToken(refreshToken: string): Observable<AuthUser> {
    return this.http.post<AuthUser>(`${this.url}/auth/refresh`, { refresh_token: refreshToken });
  }

  getCurrentUser(): Observable<User> {
    return this.http
      .get<User>(`${this.url}/auth`, { headers: this.getHeaders() })
      .pipe(catchError((error) => this.handleAuthError(error)));
  }

  updateUser(data: any): Observable<User> {
    return this.http
      .patch<User>(`${this.url}/auth/update`, data, {
        headers: this.getHeaders(),
      })
      .pipe(catchError((error) => this.handleAuthError(error)));
  }

  changePassword(data: { oldPassword: string; newPassword: string }): Observable<any> {
    return this.http
      .patch(`${this.url}/auth/change_password`, data, {
        headers: this.getHeaders(),
      })
      .pipe(catchError((error) => this.handleAuthError(error)));
  }

  verifyEmail(email: string): Observable<any> {
    return this.http.post(`${this.url}/auth/verify_email`, { email });
  }

  recoverPassword(email: string): Observable<any> {
    return this.http.post(`${this.url}/auth/recovery`, { email });
  }

  deleteUser(): Observable<any> {
    return this.http
      .delete(`${this.url}/auth/delete`, { headers: this.getHeaders() })
      .pipe(catchError((error) => this.handleAuthError(error)));
  }

  generateQR(request: QRRequest): Observable<QRResponse> {
    return this.http.post<QRResponse>(`${this.url}/qrcode/generate`, request);
  }

  generateQRWithImage(request: QRWithImageRequest): Observable<QRResponse> {
    return this.http.post<QRResponse>(`${this.url}/qrcode/generate_with_image`, request);
  }
}
