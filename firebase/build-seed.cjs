// Builds firebase/seed/catalogue.json — the exact same catalogue that went
// into Supabase, reshaped for Firestore. Run: node firebase/build-seed.cjs
//
// Firestore has no joins, so category/brand names are denormalised onto each
// product, and the size/stock rows become a map on the product document. That
// keeps a product page to one read and lets stock be decremented inside a
// single-document transaction.
const fs = require('fs');
const path = require('path');
const P = require('./seed/images.json');
const img = (k) => { if (!P[k]) throw new Error('missing image key ' + k); return 'https://' + P[k]; };
const main = u => u + '?auto=compress&cs=tinysrgb&w=1000';
const zoom = u => u + '?auto=compress&cs=tinysrgb&w=1000&h=1000&fit=crop';

const cats = [
  ['sports-running', 'Sports & Running', 'running-shoes:0', 1],
  ['casual-sneakers', 'Casual Sneakers', 'sneakers:1', 2],
  ['formal-shoes', 'Formal Shoes', 'formal-shoes:0', 3],
  ['loafers-moccasins', 'Loafers & Moccasins', 'loafers:0', 4],
  ['sandals-floaters', 'Sandals & Floaters', 'sandals:0', 5],
  ['slippers-chappal', 'Slippers & Chappal', 'slippers:0', 6],
  ['kids-footwear', 'Kids Footwear', 'kids-shoes:0', 7],
  ['women-heels-flats', "Women's Heels & Flats", 'high-heels:1', 8],
];
const brands = ['Campus', 'Sparx', 'Bata', 'Relaxo', 'Woodland', 'Red Chief', 'Liberty', 'Paragon', 'VKC Pride', 'Puma', 'Nike', 'Adidas', 'Metro', 'Khadims', 'Lancer', 'Action', 'Aqualite', 'Mochi'];
const bslug = n => n.toLowerCase().replace(/[^a-z0-9]+/g, '-');

