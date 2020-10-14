import { Component, OnInit } from '@angular/core';
import { Validators, FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { Location } from "@angular/common";
import { LoadingController, MenuController } from '@ionic/angular';
import { Stripe } from '@ionic-native/stripe/ngx';
import { HttpClient } from "@angular/common/http";
import { Storage } from '@ionic/storage';

@Component({
  selector: 'app-choose-amount',
  templateUrl: './choose-amount.page.html',
  styleUrls: ['./choose-amount.page.scss'],
})
export class ChooseAmountPage implements OnInit {
  
  amount: any;
  paymentInfo: any;
  beforeAmount: any;
  segment_value = 'new';
  isPaidBefore = false;
  custom_amount: any;
  showChooseAmount = false;
  showPayment = false;
  validationsform: FormGroup;
  cardDetails: any = {};
  isLoading = false;
  creditCardNumber: string;
  stripe_key = 'pk_live_ytOmcC2s3laNLEkeykW9tZMr';

  public amount_options = [
    {
      text: 'A$ 10',
      value: 10
    },
    {
      text: 'A$ 15',
      value: 15
    },
    {
      text: 'A$ 25',
      value: 25
    },
    {
      text: 'A$ 50',
      value: 50
    },   
    {
      text: 'A$ 75',
      value: 75
    },   
    {
      text: 'A$ 100',
      value: 100
    },       
  ];
  constructor(
    private formBuilder: FormBuilder,
    private location: Location,
    private stripe: Stripe, 
    private http: HttpClient,
    private storage: Storage,
    public menuCtrl: MenuController,
    public loadingController: LoadingController

  ) { }
  async ionViewWillEnter() {
    this.getObject('paymentInfo').then(result => {
      if (result != null) {
        this.paymentInfo = JSON.parse(result);
        
        this.beforeAmount = this.paymentInfo.amount;
        this.isPaidBefore = true;
      }else
        this.isPaidBefore = false;

    }).catch(e => {
      console.log('error: ', e);
    });
    
  }
  ngOnInit() {
    this.showChooseAmount = true;
    this.showPayment = false;
    this.validationsform = this.formBuilder.group({
      card_number: new FormControl('', Validators.compose([
        Validators.required,
        Validators.minLength(19)
      ])),
      expiration_date: new FormControl('', Validators.compose([
        Validators.required
      ])),
      cvv: new FormControl('', Validators.compose([
        Validators.minLength(3),
        Validators.required
      ])),
      first_name: new FormControl('', Validators.compose([
        Validators.required
      ])),
      last_name: new FormControl('', Validators.compose([
        Validators.required
      ])),       
      email: new FormControl('', Validators.compose([
        Validators.required
      ]))         
    });
  }
  segmentChanged(ev: any) {
    console.log('Segment changed', ev.detail.value);
    this.segment_value = ev.detail.value;
  }
  next() {
    if(this.custom_amount)
     this.amount = this.custom_amount;

    if(this.amount == undefined || this.amount == 0){
      this.presentAlert("Please select amount.");
      return;
    }
    this.showChooseAmount = false;
    this.showPayment = true;

  }

  cc_format(value: string) {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length > 0) {
      this.creditCardNumber = parts.join(' ');
    } else {
      this.creditCardNumber = value;
    }
  }
  setAmount(obj){
    this.amount = obj.value;
  }

  isValidDate(dateString)
  {
      // First check for the pattern
      if(!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString))
          return false;
  
      // Parse the date parts to integers
      var parts = dateString.split("/");
      var day = parseInt(parts[1], 10);
      var month = parseInt(parts[0], 10);
      var year = parseInt(parts[2], 10);
  
      // Check the ranges of month and year
      if(year < 1000 || year > 3000 || month == 0 || month > 12)
          return false;
  
      var monthLength = [ 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ];
  
      // Adjust for leap years
      if(year % 400 == 0 || (year % 100 != 0 && year % 4 == 0))
          monthLength[1] = 29;
  
      // Check the range of the day
      return day > 0 && day <= monthLength[month - 1];
  }
  payWithOldInfo(){
    this.getObject('paymentInfo').then(result => {
      if (result != null) {
        this.paymentInfo = JSON.parse(result);
        this.amount = this.paymentInfo.amount;
        this.payWithStripe(this.paymentInfo);
      }
    }).catch(e => {
      console.log('error: ', e);
    });
  }
  payWithStripe(value) {
    this.paymentInfo = value;
    if(!this.isValidDate(value.expiration_date)){
      this.presentAlert("Invalid format expiration date.");
      return;
    }  
    this.stripe.setPublishableKey(this.stripe_key);
    var number = value.card_number.split(" ").join("");
    var expMonth = value.expiration_date.split('/')[0];
    var expYear = value.expiration_date.split('/')[2];
    var cvc = value.cvv;

    this.cardDetails = {
      number: number,
      expMonth: expMonth,
      expYear: expYear,
      cvc: cvc
    }
    this.isLoading = true;
    this.stripe.createCardToken(this.cardDetails)
      .then(token => {
        this.makePayment(token.id, value.email);
      })
      .catch(error => {
        this.isLoading = false;
        this.presentAlert(error.message);
      });
  }  
  makePayment(token, email) {
    this.http.post('https://stpetersgc.com.au/app/stripeforapp/index.php', {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          token: token,
          amount: this.amount,
          currency_code: 'USD',
          email: email
      }).subscribe(data => {
        this.presentAlert('Donated Successfully.');
        this.isLoading = false;
        this.paymentInfo.amount = this.amount;
        this.beforeAmount = this.amount;
        this.storage.set('paymentInfo', this.paymentInfo);
        this.isPaidBefore = true;
        this.clearForm();
    });
  }  

  async presentAlert(value) {
    const loading = await this.loadingController.create({
      spinner: null,
      duration: 2000,
      message: value,
      mode: 'ios'
    });
    await loading.present();
  }

  back(){
    this.location.back();
  }

  back_payment(){
    this.showChooseAmount = true;
    this.showPayment = false;
    this.amount = 0;

    this.validationsform.controls['card_number'].setValue("");
  }

  clearForm(){
    this.validationsform.controls['card_number'].setValue("");
    this.validationsform.controls['expiration_date'].setValue("");
    this.validationsform.controls['cvv'].setValue("");
    this.validationsform.controls['first_name'].setValue("");
    this.validationsform.controls['last_name'].setValue("");
    this.validationsform.controls['email'].setValue("");

  }
  async getObject(key: string): Promise<any> {
    try {
      const result = await this.storage.get(key);
      if (result != null) {
      return JSON.stringify(result);
      }
      return null;
    } catch (reason) {
      console.log(reason);
      return null;
    }
  }
  openMenu() {
    this.menuCtrl.enable(true, 'customMenu');
    this.menuCtrl.open('customMenu');
  }
}
