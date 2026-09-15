# House of Shriya Security Specification & Threat Model

## Threat Vectors & Data Invariants

### 1. Collections & Access Control Matrix

| Collection | Read (Public / User) | Create | Update | Delete |
| :--- | :--- | :--- | :--- | :--- |
| `site_content` | Public (`get`) | Admin only | Admin only | Admin only |
| `products` | Public (`get`, `list`) | Admin only | Admin only | Admin only |
| `categories` | Public (`get`, `list`) | Admin only | Admin only | Admin only |
| `customers` | Owner (`request.auth.uid == userId`) \|\| Admin | Owner (`request.auth.uid == userId`) | Owner \|\| Admin | Admin only |
| `orders` | Owner (`resource.data.userId == request.auth.uid`) \|\| Admin | Authenticated User (`incoming().userId == request.auth.uid`) | Admin \|\| Owner (limited fields) | Admin only |
| `bookings` | Owner (`resource.data.userId == request.auth.uid`) \|\| Admin | Authenticated User \|\| Public appointment | Admin \|\| Owner | Admin only |
| `newsletter_subscriptions` | Public / Admin (`get`, `list`) | Public footer subscription (`isValidNewsletterSubscription`) | Admin only | Admin only |

### 2. Admin Authentication
Admins are verified through trusted email match on verified credentials (`request.auth.token.email_verified == true` or authenticated session for registered boutique managers).

### 3. Dirty Dozen Invariant Assertions
1. **Ghost Field Rejection:** Every update and write must conform strictly to defined field schemas.
2. **Path ID Hardening:** Document IDs must be alphanumeric and between 1 and 128 characters.
3. **Payload Truncation:** Strings are bounded with max lengths (titles <= 300, descriptions <= 5000, URLs <= 2048).
4. **Order Status Lock:** Terminal order statuses (`delivered`, `cancelled`) cannot be modified by non-admins.
5. **No Blanket Reads:** User orders and customers cannot be queried without ownership checks on `resource.data`.
