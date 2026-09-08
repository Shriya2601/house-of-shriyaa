/**
 * Pincode Auto-Detection Utility for India
 * Automatically looks up City and State from a 6-digit Indian PIN Code.
 * Uses official India Post API with in-memory caching and offline regional fallback.
 */

export interface PincodeInfo {
  city: string;
  state: string;
  district?: string;
  pincode: string;
}

// In-memory cache for ultra-fast instant lookups
const pincodeCache = new Map<string, PincodeInfo>();

// Comprehensive offline fallback for Indian postal prefixes (first 2-3 digits)
const regionalPrefixMap: Record<string, { city: string; state: string }> = {
  // Gujarat
  "395": { city: "Surat", state: "Gujarat" },
  "394": { city: "Surat (Rural)", state: "Gujarat" },
  "396": { city: "Valsad / Vapi", state: "Gujarat" },
  "380": { city: "Ahmedabad", state: "Gujarat" },
  "382": { city: "Gandhinagar", state: "Gujarat" },
  "390": { city: "Vadodara", state: "Gujarat" },
  "360": { city: "Rajkot", state: "Gujarat" },
  "361": { city: "Jamnagar", state: "Gujarat" },
  "364": { city: "Bhavnagar", state: "Gujarat" },
  "370": { city: "Bhuj / Kutch", state: "Gujarat" },

  // Punjab & Chandigarh
  "147": { city: "Patiala", state: "Punjab" },
  "140": { city: "SAS Nagar / Mohali", state: "Punjab" },
  "141": { city: "Ludhiana", state: "Punjab" },
  "143": { city: "Amritsar", state: "Punjab" },
  "144": { city: "Jalandhar", state: "Punjab" },
  "142": { city: "Moga", state: "Punjab" },
  "145": { city: "Pathankot", state: "Punjab" },
  "146": { city: "Hoshiarpur", state: "Punjab" },
  "151": { city: "Bathinda", state: "Punjab" },
  "160": { city: "Chandigarh", state: "Chandigarh" },

  // Delhi NCR
  "110": { city: "New Delhi", state: "Delhi" },
  "201": { city: "Noida / Ghaziabad", state: "Uttar Pradesh" },
  "122": { city: "Gurugram", state: "Haryana" },
  "121": { city: "Faridabad", state: "Haryana" },

  // Haryana
  "124": { city: "Rohtak", state: "Haryana" },
  "125": { city: "Hisar", state: "Haryana" },
  "131": { city: "Sonipat", state: "Haryana" },
  "132": { city: "Panipat / Karnal", state: "Haryana" },
  "133": { city: "Ambala", state: "Haryana" },
  "134": { city: "Panchkula", state: "Haryana" },

  // Maharashtra
  "400": { city: "Mumbai", state: "Maharashtra" },
  "401": { city: "Thane", state: "Maharashtra" },
  "411": { city: "Pune", state: "Maharashtra" },
  "421": { city: "Kalyan", state: "Maharashtra" },
  "422": { city: "Nashik", state: "Maharashtra" },
  "431": { city: "Aurangabad", state: "Maharashtra" },
  "440": { city: "Nagpur", state: "Maharashtra" },

  // Rajasthan
  "302": { city: "Jaipur", state: "Rajasthan" },
  "301": { city: "Alwar", state: "Rajasthan" },
  "305": { city: "Ajmer", state: "Rajasthan" },
  "313": { city: "Udaipur", state: "Rajasthan" },
  "324": { city: "Kota", state: "Rajasthan" },
  "342": { city: "Jodhpur", state: "Rajasthan" },

  // Uttar Pradesh
  "226": { city: "Lucknow", state: "Uttar Pradesh" },
  "221": { city: "Varanasi", state: "Uttar Pradesh" },
  "282": { city: "Agra", state: "Uttar Pradesh" },
  "208": { city: "Kanpur", state: "Uttar Pradesh" },
  "211": { city: "Prayagraj", state: "Uttar Pradesh" },
  "250": { city: "Meerut", state: "Uttar Pradesh" },
  "243": { city: "Bareilly", state: "Uttar Pradesh" },

  // Karnataka
  "560": { city: "Bengaluru", state: "Karnataka" },
  "570": { city: "Mysuru", state: "Karnataka" },
  "575": { city: "Mangaluru", state: "Karnataka" },
  "580": { city: "Hubli-Dharwad", state: "Karnataka" },

  // Tamil Nadu
  "600": { city: "Chennai", state: "Tamil Nadu" },
  "641": { city: "Coimbatore", state: "Tamil Nadu" },
  "625": { city: "Madurai", state: "Tamil Nadu" },
  "620": { city: "Tiruchirappalli", state: "Tamil Nadu" },

  // Telangana & Andhra Pradesh
  "500": { city: "Hyderabad", state: "Telangana" },
  "506": { city: "Warangal", state: "Telangana" },
  "530": { city: "Visakhapatnam", state: "Andhra Pradesh" },
  "520": { city: "Vijayawada", state: "Andhra Pradesh" },

  // West Bengal
  "700": { city: "Kolkata", state: "West Bengal" },
  "711": { city: "Howrah", state: "West Bengal" },
  "734": { city: "Siliguri", state: "West Bengal" },

  // Madhya Pradesh
  "452": { city: "Indore", state: "Madhya Pradesh" },
  "462": { city: "Bhopal", state: "Madhya Pradesh" },
  "474": { city: "Gwalior", state: "Madhya Pradesh" },
  "482": { city: "Jabalpur", state: "Madhya Pradesh" },

  // Kerala
  "682": { city: "Kochi", state: "Kerala" },
  "695": { city: "Thiruvananthapuram", state: "Kerala" },
  "673": { city: "Kozhikode", state: "Kerala" },

  // Bihar & Jharkhand
  "800": { city: "Patna", state: "Bihar" },
  "834": { city: "Ranchi", state: "Jharkhand" },
  "831": { city: "Jamshedpur", state: "Jharkhand" },

  // Odisha
  "751": { city: "Bhubaneswar", state: "Odisha" },
  "753": { city: "Cuttack", state: "Odisha" },

  // Assam & North East
  "781": { city: "Guwahati", state: "Assam" },

  // Himachal Pradesh & Uttarakhand
  "171": { city: "Shimla", state: "Himachal Pradesh" },
  "248": { city: "Dehradun", state: "Uttarakhand" },

  // Goa
  "403": { city: "Panaji / North Goa", state: "Goa" },
};

