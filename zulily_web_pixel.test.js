/**
 * @jest-environment jsdom
 */

// Fixes errors on jest methods
/* eslint-env jest */

// SETUP MOCKS ----------------------------
// Mock the dataLayer array on the global window object to allow GTM to load
global.window.dataLayer = [];

global.document.getElementsByTagName = jest.fn(() => [
  {
    parentNode: {
      insertBefore: jest.fn(),
    },
  },
]);

// Mocking Shopify analytics
global.analytics = {
  subscribe: jest.fn(),
};

// Mocking localStorage in the web pixel
global.browser = {
  localStorage: {
    getItem: jest.fn(),
  },
};
// SETUP MOCKS END -------------------------

// Run the main script
require("zulily_web_pixel");


const buildExpectedDLPayload = (event, overrrides) => {
  return {
    cart_total: 258.93,
    subtotal: 263.94,
    shipping_discount: 7.25,
    shipping_discount_reasons: '["Auto shipping discount"]',
    items: [
      {
        item_id: "LS-WTLWPM271F1632",
        item_variant_id: "14519112269942",
        item_product_id: "1614323155062",
        item_name:
          "2017 Louisville Slugger C271 MLB Maple Wood Bat: WTLWPM271F16",
        item_brand: "Louisville Slugger",
        item_category: undefined,
        item_variant: '32"',
        price: 99.95,
        quantity: 1,
      },
      {
        item_brand: "Easton",
        item_category: undefined,
        item_id: "EA-A121367WPL",
        item_name:
          "2016 Easton Stealth Hyperskin Fastpitch Batting Gloves: A121367",
        item_product_id: "1614320992374",
        item_variant: "White/Purple / Large",
        item_variant_id: "14519102406774",
        price: 39.99,
        quantity: 2,
      },
      {
        item_brand: "Easton",
        item_category: undefined,
        item_id: "EA-A11175933",
        item_name: "2017 Easton Z-Core XL BBCOR Baseball Bat: BB17ZX",
        item_product_id: "1614318403702",
        item_variant: '33" 30 oz',
        item_variant_id: "14519090446454",
        price: 149.99,
        quantity: 1,
      },
    ],
    ecommerce: {
      currencyCode: "USD",
    },
    ...overrrides,
  };
};

// Sample events have multiple line items, with multiple discount types
// Sample events are based on the same cart, with the same items
const beginCheckoutEvent = require("./event_samples/begin_checkout_event.json");
const beginCheckoutEventWithAmountBasedDiscount = require("./event_samples/begin_checkout_event_with_amount_based_discount.json");
const paymentInfoSubmittedEvent = require("./event_samples/payment_info_submitted_event.json");
const shippingInfoSubmittedEvent = require("./event_samples/shipping_info_submitted_event.json");

describe("__elevar_web_pixel library", () => {
  // Mock dataLayer
  let dataLayerMock;

  beforeEach(() => {
    dataLayerMock = [];
    Object.defineProperty(window, "dataLayer", {
      value: dataLayerMock,
      writable: true,
    });
    // Mock localStorage to return a valid referring event ID
    global.browser.localStorage.getItem.mockResolvedValue(
      '["284eed8a-1189-48d0-9933-740a2db544fb","e5c51d1d-0a7a-4931-9c81-1f14e528eb2c","2ae30e44-6da9-4995-aef7-1a11415cd38d"]'
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize GTM correctly when script is run", () => {
    expect(global.document.getElementsByTagName.parentNode.insertBefore).tohaveBeenCalled();
    // expect(
    //   document.querySelector(
    //     "script[src^='https://www.googletagmanager.com/gtm.js?id=']"
    //   )
    // ).not.toBeNull();
  });

  it("should retrieve the correct referring event ID", async () => {
    const eventId = await window.__elevar_web_pixel.getReferringEventId();
    expect(eventId).toBe("284eed8a-1189-48d0-9933-740a2db544fb");
  });

  it("should calculate the correct total shipping discount when discount is percentage based", async () => {
    const totalDiscount =
      await window.__elevar_web_pixel.getTotalShippingDiscount(
        beginCheckoutEvent
      );
    expect(totalDiscount).toBe(7.25);
  });

  it("should calculate the correct total shipping discount when discount is amount based", async () => {
    const totalDiscount =
      await window.__elevar_web_pixel.getTotalShippingDiscount(
        beginCheckoutEventWithAmountBasedDiscount
      );
    expect(totalDiscount).toBe(5);
  });

  it("should calculate the correct shipping discount reasons", async () => {
    const discountReasons =
      await window.__elevar_web_pixel.getShippingDiscountReasons(
        beginCheckoutEventWithAmountBasedDiscount
      );
    expect(discountReasons).toBe('["Auto shipping discount"]');
  });

  it("should handle the begin checkout event", async () => {
    await window.__elevar_web_pixel.onCheckoutStarted(beginCheckoutEvent);
    expect(dataLayerMock[0]).toStrictEqual({
      event: "dl_begin_checkout",
      referring_event_id: "284eed8a-1189-48d0-9933-740a2db544fb",
      event_id: "sh-c7c47dda-73ED-48EF-9E11-5E6651AF06AD",
      ...buildExpectedDLPayload(beginCheckoutEvent, { cart_total: 258.92 }),
    });
  });

  it("should handle the shipping info submitted event", async () => {
    await window.__elevar_web_pixel.onShippingInfoSubmitted(
      shippingInfoSubmittedEvent
    );
    expect(dataLayerMock[0]).toStrictEqual({
      event: "dl_add_shipping_info",
      referring_event_id: "284eed8a-1189-48d0-9933-740a2db544fb",
      event_id: "sh-c7c62007-7FD4-47CD-6CDC-0B1DC76A2ABD",
      ...buildExpectedDLPayload(beginCheckoutEvent),
    });
  });

  // Fires after the order is submitted
  it("should handle the payment info submitted event", async () => {
    await window.__elevar_web_pixel.onPaymentInfoSubmitted(
      paymentInfoSubmittedEvent
    );
    expect(dataLayerMock[0]).toStrictEqual({
      event: "dl_add_payment_info",
      referring_event_id: "284eed8a-1189-48d0-9933-740a2db544fb",
      event_id: "sh-c7c6eea4-4EE4-45CA-0A1A-B015EDECD7BC",
      ...buildExpectedDLPayload(beginCheckoutEvent),
    });
  });
});
