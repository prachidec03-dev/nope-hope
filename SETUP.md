# Nope & Hope: setup guide

The website works as soon as it's on GitHub Pages. Until you connect Supabase (Part 2), sign-in and scam reports are saved only in each visitor's own browser.

## Part 1: Put the site on GitHub Pages

1. Sign in at github.com and click **New repository**. Name it `nopeandhope`, set it to **Public**, and click **Create repository**.
2. On the new repository page, click **uploading an existing file**.
3. Unzip the site folder on your computer. Select everything inside it (not the folder itself) and drag it into the upload area. Click **Commit changes**.
4. Go to **Settings → Pages**. Under **Build and deployment**, set Source to **Deploy from a branch**, Branch to **main**, folder to **/ (root)**. Click **Save**.
5. Wait 1–2 minutes and refresh. Your site's address appears at the top, like `https://YOUR-USERNAME.github.io/nopeandhope/`.

To change a file later: open it on GitHub, click the pencil icon, edit, and **Commit changes**. The site updates in about a minute.

## Part 1b: Connect nopeandhope.com

The site folder already includes a file called `CNAME` containing `nopeandhope.com`. Keep it in the repository.

1. In your domain provider's DNS settings, delete any existing "parking" A or CNAME records for `@` and `www`, then add:

   | Type | Name / Host | Value |
   | --- | --- | --- |
   | A | @ | 185.199.108.153 |
   | A | @ | 185.199.109.153 |
   | A | @ | 185.199.110.153 |
   | A | @ | 185.199.111.153 |
   | CNAME | www | YOUR-USERNAME.github.io |

2. On GitHub, go to **Settings → Pages → Custom domain**, type `nopeandhope.com` and click **Save**.
3. DNS can take from a few minutes to 24 hours. When GitHub shows "DNS check successful", tick **Enforce HTTPS**.
4. In Supabase, change **Authentication → URL Configuration → Site URL** to `https://nopeandhope.com`, and add it to **Redirect URLs**.

## Part 2: Turn on real sign-in, scam reports and the contact form (Supabase, free)

### 2a. Create the project
1. Go to supabase.com, sign up, and click **New project**.
2. Name it `nopeandhope`, set a strong database password (save it somewhere safe), and choose the region **Mumbai (ap-south-1)**.
3. Wait about 2 minutes for it to finish setting up.

### 2b. Create the tables
1. In the left menu, open **SQL Editor → New query**.
2. Open `supabase-setup.sql` from the site folder, copy all of it, paste it in, and click **Run**. It should say "Success".

### 2c. Set up email sign-in
1. Go to **Authentication → Sign In / Providers** and make sure **Email** is turned on.
2. Go to **Authentication → URL Configuration**:
   - **Site URL:** your GitHub Pages address from Part 1.
   - **Redirect URLs:** add the same address.
3. Go to **Authentication → Emails → Templates**. In both **Magic Link** and **Confirm signup**, replace the body with:

   ```
   <h2>Your Nope & Hope code</h2>
   <p>Enter this code to sign in: <strong>{{ .Token }}</strong></p>
   <p>It expires in 1 hour. If you didn't ask for it, ignore this email.</p>
   ```

   Save each one. This makes the email show a 6-digit code, which is what the website asks for.

### 2d. Connect the website to Supabase
1. In Supabase, go to **Project Settings → API**. Copy the **Project URL** and the **anon public** key.
2. On GitHub, open `config.js`, click the pencil icon, and fill them in:

   ```js
   window.NH_CONFIG = {
     supabaseUrl: 'https://xxxxxxxx.supabase.co',
     supabaseAnonKey: 'eyJhbGciOi...'
   };
   ```
3. Click **Commit changes**.

The anon key is meant to be public. The database rules you ran in 2b decide what visitors can do. Never put the **service_role** key in any website file.

### 2e. Test it
1. Open your site, click **Log in**, enter your email, and type in the code you receive.
2. Check a scam message, click **Report a scam sender**, and send a report. The count should show "Reported 1 time".
3. Open **My applications**, add one application, then log in on your phone and check it appears there too.
4. Send yourself a message on the Contact page. Read it in Supabase under **Table Editor → messages**.

## Before you launch publicly

- **Email limits:** Supabase's built-in email sender is only for testing and allows very few emails per hour. Before you share the site widely, connect a free email service under **Authentication → Emails → SMTP Settings** (Brevo and Resend both have free plans).
- **Free plan pausing:** free Supabase projects pause after a week with no activity. Open the site once a week until you have regular visitors.
- **Phone sign-in:** OTP by SMS in India needs DLT registration under TRAI rules. Email codes avoid this; add phone sign-in later.

## Part 3: Microsoft Clarity (heatmaps and recordings)

