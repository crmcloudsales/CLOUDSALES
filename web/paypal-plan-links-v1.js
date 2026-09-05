/* CloudSales canonical plan checkout registry.
   Subscription plans are PayPal-only. Stripe remains reserved for approved markups.
   Populate ONLY with genuine reusable PayPal Business payment/subscription links. */
window.CLOUDSALES_PAYPAL_PLAN_LINKS = Object.freeze({
  plan_basic: null,
  plan_pro: null,
  plan_premium: null
});
window.CLOUDSALES_PLAN_CHECKOUT_PROVIDER = 'paypal';