const ITEMS = [
  ['casual-sneakers', 'Campus', 'Campus Rapid Red Sneakers', 'Everyday street sneaker with cushioned sole', 'men', 2199, 1299, 'Red', 'Mesh + PU', 'sneakers:0'],
  ['casual-sneakers', 'Puma', 'Puma Court Classic Black', 'Low-top skate silhouette in full black', 'unisex', 3499, 2249, 'Black', 'Suede', 'sneakers:3'],
  ['casual-sneakers', 'Nike', 'Nike Blazer Low Royal', 'Retro court sneaker in royal blue suede', 'men', 6995, 4799, 'Blue', 'Suede', 'sneakers:4'],
  ['casual-sneakers', 'Nike', 'Nike Air Force Cream', 'Chunky sole lifestyle sneaker', 'women', 7495, 5299, 'Cream', 'Leather', 'sneakers:10'],
  ['casual-sneakers', 'Adidas', 'Adidas Streetflow Multi', 'Colour-block chunky trainer', 'unisex', 4999, 3199, 'Multi', 'Knit + PU', 'sneakers:15'],
  ['casual-sneakers', 'Campus', 'Campus Olive Canvas High', 'Canvas high-top with olive finish', 'men', 1899, 1099, 'Olive', 'Canvas', 'sneakers:17'],
  ['casual-sneakers', 'Lancer', 'Lancer Colour Pop Pack', 'Bright canvas sneakers for college', 'unisex', 1599, 899, 'Assorted', 'Canvas', 'sneakers:6'],
  ['casual-sneakers', 'Sparx', 'Sparx Daily Low Top', 'Lightweight everyday sneaker', 'unisex', 1799, 999, 'Grey', 'Mesh', 'sneakers:20'],

  ['sports-running', 'Adidas', 'Adidas Alphabounce White', 'Breathable knit running shoe', 'men', 7999, 5499, 'White', 'Knit', 'running-shoes:1'],
  ['sports-running', 'Nike', 'Nike Revolution Black', 'Daily trainer with soft foam midsole', 'men', 4295, 2999, 'Black', 'Mesh', 'running-shoes:8'],
  ['sports-running', 'Sparx', 'Sparx Trail Runner', 'Grip outsole for road and trail', 'men', 2299, 1349, 'Brown', 'Mesh', 'running-shoes:9'],
  ['sports-running', 'Nike', 'Nike Invincible Orange', 'Max cushioning long-run shoe', 'unisex', 15995, 11499, 'Orange', 'ZoomX Foam', 'running-shoes:12'],
  ['sports-running', 'Campus', 'Campus Chunky Trainer', 'Retro dad-shoe silhouette', 'women', 2999, 1699, 'Grey', 'PU + Mesh', 'running-shoes:24'],
  ['sports-running', 'Puma', 'Puma Velocity Mint', 'Springy ride for tempo runs', 'women', 5499, 3599, 'Mint', 'Knit', 'running-shoes:30'],
  ['sports-running', 'Adidas', 'Adidas Duramo Violet', 'Everyday running shoe for women', 'women', 3999, 2499, 'Violet', 'Mesh', 'running-shoes:10'],
  ['sports-running', 'Nike', 'Nike Pegasus Ice', 'Responsive cushioning with reflective trim', 'men', 11295, 8499, 'Ice Blue', 'Flyknit', 'running-shoes:11'],

  ['formal-shoes', 'Red Chief', 'Red Chief Tan Oxford', 'Hand-finished leather oxford', 'men', 4499, 2999, 'Tan', 'Genuine Leather', 'formal-shoes:1'],
  ['formal-shoes', 'Mochi', 'Mochi Statement Derby', 'Two-tone derby for occasions', 'men', 3999, 2599, 'Plum', 'Leather', 'formal-shoes:2'],
  ['formal-shoes', 'Red Chief', 'Red Chief Brogue Brown', 'Classic wingtip brogue', 'men', 4999, 3399, 'Brown', 'Genuine Leather', 'formal-shoes:8'],
  ['formal-shoes', 'Metro', 'Metro Navy Lace-Up', 'Slim navy derby for office wear', 'men', 3499, 2199, 'Navy', 'Leather', 'formal-shoes:10'],
  ['formal-shoes', 'Bata', 'Bata Remo Black Derby', 'Everyday office formal with cushioned insole', 'men', 2499, 1499, 'Black', 'Synthetic Leather', 'formal-shoes:11'],
  ['formal-shoes', 'Liberty', 'Liberty Fortune Black', 'Durable formal with stitched sole', 'men', 2199, 1299, 'Black', 'Leather', 'formal-shoes:14'],
  ['formal-shoes', 'Khadims', 'Khadims Coffee Derby', 'Textured coffee-brown formal', 'men', 2799, 1699, 'Coffee', 'Leather', 'formal-shoes:17'],
  ['formal-shoes', 'Bata', 'Bata Tan Comfort Formal', 'Wide-fit tan formal shoe', 'men', 2999, 1899, 'Tan', 'Leather', 'formal-shoes:18'],
  ['formal-shoes', 'Metro', 'Metro Sleek Black Formal', 'Sharp-toe formal for suits', 'men', 4299, 2899, 'Black', 'Patent Leather', 'formal-shoes:23'],

  ['loafers-moccasins', 'Mochi', 'Mochi Midnight Loafer', 'Polished slip-on for evenings', 'men', 3999, 2499, 'Black', 'Patent Leather', 'loafers:0'],
  ['loafers-moccasins', 'Metro', 'Metro Penny Loafer Navy', 'Penny strap loafer', 'men', 3499, 2299, 'Navy', 'Leather', 'loafers:3'],
  ['loafers-moccasins', 'Khadims', 'Khadims Chunky Loafer', 'Lug-sole loafer in women fit', 'women', 3299, 2099, 'Brown', 'Leather', 'loafers:13'],
  ['loafers-moccasins', 'Woodland', 'Woodland Suede Slip-On', 'Soft suede with unlined comfort', 'men', 3799, 2699, 'Camel', 'Suede', 'loafers:18'],
  ['loafers-moccasins', 'Bata', 'Bata Everyday Moccasin', 'Two-tone moccasin, a counter favourite', 'men', 2299, 1399, 'Brown', 'Synthetic', 'loafers:20'],
  ['loafers-moccasins', 'Liberty', 'Liberty Driving Loafer White', 'Driving sole moccasin', 'men', 2799, 1799, 'White', 'Leather', 'loafers:24'],

  ['sandals-floaters', 'Woodland', 'Woodland Trekker Sandal', 'Rugged strap sandal for outdoors', 'men', 2495, 1799, 'Tan', 'Leather', 'sandals:4'],
  ['sandals-floaters', 'Paragon', 'Paragon Olive Slide', 'Cushioned everyday slide', 'women', 799, 449, 'Olive', 'EVA', 'sandals:5'],
  ['sandals-floaters', 'Aqualite', 'Aqualite Cloud Sandal', 'Ultra-light waterproof sandal', 'women', 999, 599, 'Beige', 'EVA', 'sandals:10'],
  ['sandals-floaters', 'Relaxo', 'Relaxo Flex Strap Sandal', 'Everyday flat sandal', 'women', 899, 499, 'Black', 'PU', 'sandals:11'],
  ['sandals-floaters', 'VKC Pride', 'VKC Pride Comfort Slide', 'Soft-top daily slide', 'men', 699, 399, 'Black', 'EVA', 'sandals:12'],
  ['sandals-floaters', 'Paragon', 'Paragon Sky Slide', 'Pastel slide with soft footbed', 'women', 799, 449, 'Sky Blue', 'EVA', 'sandals:26'],

  ['slippers-chappal', 'Relaxo', 'Relaxo Blush Slipper', 'Home and street slipper', 'women', 599, 349, 'Blush', 'EVA', 'slippers:9'],
  ['slippers-chappal', 'Aqualite', 'Aqualite Daisy Slide', 'Floral-strap soft slide', 'women', 699, 399, 'Pink', 'EVA', 'slippers:16'],
  ['slippers-chappal', 'Bata', 'Bata Cozy Home Slipper', 'Warm winter house slipper', 'unisex', 999, 649, 'Grey', 'Plush', 'slippers:3'],
  ['slippers-chappal', 'Khadims', 'Rajasthani Mojari Handcrafted', 'Traditional hand-embroidered jutti', 'unisex', 1899, 1199, 'Assorted', 'Leather', 'slippers:14'],
  ['slippers-chappal', 'Khadims', 'Bikaneri Jutti Classic', 'Local craft jutti with soft sole', 'women', 1599, 999, 'Ivory', 'Leather', 'slippers:12'],

  ['kids-footwear', 'Bata', 'Bata Toddler Tan Booties', 'First-walk booties with laces', 'kids', 1299, 799, 'Tan', 'Leather', 'kids-shoes:2'],
  ['kids-footwear', 'Campus', 'Campus Kids White Velcro', 'Easy-wear school sneaker', 'kids', 1299, 749, 'White', 'Synthetic', 'kids-shoes:10'],
  ['kids-footwear', 'Aqualite', 'Aqualite Kids Pink Clog', 'Waterproof play clog', 'kids', 799, 449, 'Pink', 'EVA', 'kids-shoes:11'],
  ['kids-footwear', 'Action', 'Action Cartoon Booties', 'Soft cartoon-face baby shoes', 'kids', 699, 399, 'Yellow', 'Fabric', 'kids-shoes:16'],
  ['kids-footwear', 'Khadims', 'Khadims Girls School Black', 'Bow-front black school shoe', 'kids', 1199, 699, 'Black', 'Synthetic', 'kids-shoes:17'],
  ['kids-footwear', 'Nike', 'Nike Kids High-Top Blue', 'Statement high-top for kids', 'kids', 4995, 3299, 'Blue', 'Leather', 'kids-shoes:20'],
  ['kids-footwear', 'Aqualite', 'Aqualite Kids Blue Clog', 'Everyday play clog', 'kids', 799, 449, 'Blue', 'EVA', 'kids-shoes:15'],
  ['kids-footwear', 'Bata', 'Bata Girls Mary Jane', 'Grey school mary-jane', 'kids', 1099, 649, 'Grey', 'Synthetic', 'kids-shoes:13'],

  ['women-heels-flats', 'Mochi', 'Mochi Ruby Stiletto', 'Glossy pointed-toe pump', 'women', 3499, 2199, 'Red', 'Patent', 'high-heels:8'],
  ['women-heels-flats', 'Metro', 'Metro Powder Blue Pump', 'Block heel court shoe', 'women', 2999, 1899, 'Blue', 'Suede', 'high-heels:14'],
  ['women-heels-flats', 'Khadims', 'Khadims Azure Kitten Heel', 'Everyday kitten heel', 'women', 2499, 1499, 'Azure', 'Synthetic', 'high-heels:16'],
];

