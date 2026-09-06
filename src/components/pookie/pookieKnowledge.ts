import { Product } from "../../types";

export interface PookieResponse {
  text: string;
  suggestedProducts?: Product[];
  quickReplies?: string[];
}

export const POOKIE_WELCOME_MESSAGE = 
  "Hi, I'm Pookie! ✨ Your personal AI styling concierge at House of Shriya.\n\n" +
  "I'm here to help you find the perfect handcrafted suit, explore fabrics & festive colours, check bespoke sizing, or pick an outfit for your next celebration. How can I style you today?";

export const POOKIE_INITIAL_QUICK_REPLIES = [
  "🌸 Recommend a wedding suit",
  "🎨 What colours are trending?",
  "💰 Suits under ₹3,000",
  "✨ Tell me about Alia Cut",
  "🌿 Pure Mulmul Cotton suits",
  "📏 Custom sizing & tailoring",
];

// Generates an intelligent, conversational response grounded in House of Shriya's actual catalog
export function generatePookieAnswer(query: string, allProducts: Product[]): PookieResponse {
  const q = query.toLowerCase().trim();

  // 1. GREETINGS
  if (
    q === "hi" ||
    q === "hello" ||
    q === "hey" ||
    q.startsWith("hi ") ||
    q.startsWith("hello ") ||
    q.startsWith("hey ") ||
    q.includes("good morning") ||
    q.includes("good evening") ||
    q.includes("who are you") ||
    q === "pookie" ||
    q === "hey pookie"
  ) {
    return {
      text:
        "Hi there! I'm Pookie ✨ your personal styling concierge at House of Shriya.\n\n" +
        "Whether you're shopping for a daytime family puja, a friend's Mehendi or Haldi, or a regal Sangeet reception, I can help you pick the right fabric, colour, and fit from our Surat atelier. What kind of occasion are you shopping for?",
      quickReplies: [
        "🌸 Wedding & Festive Suits",
        "🌿 Daily Wear & Cotton",
        "🎨 Colour Recommendations",
        "💰 Suits under ₹3,000",
      ],
    };
  }

  // 2. WEDDING / BRIDAL / FESTIVE / SANGEET / MEHENDI / HALDI OCCASIONS
  if (
    q.includes("wedding") ||
    q.includes("festive") ||
    q.includes("sangeet") ||
    q.includes("haldi") ||
    q.includes("mehendi") ||
    q.includes("reception") ||
    q.includes("party") ||
    q.includes("puja") ||
    q.includes("festival") ||
    q.includes("diwali") ||
    q.includes("eid") ||
    q.includes("navratri")
  ) {
    let occasionAdvice = "";
    let matchingCategory = "Festive Wear";

    if (q.includes("haldi")) {
      occasionAdvice =
        "For Haldi ceremonies, warm yellow, sunshine mustard, and marigold tones in lightweight Chanderi or breathable Silk blends are absolute perfection! They glow beautifully in natural morning light and allow effortless movement.";
    } else if (q.includes("mehendi")) {
      occasionAdvice =
        "For Mehendi celebrations, vibrant Sage Green, Royal Emerald, or fresh Mint with subtle gold zari or gota patti highlights look stunning. Flowy Anarkali and flared co-ord sets keep you comfortable while applying henna.";
    } else if (q.includes("sangeet") || q.includes("cocktail")) {
      occasionAdvice =
        "For Sangeet & Cocktail nights, go for dramatic evening glam! Rich Wine Burgundy, Velvet Micro 9000 Shararas, or Alia Cut Anarkalis with shimmering metallic zari drape majestically under banquet chandeliers.";
    } else {
      occasionAdvice =
        "For weddings & grand celebrations, House of Shriya specializes in royal hand-woven Chanderi silks, pure Katan weaves with gold zari booti, and opulent Velvet Shararas.";
    }

    const matched = allProducts.filter(
      (p) =>
        p.category.toLowerCase().includes("festive") ||
        p.category.toLowerCase().includes("party") ||
        p.category.toLowerCase().includes("silk") ||
        p.tags.some((t) => ["Festive Wear", "Party Wear", "Wedding"].includes(t)) ||
        p.name.toLowerCase().includes("anarkali") ||
        p.name.toLowerCase().includes("velvet") ||
        p.name.toLowerCase().includes("silk")
    );

    const topRecommendations = matched.slice(0, 3);

    return {
      text: `${occasionAdvice}\n\nHere are my handpicked boutique recommendations for you:`,
      suggestedProducts: topRecommendations,
      quickReplies: [
        "🎨 What jewelry pairs with these?",
        "📏 Can I get these custom stitched?",
        "💰 What is the price range?",
      ],
    };
  }

  // 3. SUIT DETAILS & FABRICS (Mulmul, Chanderi, Silk, Velvet, Linen, Alia Cut)
  if (
    q.includes("fabric") ||
    q.includes("material") ||
    q.includes("mulmul") ||
    q.includes("cotton") ||
    q.includes("chanderi") ||
    q.includes("silk") ||
    q.includes("velvet") ||
    q.includes("linen") ||
    q.includes("alia") ||
    q.includes("modal") ||
    q.includes("organza") ||
    q.includes("tilla") ||
    q.includes("booti") ||
    q.includes("zari")
  ) {
    if (q.includes("mulmul") || q.includes("cotton")) {
      const mulmulSuits = allProducts.filter(
        (p) =>
          p.fabricType.toLowerCase().includes("mulmul") ||
          p.fabricType.toLowerCase().includes("cotton") ||
          p.category.toLowerCase().includes("cotton")
      ).slice(0, 3);

      return {
        text:
          "🌿 **Pure Mulmul Cotton Suits**:\n" +
          "House of Shriya's Mulmul collection uses 100% featherlight organic Indian mulmul crafted with artisan Bagru wooden block prints. It is ultra-breathable, gentle on sensitive skin, and comes with lightweight Kota Doria dupattas.\n\n" +
          "Ideal for: Hot weather, office daily wear, college, and casual brunches.",
        suggestedProducts: mulmulSuits,
        quickReplies: [
          "💰 Price of Mulmul suits",
          "👗 See Chanderi Silk suits",
          "📏 Sizing details",
        ],
      };
    }

    if (q.includes("chanderi")) {
      const chanderiSuits = allProducts.filter(
        (p) =>
          p.fabricType.toLowerCase().includes("chanderi") ||
          p.name.toLowerCase().includes("chanderi")
      ).slice(0, 3);

      return {
        text:
          "✨ **Handcrafted Chanderi Silk**:\n" +
          "Woven by master weavers, our Chanderi suits blend fine cotton and pure silk yarns to create an ethereal sheer texture with subtle natural sheen. Each piece features hand-woven gold Zari Booti and delicate Gota lace edging.\n\n" +
          "Ideal for: Day festivities, family pujas, intimate celebrations, and festive dinner parties.",
        suggestedProducts: chanderiSuits,
        quickReplies: [
          "🌸 Recommend for wedding",
          "🎨 What colors are available?",
          "✨ Tell me about Alia Cut",
        ],
      };
    }

    if (q.includes("alia") || q.includes("cut")) {
      const anarkalis = allProducts.filter(
        (p) =>
          p.name.toLowerCase().includes("anarkali") ||
          p.description.toLowerCase().includes("anarkali") ||
          p.description.toLowerCase().includes("flare")
      ).slice(0, 3);

      return {
        text:
          "👗 **Alia Cut & Anarkali Silhouettes**:\n" +
          "The Alia Cut is our most requested silhouette! It features a flattering curved V-neckline with an empire waistline that gathers into a royal ghera (flare). It elongates your torso and creates an effortlessly regal hourglass drape.\n\n" +
          "Our Anarkali sets include matching straight-fit cigarette pants and heavily bordered silk dupattas.",
        suggestedProducts: anarkalis,
        quickReplies: [
          "🌸 Gul-e-Noor Emerald Anarkali details",
          "📏 Can I get it custom tailored?",
          "🎨 Best colors for Sangeet",
        ],
      };
    }

    if (q.includes("velvet")) {
      const velvetSuits = allProducts.filter(
        (p) =>
          p.fabricType.toLowerCase().includes("velvet") ||
          p.name.toLowerCase().includes("velvet") ||
          p.description.toLowerCase().includes("velvet")
      ).slice(0, 2);

      return {
        text:
          "👑 **Rooh-e-Gulab Velvet Edit**:\n" +
          "Crafted from ultra-plush Micro Velvet 9000, our velvet suits offer a buttery soft touch with a rich luminous sheen. Tailored with flared sharara pants and antique tilla threadwork, they keep you cozy and majestic for winter weddings and evening receptions.",
        suggestedProducts: velvetSuits,
        quickReplies: [
          "💰 Price of Velvet suit",
          "🌸 How to care for velvet",
          "🛍️ Add to cart",
        ],
      };
    }

    return {
      text:
        "✨ **Our Signature Fabrics at House of Shriya**:\n\n" +
        "1. **Pure Mulmul Cotton**: 100% breathable, hand block printed with natural dyes.\n" +
        "2. **Chanderi Silk**: Lightweight, sheer luster with woven gold zari booti.\n" +
        "3. **Micro Velvet 9000**: Ultra-soft royal velvet with tilla embroidery for winter luxury.\n" +
        "4. **Modal Silk & Satin**: Butter-soft drape with zero stiffness, perfect for modern co-ords.\n" +
        "5. **Pure Katan & Tilla Silk**: Traditional handloom weaves for bridal trousseaus.\n\n" +
        "Which fabric would you like to explore?",
      quickReplies: [
        "🌿 Pure Mulmul Cotton",
        "✨ Chanderi Silk",
        "👗 Alia Cut Anarkalis",
        "👑 Micro Velvet Sharara",
      ],
    };
  }

  // 4. COLOURS & PALETTE RECOMMENDATIONS
  if (
    q.includes("colour") ||
    q.includes("color") ||
    q.includes("shade") ||
    q.includes("emerald") ||
    q.includes("wine") ||
    q.includes("pink") ||
    q.includes("yellow") ||
    q.includes("sage") ||
    q.includes("mint") ||
    q.includes("peach") ||
    q.includes("lilac") ||
    q.includes("mustard") ||
    q.includes("maroon")
  ) {
    let colorSummary = "";
    let matchedColorProducts = allProducts.filter((p) => {
      const target = (p.color + " " + p.name + " " + p.description).toLowerCase();
      if (q.includes("emerald") || q.includes("green")) return target.includes("emerald") || target.includes("sage") || target.includes("mint");
      if (q.includes("wine") || q.includes("maroon") || q.includes("burgundy")) return target.includes("wine") || target.includes("rose") || target.includes("maroon");
      if (q.includes("pink")) return target.includes("pink") || target.includes("rose") || target.includes("peach");
      if (q.includes("yellow") || q.includes("mustard")) return target.includes("mustard") || target.includes("saffron");
      if (q.includes("lilac") || q.includes("purple")) return target.includes("lilac");
      return false;
    });

    if (matchedColorProducts.length === 0) {
      matchedColorProducts = allProducts.slice(0, 3);
    }

    if (q.includes("emerald") || q.includes("green")) {
      colorSummary =
        "💚 **Royal Emerald & Sage Greens**:\n" +
        "Emerald is our signature House of Shriya shade! It looks majestic against Indian skin tones and pairs brilliantly with Polki, Kundan, and pearl jewelry. Sage Green and Pastel Mint are wonderful for daytime celebrations.";
    } else if (q.includes("wine") || q.includes("burgundy") || q.includes("maroon")) {
      colorSummary =
        "🍷 **Royal Wine Burgundy & Rose**:\n" +
        "Deep wine and rich burgundy evoke timeless regal elegance. They are flattering for evening lights and look heavenly when paired with antique gold jewelry or champagne accents.";
    } else if (q.includes("yellow") || q.includes("mustard") || q.includes("saffron")) {
      colorSummary =
        "💛 **Saffron Mustard & Sunshine Gold**:\n" +
        "Auspicious and glowing! These shades are crafted for Haldi rituals and bright daytime festivities, capturing warmth and joy in every photograph.";
    } else if (q.includes("pink") || q.includes("rose") || q.includes("peach")) {
      colorSummary =
        "🌸 **Rani Pink & Pastel Rose**:\n" +
        "Rani Pink delivers joyful Bollywood festive glam, while Powder Dusty Rose and Peach bring gentle, understated elegance to work and family lunches.";
    } else {
      colorSummary =
        "🎨 **House of Shriya's Trending Palette**:\n\n" +
        "• **Daytime / Summer**: Pastel Mint, Powder Lilac, Sage Green, and Almond Cream.\n" +
        "• **Haldi & Festive Days**: Saffron Mustard, Warm Marigold, and Peach.\n" +
        "• **Evening / Sangeet / Reception**: Royal Emerald, Deep Wine Burgundy, and Rani Pink.\n\n" +
        "Tell me your skin undertone or occasion, and I'll match the most flattering hue!";
    }

    return {
      text: `${colorSummary}\n\nHere are suits featuring these rich tones:`,
      suggestedProducts: matchedColorProducts.slice(0, 3),
      quickReplies: [
        "🌸 Recommend jewelry for this",
        "💰 Check prices",
        "👗 Show more colors",
      ],
    };
  }

  // 5. PRICING, BUDGET & DISCOUNTS
  if (
    q.includes("price") ||
    q.includes("pricing") ||
    q.includes("cost") ||
    q.includes("how much") ||
    q.includes("cheap") ||
    q.includes("affordable") ||
    q.includes("budget") ||
    q.includes("discount") ||
    q.includes("offer") ||
    q.includes("sale") ||
    q.includes("under") ||
    q.includes("₹") ||
    q.includes("rupee") ||
    q.includes("expensive")
  ) {
    let budgetProducts: Product[] = [];
    let priceText = "";

    if (q.includes("2000") || q.includes("2,000") || q.includes("1500") || q.includes("1,500")) {
      budgetProducts = allProducts.filter((p) => {
        const num = parseInt(p.price.replace(/[^\d]/g, ""), 10);
        return num <= 2200;
      });
      priceText = "Here are our most popular suits under ₹2,200 (including pure mulmul and daily wear sets):";
    } else if (q.includes("3000") || q.includes("3,000")) {
      budgetProducts = allProducts.filter((p) => {
        const num = parseInt(p.price.replace(/[^\d]/g, ""), 10);
        return num <= 3000;
      });
      priceText = "Here are our premium handcrafted suits under ₹3,000:";
    } else {
      budgetProducts = allProducts.slice(0, 3);
      priceText =
        "💰 **House of Shriya Transparent Pricing Tiers**:\n\n" +
        "• **Daily Wear & Pure Mulmul**: ₹1,499 – ₹2,199\n" +
        "• **Chanderi Cotton & Co-ords**: ₹2,699 – ₹3,499\n" +
        "• **Festive Anarkalis & Silks**: ₹3,899 – ₹4,699\n\n" +
        "✨ **Special Perks**:\n" +
        "✓ Complimentary Free Shipping across India on all orders\n" +
        "✓ ₹100 instant discount with Referral Code\n" +
        "✓ Save up to 32% during our active seasonal boutique sale";
    }

    return {
      text: priceText,
      suggestedProducts: budgetProducts.slice(0, 3),
      quickReplies: [
        "🎁 How do I get ₹100 referral off?",
        "🛍️ How to order on WhatsApp?",
        "🌿 Show suits under ₹2,000",
      ],
    };
  }

  // 6. SIZING, FABRIC & UNSTITCHED SUITS
  if (
    q.includes("size") ||
    q.includes("sizing") ||
    q.includes("fit") ||
    q.includes("measurement") ||
    q.includes("tailor") ||
    q.includes("tailoring") ||
    q.includes("stitch") ||
    q.includes("unstitched") ||
    q.includes("plus size") ||
    q.includes("xxl") ||
    q.includes("3xl") ||
    q.includes("bespoke")
  ) {
    return {
      text:
        "✨ **All Suits Are Premium Unstitched Suits**:\n\n" +
        "• Every piece at House of Shriya is an **Unstitched 3-Piece Luxury Suit Set**.\n" +
        "• Each suit includes generous fabric lengths: **2.5m Kurta length**, **2.5m Bottom/Salwar length**, and **2.25m full-width artisan Dupatta**.\n" +
        "• Because all suits are unstitched, there are no sizing constraints—your local master tailor can create your exact dream fit, customized sleeves, and bespoke necklines!\n\n" +
        "Need styling advice or have questions? Click 'POOKIE NEED A HELP' to connect directly on WhatsApp!",
      quickReplies: [
        "🌸 Show Anarkali Collections",
        "🌿 Pure Mulmul Cotton suits",
        "✨ Banarasi Silk Suits",
      ],
    };
  }

  // 7. SHIPPING, DELIVERY & RETURNS
  if (
    q.includes("ship") ||
    q.includes("delivery") ||
    q.includes("track") ||
    q.includes("return") ||
    q.includes("exchange") ||
    q.includes("cod") ||
    q.includes("cash on delivery") ||
    q.includes("how long")
  ) {
    return {
      text:
        "🚚 **Shipping & Order Information**:\n\n" +
        "• **Dispatch Time**: Ready orders are dispatched within 24–48 hours from our Surat boutique atelier.\n" +
        "• **Delivery Timeframe**: 3–5 business days across metro cities in India; 5–7 days for other locations.\n" +
        "• **Shipping Fee**: Absolutely FREE delivery across all of India.\n" +
        "• **Returns & Exchanges**: 7-day hassle-free exchange policy for sizing issues or fabric defects.\n" +
        "• **Payment Methods**: UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, Net Banking, and Verified COD.",
      quickReplies: [
        "🌸 Browse Festive Collection",
        "📱 Contact WhatsApp Support",
        "💰 Check Suit Prices",
      ],
    };
  }

  // 8. STYLING SUGGESTIONS (Jewelry, Dupatta, Footwear)
  if (
    q.includes("style") ||
    q.includes("styling") ||
    q.includes("jewel") ||
    q.includes("jewelry") ||
    q.includes("jewellery") ||
    q.includes("dupatta") ||
    q.includes("shoes") ||
    q.includes("juttis") ||
    q.includes("hair") ||
    q.includes("look")
  ) {
    return {
      text:
        "✨ **Pookie's Boutique Styling Masterclass**:\n\n" +
        "1. **Anarkalis & Alia Cut Sets**: Pair with statement Chandbalis or Polki jhumkas. Skip the necklace to let the graceful V-neckline shine. Style with metallic Kolhapuris or embroidered mojris.\n" +
        "2. **Chanderi Silk Sets**: Drape the dupatta pleated over one shoulder or loose over both arms. Add fresh jasmine (gajra) to a low bun and pearl studs for effortless poise.\n" +
        "3. **Micro Velvet Shararas**: Accentuate the rich sheen with antique gold Kundan choker and a micro potli bag.\n" +
        "4. **Mulmul Cotton Sets**: Keep it effortless with silver oxidised earrings, glass bangles, and a tiny bindi for everyday grace.",
      quickReplies: [
        "🌸 Suggest an outfit for me",
        "💚 Show Emerald Anarkali",
        "🍷 Show Velvet Sharara",
      ],
    };
  }

  // 9. GENERAL PRODUCT SEARCH BASED ON USER QUERY KEYWORDS
  const queryTokens = q.split(/\s+/).filter((t) => t.length > 2);
  const matched = allProducts.filter((p) => {
    const haystack = (
      p.name +
      " " +
      p.description +
      " " +
      p.category +
      " " +
      p.fabricType +
      " " +
      p.color +
      " " +
      p.tags.join(" ")
    ).toLowerCase();

    return queryTokens.some((token) => haystack.includes(token));
  });

  if (matched.length > 0) {
    return {
      text: `I found these beautiful pieces in our collection matching your request:`,
      suggestedProducts: matched.slice(0, 3),
      quickReplies: [
        "📏 Sizing details",
        "🎨 Are other colors available?",
        "💰 Any active discounts?",
      ],
    };
  }

  // 10. DEFAULT HELPFUL FALLBACK
  return {
    text:
      "I'd love to help you find the exact piece you're envisioning! ✨\n\n" +
      "You can ask me about:\n" +
      "• **Fabrics**: Pure Mulmul Cotton, Chanderi Silk, Velvet Micro 9000, Modal Silk\n" +
      "• **Occasions**: Haldi, Mehendi, Sangeet, Wedding Reception, Office chic\n" +
      "• **Styles**: Alia Cut Anarkalis, Co-ord Sets, Unstitched dress material\n" +
      "• **Budget**: Suits under ₹2,000, ₹3,000, or bridal luxury\n\n" +
      "Or chat directly with our Master Stylist on WhatsApp for bespoke sizing!",
    suggestedProducts: allProducts.slice(0, 2),
    quickReplies: [
      "🌸 Recommend a wedding suit",
      "🌿 Pure Mulmul Cotton suits",
      "💰 Suits under ₹3,000",
      "📏 Custom sizing & tailoring",
    ],
  };
}
