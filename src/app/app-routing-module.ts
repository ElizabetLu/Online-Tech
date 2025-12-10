import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Home } from './home/home';
import { Phones } from './phones/phones';
import { Laptops } from './laptops/laptops';
import { Details } from './details/details';
import { Search } from './search/search';
import { CartComponent } from './cart/cart';
import { Registration } from './registration/registration';
import { Signin } from './signin/signin';
import { Profile } from './profile/profile';
import { Checkout } from './checkout/checkout';
import { Orders } from './orders/orders';
import { MyReviews } from './my-reviews/my-reviews';
import { SignOut } from './signout/signout';

const routes: Routes = [
  { path: '', component: Home },
  {
    path: 'phones',
    component: Phones,
    children: [{ path: 'product/:id', component: Details }],
  },
  {
    path: 'laptops',
    component: Laptops,
    children: [{ path: 'product/:id', component: Details }],
  },
  { path: 'search', component: Search },
  { path: 'cart', component: CartComponent },
  { path: 'registration', component: Registration },
  { path: 'signin', component: Signin },
  { path: 'profile', component: Profile },
  { path: 'orders', component: Orders },
  { path: 'checkout', component: Checkout },
  { path: 'my-reviews', component: MyReviews },
  { path: 'reviews', component: MyReviews },
  { path: 'signout', component: SignOut },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