const sizesFor = (cat, gender) => {
  // India uses the UK scale, so the numbers are unchanged — only the label
  // reads IND, which is how Campus, Bata, Sparx and the rest print it.
  if (gender === 'kids') return ['IND 10C', 'IND 11C', 'IND 12C', 'IND 13C', 'IND 1', 'IND 2', 'IND 3'];
  if (cat === 'women-heels-flats' || gender === 'women') return ['IND 4', 'IND 5', 'IND 6', 'IND 7', 'IND 8'];
  if (cat === 'slippers-chappal' || cat === 'sandals-floaters') return ['IND 6', 'IND 7', 'IND 8', 'IND 9', 'IND 10'];
  return ['IND 6', 'IND 7', 'IND 8', 'IND 9', 'IND 10', 'IND 11'];
};
const q = s => "'" + String(s).replace(/'/g, "''") + "'";
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

let seed = 7;
const rnd = (a, b) => { seed = (seed * 1103515245 + 12345) % 2147483648; return a + Math.floor(seed / 2147483648 * (b - a + 1)); };

// Category tiles and one product photo were swapped for better shots after the
// first seed went live; keep those so Firestore matches what customers saw.
const CATEGORY_IMAGE_OVERRIDE = {
  'sports-running': '15475641',
  'casual-sneakers': '15229823',
  'sandals-floaters': '26925248',
  'slippers-chappal': '35787272',
  'kids-footwear': '4987522',
  'women-heels-flats': '17695225',
};
const PRODUCT_IMAGE_OVERRIDE = { 'bata-toddler-tan-booties': '15668369' };
const pexels = (id) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1000`;

const out = { categories: [], brands: [], products: [], settings: {}, coupons: [] };

out.brands = brands.map((b) => ({ id: bslug(b), slug: bslug(b), name: b, isActive: true }));

out.categories = cats.map(([s, n, k, o]) => ({
  id: s,
  slug: s,
  name: n,
  imageUrl: CATEGORY_IMAGE_OVERRIDE[s] ? pexels(CATEGORY_IMAGE_OVERRIDE[s]) : main(img(k)),
  sortOrder: o,
  isActive: true,
}));

// The rnd() sequence must be consumed in the original order — rating, then
// review count, then each size's stock — so the numbers match the live data.
ITEMS.forEach((p, i) => {
  const [cat, brand, title, sub, gender, mrp, price, color, mat, key] = p;
  const sl = slug(title);
  const override = PRODUCT_IMAGE_OVERRIDE[sl];
  const u = override ? pexels(override).split('?')[0] : img(key);
  const rating = (35 + rnd(0, 14)) / 10;
  const reviewCount = rnd(8, 240);

  const variants = {};
  sizesFor(cat, gender).forEach((sz) => {
    const soldOut = (i === 5 && sz === 'IND 9') || (i === 22 && sz === 'IND 7');
    variants[sz] = soldOut ? 0 : rnd(2, 28);
  });

  out.products.push({
    id: sl,
    slug: sl,
    title,
    subtitle: sub,
    description:
      sub +
      '. Quality-checked at HR Shoe Mart, Bikaner. Genuine ' +
      brand +
      ' article with manufacturer warranty. Free delivery inside Bikaner city on orders above Rs 999, and 7-day easy exchange on unused pairs.',
    categorySlug: cat,
    categoryName: (cats.find((c) => c[0] === cat) || [])[1] ?? null,
    brandSlug: bslug(brand),
    brandName: brand,
    gender,
    mrp,
    price,
    images: [main(u), zoom(u)],
    color,
    material: mat,
    rating,
    reviewCount,
    isActive: true,
    isFeatured: i % 7 === 0,
    sortOrder: i,
    variants,
    inStock: Object.values(variants).some((n) => n > 0),
  });
});

out.settings = {
  store: {
    name: 'HR Shoe Mart',
    tagline: 'Bikaner ka bharosemand footwear store',
    phone: '+919000000000',
    whatsapp: '919000000000',
    email: 'hrshoemart.bikaner@gmail.com',
    address: 'Station Road, Bikaner, Rajasthan 334001',
    hours: 'Mon-Sun, 10:00 AM - 9:00 PM',
    map: 'https://maps.google.com/?q=Station+Road+Bikaner',
  },
  delivery: {
    fee: 49,
    free_above: 999,
    cod_extra: 0,
    eta_city: 'Same day in Bikaner city',
    eta_outside: '2-4 days across Rajasthan',
  },
  payment: { upi_id: 'hrshoemart@upi', upi_name: 'HR Shoe Mart', razorpay_enabled: false },
};

out.coupons = [
  { id: 'HRSM10', code: 'HRSM10', kind: 'percent', value: 10, minOrder: 999, maxDiscount: 500, isActive: true },
  { id: 'BIKANER200', code: 'BIKANER200', kind: 'flat', value: 200, minOrder: 1499, maxDiscount: null, isActive: true },
  { id: 'FIRST50', code: 'FIRST50', kind: 'flat', value: 50, minOrder: 499, maxDiscount: null, isActive: true },
];

const dest = path.join(__dirname, 'seed', 'catalogue.json');
fs.writeFileSync(dest, JSON.stringify(out, null, 1));

const variantCount = out.products.reduce((n, p) => n + Object.keys(p.variants).length, 0);
console.log(
  `categories ${out.categories.length} · brands ${out.brands.length} · products ${out.products.length} · ` +
    `variants ${variantCount} · coupons ${out.coupons.length} -> ${dest}`,
);
