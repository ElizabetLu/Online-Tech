export interface Product {
  _id: string;
  title: string;
  description: string;
  price: Price;
  category: Category;
  brand: string;
  thumbnail: string;
  images: string[];
  stock: number;
  rating: number;
  warranty: number;
  issueDate: string;
}

export interface Price {
  current: number;
  currency: string;
  beforeDiscount: number;
  discountPercentage: number;
}

export interface Category {
  id: string;
  name: string;
  image: string;
}

export interface Products {
  total: number;
  limit: number;
  page: number;
  skip: number;
  products: Product[];
  sortedBy?: string;
  sortedDirection?: string;
}

export interface CartProduct {
  _id: string;
  product: Product;
  quantity: number;
}

export interface Cart {
  _id: string;
  user: string;
  products: CartProduct[];
  total: number;
}

export interface AddProductsToCart {
  id: string;
  quantity: number;
}

export interface UpdateProductCart {
  id: string;
  quantity: number;
}

export interface DeleteFromProductCart {
  productId: string;
}

export interface RateAProduct {
  productId: string;
  rate: number;
}

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  emailVerified: boolean;
  verified?: boolean;
  age: number;
  address: string;
  phone: string;
  zipcode: string;
  avatar: string;
  gender: string;
}

export interface SignUpUser {
  firstName: string;
  lastName: string;
  age: number;
  email: string;
  password: string;
  address: string;
  phone: string;
  zipcode: string;
  avatar: string;
  gender: 'MALE' | 'FEMALE';
}

export interface SignInUser {
  email: string;
  password: string;
}

export interface AuthUser {
  access_token: string;
  refresh_token: string;
  user?: User;
}

export interface QRRequest {
  text: string;
}

export interface QRWithImageRequest {
  text: string;
  imageURL: string;
}

export interface QRResponse {
  text: string;
  type: string;
  format: string;
  errorCorrectionLevel: string;
  result: string;
}
