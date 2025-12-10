import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { App } from './app';
import { provideHttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Nav } from './nav/nav';
import { Home } from './home/home';
import { Details } from './details/details';
import { Search } from './search/search';
import { Phones } from './phones/phones';
import { Laptops } from './laptops/laptops';
import { CartComponent } from './cart/cart';
import { Registration } from './registration/registration';
import { Signin } from './signin/signin';
import { Profile } from './profile/profile';
import { SignOut } from './signout/signout';
import { Checkout } from './checkout/checkout';
import { Orders } from './orders/orders';
import { Footer } from './footer/footer';
import { AppRoutingModule } from './app-routing-module';
import { MyReviews } from './my-reviews/my-reviews';

@NgModule({
  declarations: [
    App,
    Nav,
    Home,
    Details,
    Search,
    Phones,
    Laptops,
    CartComponent,
    Registration,
    Signin,
    Profile,
    SignOut,
    Checkout,
    Orders,
    Footer,
    MyReviews,
  ],
  imports: [BrowserModule, AppRoutingModule, FormsModule],
  providers: [provideHttpClient()],
  bootstrap: [App],
})
export class AppModule {}