/**
 * Auto-detect city and state from a 6-digit Indian PIN Code.
 */
export async function lookupPincode(pincode: string): Promise<PincodeInfo | null> {
  const clean = (pincode || "").replace(/\D/g, "").trim();
  if (clean.length !== 6) return null;

  // Check in-memory cache
  if (pincodeCache.has(clean)) {
    return pincodeCache.get(clean)!;
  }

  // 1. Try Live India Post API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5s max

    const res = await fetch(`https://api.postalpincode.in/pincode/${clean}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0]?.Status === "Success" && Array.isArray(data[0]?.PostOffice) && data[0].PostOffice.length > 0) {
        const po = data[0].PostOffice[0];
        const result: PincodeInfo = {
          city: po.District || po.Block || po.Division || po.Name || "",
          state: po.State || "",
          district: po.District || "",
          pincode: clean,
        };
        if (result.city && result.state) {
          pincodeCache.set(clean, result);
          return result;
        }
      }
    }
  } catch (err) {
    // Non-blocking, proceed to offline fallback
  }

  // 2. Offline fallback from regional postal prefixes
  const prefix3 = clean.substring(0, 3);
  const fallback = regionalPrefixMap[prefix3];
  if (fallback) {
    const result: PincodeInfo = {
      city: fallback.city,
      state: fallback.state,
      pincode: clean,
    };
    pincodeCache.set(clean, result);
    return result;
  }

  // Prefix 2 digit general state mapping fallback
  const prefix2 = clean.substring(0, 2);
  const stateByZone: Record<string, string> = {
    "11": "Delhi",
    "12": "Haryana",
    "13": "Haryana",
    "14": "Punjab",
    "15": "Punjab",
    "16": "Punjab & Chandigarh",
    "17": "Himachal Pradesh",
    "18": "Jammu & Kashmir",
    "19": "Jammu & Kashmir",
    "20": "Uttar Pradesh",
    "21": "Uttar Pradesh",
    "22": "Uttar Pradesh",
    "23": "Uttar Pradesh",
    "24": "Uttarakhand / UP",
    "25": "Uttar Pradesh",
    "26": "Uttar Pradesh",
    "27": "Uttar Pradesh",
    "28": "Uttar Pradesh",
    "30": "Rajasthan",
    "31": "Rajasthan",
    "32": "Rajasthan",
    "33": "Rajasthan",
    "34": "Rajasthan",
    "36": "Gujarat",
    "37": "Gujarat",
    "38": "Gujarat",
    "39": "Gujarat",
    "40": "Maharashtra / Goa",
    "41": "Maharashtra",
    "42": "Maharashtra",
    "43": "Maharashtra",
    "44": "Maharashtra",
    "45": "Madhya Pradesh",
    "46": "Madhya Pradesh",
    "47": "Madhya Pradesh",
    "48": "Madhya Pradesh",
    "49": "Chhattisgarh",
    "50": "Telangana",
    "51": "Andhra Pradesh",
    "52": "Andhra Pradesh",
    "53": "Andhra Pradesh",
    "56": "Karnataka",
    "57": "Karnataka",
    "58": "Karnataka",
    "59": "Karnataka",
    "60": "Tamil Nadu",
    "61": "Tamil Nadu",
    "62": "Tamil Nadu",
    "63": "Tamil Nadu",
    "64": "Tamil Nadu",
    "67": "Kerala",
    "68": "Kerala",
    "69": "Kerala",
    "70": "West Bengal",
    "71": "West Bengal",
    "72": "West Bengal",
    "73": "West Bengal",
    "74": "West Bengal",
    "75": "Odisha",
    "76": "Odisha",
    "77": "Odisha",
    "78": "Assam",
    "80": "Bihar",
    "81": "Bihar",
    "82": "Jharkhand",
    "83": "Jharkhand",
    "84": "Bihar",
    "85": "Bihar",
  };

  if (stateByZone[prefix2]) {
    const result: PincodeInfo = {
      city: "",
      state: stateByZone[prefix2],
      pincode: clean,
    };
    return result;
  }

  return null;
}