1. Upload the new files to GitHub (all of them **except `config.js`**, which already has your keys).
2. On GitHub, open `analytics.js`, click the pencil, and replace `PASTE_YOUR_CLARITY_ID_HERE` with your Clarity project ID (Clarity → Settings → Overview → Project ID, about 10 letters and numbers). Commit.
3. In Clarity, go to **Settings → Masking** and choose **Strict**, so recordings never show the CVs and messages people paste.
4. Open nopeandhope.com and click around. Data shows up in Clarity within about 2 hours.

Every page already loads `analytics.js`, so this one line covers the whole site.

## Part 4: ₹99 payments with Razorpay

How it works: a signed-in person clicks **Unlock full report · ₹99** → Razorpay's checkout opens (UPI, cards, net banking, wallets) → a Supabase function checks the payment is genuine and records it → the report unlocks. The same report reopens free from the same account later. The worked example stays fully open so people can see what they're paying for.

### 4a. Razorpay account
1. Sign up at razorpay.com with your PAN, bank account and address proof. For the website, give `https://nopeandhope.com`. The pricing, terms, privacy, refunds, delivery and contact pages they check are already on the site.
2. KYC approval takes a few days. You can do everything below in **Test mode** meanwhile.
3. Switch the dashboard to **Test mode** (toggle at the top), go to **Account & Settings → API Keys → Generate Key**. Copy the **Key ID** (`rzp_test_…`) and the **Key Secret**. The secret is shown only once; keep it somewhere private and never put it in any website file.

### 4b. Supabase database
SQL Editor → New query → paste all of `supabase-payments.sql` → **Run**. It should say "Success".

### 4c. Supabase functions (two of them, both in the browser)
1. Supabase → **Edge Functions → Deploy a new function → Via Editor**.
2. Name it exactly `razorpay`. Delete the sample code, paste everything from `supabase/razorpay/index.ts`, and click **Deploy**. Leave JWT verification **on** for this one.
3. Do the same again with the name `razorpay-webhook`, pasting `supabase/razorpay-webhook/index.ts`. After it deploys, open its settings and turn **off** "Verify JWT" (Razorpay can't sign in, the function checks Razorpay's signature instead).
4. Go to **Edge Functions → Secrets** and add three:
   - `RAZORPAY_KEY_ID` = your Key ID
   - `RAZORPAY_KEY_SECRET` = your Key Secret
   - `RAZORPAY_WEBHOOK_SECRET` = a long password you make up (letters and numbers, 20+ characters)

### 4d. Razorpay webhook (the safety net)
If someone pays and closes the tab straight away, this still records the payment.
1. Razorpay → **Account & Settings → Webhooks → Add New Webhook**.
2. Webhook URL: `https://rmkrcibqmunpgrgypfkh.supabase.co/functions/v1/razorpay-webhook`
3. Secret: the same made-up password as `RAZORPAY_WEBHOOK_SECRET`.
4. Active events: tick only **order.paid**. Save.

### 4e. Switch it on and test
1. On GitHub, open `config.js`, click the pencil, and add a `payments: true` line, so it looks like this (keep your real URL and key):

   ```js
   window.NH_CONFIG = {
     supabaseUrl: 'https://rmkrcibqmunpgrgypfkh.supabase.co',
     supabaseAnonKey: 'eyJ...your key...',
     siteUrl: 'nopeandhope.com',
     payments: true
   };
   ```
   Note the comma after `'nopeandhope.com'`. Commit.
2. On nopeandhope.com: log in, check your CV against a job ad, click **Unlock full report · ₹99**. In test mode, pay with UPI ID `success@razorpay` (or Razorpay's test card from their docs). The report should unlock.
3. Check Supabase → Table Editor → `purchases`: one row with `amount 9900`.
4. Until KYC is approved, set `payments: false` again so visitors don't see a test checkout.

### 4f. Go live (after KYC approval)
1. Switch Razorpay to **Live mode** → API Keys → Generate Key.
2. In Supabase → Edge Functions → Secrets, replace `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` with the live ones.
3. Add the same webhook again in **Live mode** (webhooks are separate for test and live).
4. Set `payments: true` in `config.js`. You're charging ₹99.

### Refunds
Refund from Razorpay → Transactions → Payments → open the payment → **Refund**. The refunds page promises 5–7 working days.

### Good to know
- Money reaches your bank on Razorpay's settlement cycle (usually T+2 working days), minus their fee of about 2%.
- The full report is worked out in the visitor's browser, so a very technical person could dig it out without paying. For a ₹99 product that's an acceptable trade-off; moving the report to the server would close it.
- GitHub Pages' rules say it isn't meant to host an online business. Payments happen on Razorpay, and most of the site is free tools, so the risk is low, but if GitHub ever objects, the same files move to Cloudflare Pages in about 10 minutes.
